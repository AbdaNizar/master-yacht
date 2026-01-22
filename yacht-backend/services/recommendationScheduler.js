const cron = require('node-cron');
const User = require('../models/User');
const aiRecommendationService = require('../services/aiRecommendationService');
const notificationService = require('../services/notificationService');
const Recommendation = require('../models/Recommendation');
const Yacht = require('../models/Yacht');

class RecommendationScheduler {
    /**
     * Démarrer le scheduler
     */
    start() {
        // Exécuter chaque lundi à 9h00
        cron.schedule('0 9 * * 1', async () => {
            console.log('🤖 Début de la génération automatique des recommandations...');
            await this.generateWeeklyRecommendations();
        });

        // Alternative: Exécuter tous les jours à 10h00
        // cron.schedule('0 10 * * *', async () => {
        //     console.log('🤖 Génération quotidienne des recommandations...');
        //     await this.generateDailyRecommendations();
        // });

        console.log('✅ Scheduler de recommandations IA démarré');
    }

    /**
     * Générer des recommandations hebdomadaires pour tous les clients actifs
     */
    async generateWeeklyRecommendations() {
        try {
            // Récupérer tous les clients actifs
            const clients = await User.find({
                role: 'client',
                isBlockedByAdmin: false,
                isValidatedByAdmin: true
            });

            console.log(`📊 ${clients.length} clients à traiter`);

            let successCount = 0;
            let errorCount = 0;

            for (const client of clients) {
                try {
                    // Vérifier s'il y a déjà des recommandations récentes (< 7 jours)
                    const recentRecommendations = await Recommendation.find({
                        user: client._id,
                        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                    });

                    if (recentRecommendations.length >= 3) {
                        console.log(`⏭️  Client ${client.name} a déjà des recommandations récentes`);
                        continue;
                    }

                    // Générer 3 recommandations
                    const recommendations = await aiRecommendationService.generateRecommendations(client._id, 3);

                    if (recommendations.length === 0) {
                        console.log(`⚠️  Aucune recommandation disponible pour ${client.name}`);
                        continue;
                    }

                    // Sauvegarder et notifier
                    for (const rec of recommendations) {
                        const yacht = await Yacht.findById(rec.yacht);

                        const recommendation = await Recommendation.create({
                            user: client._id,
                            yacht: rec.yacht,
                            score: rec.score,
                            reasons: rec.reasons,
                            aiAnalysis: rec.aiAnalysis,
                            basedOnReviews: rec.basedOnReviews,
                            status: 'pending'
                        });

                        // Générer message personnalisé
                        const personalizedMessage = await aiRecommendationService.generatePersonalizedSummary(
                            yacht.name,
                            rec.aiAnalysis,
                            client.name
                        );

                        // Envoyer notifications
                        const notificationResult = await notificationService.notifyRecommendation(
                            client._id,
                            rec,
                            yacht,
                            personalizedMessage
                        );

                        recommendation.notificationSent = notificationResult.notificationSent;
                        recommendation.emailSent = notificationResult.emailSent;
                        await recommendation.save();
                    }

                    successCount++;
                    console.log(`✅ ${recommendations.length} recommandations générées pour ${client.name}`);

                } catch (error) {
                    errorCount++;
                    console.error(`❌ Erreur pour ${client.name}:`, error.message);
                }

                // Pause de 2 secondes entre chaque client pour éviter la surcharge
                await this.sleep(2000);
            }

            console.log(`\n📈 Résumé:`);
            console.log(`   ✅ Succès: ${successCount} clients`);
            console.log(`   ❌ Erreurs: ${errorCount} clients`);
            console.log(`   📊 Total: ${clients.length} clients traités\n`);

        } catch (error) {
            console.error('❌ Erreur génération hebdomadaire:', error);
        }
    }

    /**
     * Générer des recommandations quotidiennes (version légère)
     */
    async generateDailyRecommendations() {
        try {
            // Récupérer uniquement les clients actifs récemment (connexion < 7 jours)
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            
            const activeClients = await User.find({
                role: 'client',
                isBlockedByAdmin: false,
                isValidatedByAdmin: true,
                updatedAt: { $gte: sevenDaysAgo }
            });

            console.log(`📊 ${activeClients.length} clients actifs à traiter`);

            for (const client of activeClients) {
                // Générer 1 seule recommandation quotidienne
                const recommendations = await aiRecommendationService.generateRecommendations(client._id, 1);

                if (recommendations.length > 0) {
                    const rec = recommendations[0];
                    const yacht = await Yacht.findById(rec.yacht);

                    await Recommendation.create({
                        user: client._id,
                        yacht: rec.yacht,
                        score: rec.score,
                        reasons: rec.reasons,
                        aiAnalysis: rec.aiAnalysis,
                        basedOnReviews: rec.basedOnReviews,
                        status: 'pending',
                        notificationSent: true
                    });

                    // Notification in-app uniquement (pas d'email quotidien)
                    await notificationService.createNotification(
                        client._id,
                        `🤖 Nouvelle recommandation: ${yacht.name} (Score: ${rec.score}/100)`,
                        `/yacht/${yacht._id}`,
                        null
                    );

                    console.log(`✅ Recommandation quotidienne pour ${client.name}`);
                }

                await this.sleep(1000);
            }

        } catch (error) {
            console.error('❌ Erreur génération quotidienne:', error);
        }
    }

    /**
     * Nettoyer les anciennes recommandations (> 30 jours)
     */
    async cleanOldRecommendations() {
        try {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

            const result = await Recommendation.deleteMany({
                createdAt: { $lt: thirtyDaysAgo },
                status: { $in: ['dismissed', 'viewed'] }
            });

            console.log(`🧹 ${result.deletedCount} anciennes recommandations supprimées`);
        } catch (error) {
            console.error('❌ Erreur nettoyage:', error);
        }
    }

    /**
     * Fonction utilitaire pour pause
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Tester manuellement la génération pour un utilisateur
     */
    async testForUser(userId) {
        console.log(`🧪 Test de génération pour l'utilisateur ${userId}`);
        
        const recommendations = await aiRecommendationService.generateRecommendations(userId, 3);
        
        console.log(`\n✅ ${recommendations.length} recommandations générées:`);
        recommendations.forEach((rec, index) => {
            console.log(`\n${index + 1}. Score: ${rec.score}/100`);
            console.log(`   Raisons:`, rec.reasons);
            console.log(`   Sentiment:`, rec.aiAnalysis.sentimentScore);
        });
    }
}

module.exports = new RecommendationScheduler();
