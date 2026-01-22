const Recommendation = require('../models/Recommendation');
const Yacht = require('../models/Yacht');
const Review = require('../models/Review');
const aiAnalysisService = require('../services/aiAnalysisService');

/**
 * Générer et envoyer des recommandations
 */
exports.generateRecommendations = async (req, res) => {
    try {
        console.log('Generating Recommendations', req.user);
        const userId = req.user._id;
        const { limit = 3, sendNotification = true, sendEmail = true } = req.body;

        await Recommendation.deleteMany({
            user: userId,
            status: 'pending'
        });
        console.log('✅ Anciennes recommandations pending supprimées');

        const yachts = await Yacht.find({ isValidatedByAdmin: true, isPublic: true })
            .limit(20)
            .lean();

        if (yachts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Aucun yacht disponible'
            });
        }

        const recommendations = [];

        for (const yacht of yachts.slice(0, limit)) {
            const reviews = await Review.find({ yacht: yacht._id })
                .populate('client', 'name image')
                .sort({ createdAt: -1 })
                .limit(10)
                .lean();

            const analysis = await aiAnalysisService.analyzeYachtReviews(yacht, reviews);
            const score = aiAnalysisService.calculateRecommendationScore(yacht, reviews);

            const recommendation = await Recommendation.create({
                user: userId,
                yacht: yacht._id,
                score,
                reasons: analysis.recommendationReasons,
                aiAnalysis: {
                    sentimentScore: analysis.sentimentScore,
                    keyPositives: analysis.keyPositives,
                    keyNegatives: analysis.keyNegatives,
                    summary: analysis.summary,
                    topReviews: analysis.topReviews
                },
                basedOnReviews: reviews.map(r => r._id),
                status: 'sent',
                notificationSent: sendNotification,
                emailSent: sendEmail
            });

            recommendations.push(recommendation);
        }

        res.json({
            success: true,
            message: `${recommendations.length} recommandations générées avec IA`,
            data: recommendations
        });
    } catch (error) {
        console.error('Erreur génération recommandations:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la génération des recommandations'
        });
    }
};

/**
 * Récupérer mes recommandations
 */
exports.getMyRecommendations = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, limit = 10, page = 1 } = req.query;

        const query = { user: userId };
        if (status) {
            query.status = status;
        }

        const total = await Recommendation.countDocuments(query);
        const recommendations = await Recommendation.find(query)
            .populate('yacht')
            .populate({
                path: 'basedOnReviews',
                populate: {
                    path: 'client',
                    select: 'name image'
                }
            })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        res.json({
            success: true,
            data: recommendations,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Erreur récupération recommandations:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des recommandations'
        });
    }
};

/**
 * Marquer comme vue
 */
exports.markAsViewed = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const recommendation = await Recommendation.findOneAndUpdate(
            { _id: id, user: userId },
            {
                status: 'viewed',
                viewedAt: new Date()
            },
            { new: true }
        );

        if (!recommendation) {
            return res.status(404).json({
                success: false,
                message: 'Recommandation non trouvée'
            });
        }

        res.json({
            success: true,
            data: recommendation
        });
    } catch (error) {
        console.error('Erreur marquage vue:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du marquage'
        });
    }
};

/**
 * Rejeter une recommandation
 */
exports.dismissRecommendation = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const recommendation = await Recommendation.findOneAndUpdate(
            { _id: id, user: userId },
            {
                status: 'dismissed',
                dismissedAt: new Date()
            },
            { new: true }
        );

        if (!recommendation) {
            return res.status(404).json({
                success: false,
                message: 'Recommandation non trouvée'
            });
        }

        res.json({
            success: true,
            message: 'Recommandation rejetée',
            data: recommendation
        });
    } catch (error) {
        console.error('Erreur rejet:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du rejet'
        });
    }
};

/**
 * Analyser un yacht spécifique
 */
exports.analyzeYacht = async (req, res) => {
    try {
        const { yachtId } = req.params;

        const yacht = await Yacht.findById(yachtId);
        if (!yacht) {
            return res.status(404).json({
                success: false,
                message: 'Yacht non trouvé'
            });
        }

        const reviews = await Review.find({ yacht: yachtId })
            .populate('client', 'name image')
            .sort({ createdAt: -1 })
            .limit(10);
        
        const analysis = await aiAnalysisService.analyzeYachtReviews(yacht, reviews);

        res.json({
            success: true,
            data: analysis
        });
    } catch (error) {
        console.error('Erreur analyse yacht:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'analyse'
        });
    }
};
