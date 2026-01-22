const cron = require('node-cron');
const moment = require('moment');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Yacht = require('../models/Yacht');
const Review = require('../models/Review');
const Recommendation = require('../models/Recommendation');
const { createNotification } = require("../controllers/notificationController");
const sendEmail = require("../helpers/sendmail");
const aiAnalysisService = require('../services/aiAnalysisService');

const updateBookingStatuses = async () => {
    try {
        const now = moment().utc();
        const today = now.startOf('day').format();
        const tomorrow = now.add(1, 'days').startOf('day').format();
        const threeDaysAgo = now.subtract(3, 'days').format();

        const remindersForPayment = await Booking.find({
            status: "accepted",
            createdAt: { $lte: threeDaysAgo },
            reminderSent: false
        }).populate('yacht').populate('client');

        for (let booking of remindersForPayment) {
            await Booking.findByIdAndUpdate(booking._id, { reminderSent: true });

            await createNotification({
                user: booking.client._id,
                userCreate: booking.yacht.owner._id,
                type: 'payment_reminder',
                message: `Votre réservation pour "${booking.yacht.name}" attend votre paiement depuis 72h.`,
                url: `/dashboard/client/bookings`,
            });

            await sendEmail({
                email: booking.client.email,
                subject: `Rappel : Paiement en attente`,
                template: "booking-reminder-payment",
                name: booking.client.name,
                yachtName: booking.yacht.name
            });
        }
        console.log(` Payment reminders sent: ${remindersForPayment.length}`);

        const remindersForOwners = await Booking.find({
            status: "pending",
            createdAt: { $lte: threeDaysAgo },
            reminderSent: false
        }).populate('yacht').populate('client');

        for (let booking of remindersForOwners) {
            await Booking.findByIdAndUpdate(booking._id, { reminderSent: true });

            await createNotification({
                user: booking.yacht.owner._id,
                userCreate: booking.client._id,
                type: 'owner_reminder',
                message: `Nouvelle réservation pour "${booking.yacht.name}" en attente depuis 72h.`,
                url: `/dashboard/owner/bookings`,
            });

            await sendEmail({
                email: booking.yacht.owner.email,
                subject: `Rappel : Nouvelle réservation en attente`,
                template: "booking-reminder-owner",
                name: booking.yacht.owner.name,
                yachtName: booking.yacht.name
            });
        }
        console.log(` Owner reminders sent: ${remindersForOwners.length}`);

        const outdatedBookings = await Booking.find({
            $or: [
                { status: "payed", startDate: { $lte: today } },
                { status: "ongoing", endDate: { $lte: today } },
            ]
        }).populate('yacht').populate('client');

        for (let booking of outdatedBookings) {
            let newStatus = booking.status;

            if (booking.status === "payed" && moment(booking.startDate).isSameOrBefore(today)) {
                newStatus = "ongoing";
            } else if (booking.status === "ongoing" && moment(booking.endDate).isSameOrBefore(today)) {
                newStatus = "done";
            }

            if (newStatus !== booking.status) {
                await Booking.findByIdAndUpdate(booking._id, { status: newStatus });

                await createNotification({
                    user: booking.client._id,
                    userCreate: booking.yacht.owner._id,
                    type: 'booking_status_update',
                    message: `Votre réservation pour "${booking.yacht.name}" est maintenant "${newStatus}".`,
                    url: `/dashboard/client/bookings`,
                });

                await sendEmail({
                    email: booking.client.email,
                    subject: `Mise à jour de votre réservation`,
                    template: "booking-status-cron",
                    name: booking.client.name,
                    yachtName: booking.yacht.name,
                    status: newStatus
                });
            }
        }
        console.log(`Status updates done: ${outdatedBookings.length}`);

    } catch (error) {
        console.error('Erreur lors de la mise à jour des statuts des réservations:', error);
    }
};

const generateAutomaticRecommendations = async () => {
    try {
        console.log('🤖 Starting automatic AI recommendations generation...');

        const clients = await User.find({ 
            role: 'client',
            isBlockedByAdmin: false,
            isValidatedByAdmin: true
        }).select('_id name email');

        if (clients.length === 0) {
            console.log('⚠️ No active clients found');
            return;
        }

        console.log(`📊 Found ${clients.length} active clients`);

        let totalGenerated = 0;
        let totalNotified = 0;

        for (const client of clients) {
            try {
                const recentRecommendations = await Recommendation.find({
                    user: client._id,
                    createdAt: { $gte: moment().subtract(9, 'hours').toDate() }
                });

                if (recentRecommendations.length > 0) {
                    console.log(`⏭️ Skipping ${client.name} - already has recent recommendations`);
                    continue;
                }

                await Recommendation.deleteMany({
                    user: client._id,
                    status: 'pending',
                    createdAt: { $lt: moment().subtract(24, 'hours').toDate() }
                });

                const yachts = await Yacht.find({ 
                    isValidatedByAdmin: true,
                    isPublic: true 
                }).lean();

                if (yachts.length === 0) {
                    console.log('⚠️ No yachts available');
                    continue;
                }

                const yachtsWithScores = await Promise.all(
                    yachts.map(async (yacht) => {
                        const reviews = await Review.find({ yacht: yacht._id })
                            .populate('client', 'name image')
                            .sort({ createdAt: -1 })
                            .limit(10)
                            .lean();

                        const doneBookingsCount = await Booking.countDocuments({
                            yacht: yacht._id,
                            status: 'done'
                        });

                        let score = 50;

                        if (reviews.length > 0) {
                            const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
                            score += (avgRating / 5) * 30;
                            score += Math.min(reviews.length, 10) * 0.5;
                        } else {
                            score += (doneBookingsCount * 2);
                        }

                        if (yacht.pricePerDay < 500) score += 10;
                        else if (yacht.pricePerDay < 1000) score += 7;
                        else if (yacht.pricePerDay < 2000) score += 5;

                        if (yacht.capacity >= 8) score += 5;
                        else if (yacht.capacity >= 6) score += 3;

                        if (yacht.amenities?.length > 7) score += 5;
                        else if (yacht.amenities?.length > 5) score += 3;

                        return {
                            yacht,
                            reviews,
                            score: Math.min(100, Math.round(score)),
                            doneBookingsCount
                        };
                    })
                );

                const topYachts = yachtsWithScores
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 3);

                const recommendations = [];

                for (const { yacht, reviews, score, doneBookingsCount } of topYachts) {
                    const analysis = await aiAnalysisService.analyzeYachtReviews(yacht, reviews);

                    let reasons = [...analysis.recommendationReasons];

                    if (reviews.length === 0 && doneBookingsCount > 0) {
                        reasons.unshift(`Yacht populaire avec ${doneBookingsCount} réservations complétées`);
                    }

                    const recommendation = await Recommendation.create({
                        user: client._id,
                        yacht: yacht._id,
                        score,
                        reasons: reasons.slice(0, 4),
                        aiAnalysis: {
                            sentimentScore: analysis.sentimentScore,
                            keyPositives: analysis.keyPositives,
                            keyNegatives: analysis.keyNegatives,
                            summary: analysis.summary,
                            topReviews: analysis.topReviews || []
                        },
                        basedOnReviews: reviews.map(r => r._id),
                        status: 'sent',
                        notificationSent: true,
                        emailSent: false
                    });

                    recommendations.push(recommendation);
                }

                if (recommendations.length > 0) {
                    await createNotification({
                        user: client._id,
                        userCreate: client._id,
                        type: 'ai_recommendation',
                        message: `🤖 Nouvelles recommandations IA : ${recommendations.length} yachts sélectionnés spécialement pour vous !`,
                        url: `/dashboard/client/ai-recommendations`,
                    });

                    totalGenerated += recommendations.length;
                    totalNotified++;

                    console.log(`✅ ${recommendations.length} recommendations generated for ${client.name}`);
                }

            } catch (clientError) {
                console.error(`❌ Error for client ${client.name}:`, clientError.message);
            }
        }

        console.log(`🎉 Automatic recommendations complete:`);
        console.log(`   - ${totalGenerated} recommendations generated`);
        console.log(`   - ${totalNotified} clients notified`);

    } catch (error) {
        console.error('❌ Error in automatic recommendations:', error);
    }
};

const initScheduledJobs = () => {
    console.log("⏰ Starting cron jobs...");

    cron.schedule("*/1 * * * *", async () => {
        console.log("📋 Running scheduled booking status updates...");
        await updateBookingStatuses();
    });
    console.log("✅ Booking status cron scheduled (Runs every 1 minute).");

    cron.schedule("0 */9 * * *", async () => {
        console.log("🤖 Running automatic AI recommendations (every 9 hours)...");
        await generateAutomaticRecommendations();
    });
    console.log("✅ AI Recommendations cron scheduled (Runs every 9 hours).");
};

module.exports = {
    initScheduledJobs,
    generateAutomaticRecommendations
};
