const Anthropic = require('@anthropic-ai/sdk');
const Review = require('../models/Review');
const Yacht = require('../models/Yacht');
const Recommendation = require('../models/Recommendation');

class AIRecommendationService {
    constructor() {
        // Vous pouvez utiliser OpenAI ou Anthropic Claude
        this.client = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY
        });
    }

    /**
     * Analyser les sentiments des commentaires d'un yacht
     */
    async analyzeSentiment(reviews) {
        if (!reviews || reviews.length === 0) {
            return {
                sentimentScore: 0,
                keyPositives: [],
                keyNegatives: [],
                summary: 'Aucun avis disponible'
            };
        }

        const reviewTexts = reviews.map(r => `Rating: ${r.rating}/5 - ${r.comment}`).join('\n');

        const prompt = `Analyse les avis suivants pour un yacht et fournis une analyse détaillée en JSON:

${reviewTexts}

Réponds UNIQUEMENT avec un objet JSON valide contenant:
{
    "sentimentScore": (nombre entre 0-100),
    "keyPositives": [liste de 3-5 points positifs],
    "keyNegatives": [liste de 3-5 points négatifs],
    "summary": "résumé concis en 2-3 phrases"
}`;

        try {
            const response = await this.client.messages.create({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 1000,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            });

            const analysis = JSON.parse(response.content[0].text);
            return analysis;
        } catch (error) {
            console.error('Erreur analyse IA:', error);
            // Fallback: analyse simple basée sur les ratings
            return this.simpleSentimentAnalysis(reviews);
        }
    }

    /**
     * Analyse simple sans IA (fallback)
     */
    simpleSentimentAnalysis(reviews) {
        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        const sentimentScore = (avgRating / 5) * 100;

        const positives = [];
        const negatives = [];

        reviews.forEach(r => {
            if (r.rating >= 4) {
                positives.push(r.comment.substring(0, 100));
            } else if (r.rating <= 2) {
                negatives.push(r.comment.substring(0, 100));
            }
        });

        return {
            sentimentScore: Math.round(sentimentScore),
            keyPositives: positives.slice(0, 5),
            keyNegatives: negatives.slice(0, 5),
            summary: `Note moyenne: ${avgRating.toFixed(1)}/5 basée sur ${reviews.length} avis.`
        };
    }

    /**
     * Générer des recommandations personnalisées pour un utilisateur
     */
    async generateRecommendations(userId, limit = 5) {
        try {
            // 1. Récupérer tous les yachts avec leurs reviews
            const yachts = await Yacht.find({ isValidated: true }).lean();
            const recommendations = [];

            for (const yacht of yachts) {
                // Récupérer les reviews validées du yacht
                const reviews = await Review.find({ 
                    yacht: yacht._id, 
                    isValidatedByAdmin: true 
                }).populate('client', 'name image').lean();

                if (reviews.length === 0) continue;

                // Analyser les sentiments
                const aiAnalysis = await this.analyzeSentiment(reviews);

                // Calculer le score de recommandation
                const score = this.calculateRecommendationScore(yacht, reviews, aiAnalysis);

                // Générer les raisons de recommandation
                const reasons = this.generateReasons(yacht, reviews, aiAnalysis);

                recommendations.push({
                    yacht: yacht._id,
                    score,
                    reasons,
                    aiAnalysis,
                    basedOnReviews: reviews.map(r => r._id)
                });
            }

            // Trier par score décroissant
            recommendations.sort((a, b) => b.score - a.score);

            // Prendre les top recommandations
            return recommendations.slice(0, limit);

        } catch (error) {
            console.error('Erreur génération recommandations:', error);
            throw error;
        }
    }

    /**
     * Calculer le score de recommandation (0-100)
     */
    calculateRecommendationScore(yacht, reviews, aiAnalysis) {
        let score = 0;

        // 1. Score basé sur le sentiment IA (40%)
        score += aiAnalysis.sentimentScore * 0.4;

        // 2. Score basé sur le rating moyen (30%)
        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        score += (avgRating / 5) * 100 * 0.3;

        // 3. Score basé sur le nombre de reviews (15%)
        const reviewCountScore = Math.min(reviews.length / 20, 1) * 100;
        score += reviewCountScore * 0.15;

        // 4. Score basé sur la récence des reviews (15%)
        const recentReviews = reviews.filter(r => {
            const monthsAgo = (Date.now() - new Date(r.createdAt)) / (1000 * 60 * 60 * 24 * 30);
            return monthsAgo <= 6;
        });
        const recencyScore = (recentReviews.length / reviews.length) * 100;
        score += recencyScore * 0.15;

        return Math.round(score);
    }

    /**
     * Générer les raisons de recommandation
     */
    generateReasons(yacht, reviews, aiAnalysis) {
        const reasons = [];

        // Note élevée
        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        if (avgRating >= 4.5) {
            reasons.push(`🌟 Excellente note moyenne: ${avgRating.toFixed(1)}/5`);
        } else if (avgRating >= 4.0) {
            reasons.push(`⭐ Très bonne note: ${avgRating.toFixed(1)}/5`);
        }

        // Nombre de reviews
        if (reviews.length >= 10) {
            reasons.push(`✅ ${reviews.length} avis vérifiés`);
        }

        // Points positifs de l'IA
        if (aiAnalysis.keyPositives.length > 0) {
            const topPositive = aiAnalysis.keyPositives[0];
            reasons.push(`💡 ${topPositive.substring(0, 60)}...`);
        }

        // Capacité
        if (yacht.capacity >= 10) {
            reasons.push(`👥 Grande capacité: ${yacht.capacity} personnes`);
        }

        // Prix compétitif
        if (yacht.pricePerDay <= 500) {
            reasons.push(`💰 Prix attractif: ${yacht.pricePerDay}€/jour`);
        }

        return reasons.slice(0, 5);
    }

    /**
     * Générer un résumé personnalisé avec l'IA
     */
    async generatePersonalizedSummary(yachtName, aiAnalysis, userName) {
        const prompt = `Tu es un assistant de recommandation de yachts. 
        
Génère un message personnalisé en français pour ${userName} recommandant le yacht "${yachtName}".

Informations:
- Note sentiment: ${aiAnalysis.sentimentScore}/100
- Points positifs: ${aiAnalysis.keyPositives.join(', ')}
- Résumé: ${aiAnalysis.summary}

Crée un message court (2-3 phrases) qui encourage ${userName} à découvrir ce yacht.`;

        try {
            const response = await this.client.messages.create({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 200,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            });

            return response.content[0].text.trim();
        } catch (error) {
            console.error('Erreur génération résumé:', error);
            return `Bonjour ${userName}, nous pensons que le yacht ${yachtName} pourrait vous intéresser ! ${aiAnalysis.summary}`;
        }
    }
}

module.exports = new AIRecommendationService();
