class AIAnalysisService {
    constructor() {
        this.apiUrl = 'https://api-inference.huggingface.co/models';
        this.apiKey = process.env.HUGGINGFACE_API_KEY ;

        this.models = {
            sentiment: 'cardiffnlp/twitter-roberta-base-sentiment-latest',
            summarization: 'facebook/bart-large-cnn',
            textGeneration: 'meta-llama/Llama-3.2-1B-Instruct'
        };
    }

    async analyzeSentiment(text) {
        try {
            if (!text || text.trim().length < 10) {
                return this.calculateLocalSentiment(text);
            }

            const response = await fetch(
                `${this.apiUrl}/${this.models.sentiment}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ inputs: text.substring(0, 500) })
                }
            );

            if (!response.ok) {
                console.warn('Hugging Face API error, using local sentiment');
                return this.calculateLocalSentiment(text);
            }

            const result = await response.json();

            if (result && result[0]) {
                const scores = result[0];
                const positive = scores.find(s => s.label === 'positive')?.score || 0;
                const neutral = scores.find(s => s.label === 'neutral')?.score || 0;
                const negative = scores.find(s => s.label === 'negative')?.score || 0;

                return Math.round((positive * 100 + neutral * 50) / (positive + neutral + negative || 1));
            }

            return this.calculateLocalSentiment(text);
        } catch (error) {
            console.error('Erreur analyse sentiment:', error);
            return this.calculateLocalSentiment(text);
        }
    }

    calculateLocalSentiment(text) {
        if (!text) return 50;

        const positiveWords = [
            'excellent', 'parfait', 'super', 'génial', 'magnifique', 'incroyable',
            'recommande', 'professionnel', 'propre', 'confortable', 'spacieux',
            'luxueux', 'agréable', 'sympa', 'merveilleux', 'fantastique',
            'impressionnant', 'superbe', 'formidable', 'exceptionnel', 'remarquable',
            'bien', 'bon', 'top', 'cool', 'wow', 'bravo', 'parfaitement'
        ];

        const negativeWords = [
            'problème', 'sale', 'bruyant', 'retard', 'déçu', 'mauvais',
            'manque', 'vieux', 'défaut', 'horrible', 'terrible', 'nul',
            'catastrophe', 'décevant', 'médiocre', 'insatisfait', 'désagréable',
            'pas', 'jamais', 'aucun', 'pire', 'dommage'
        ];

        const lowerText = text.toLowerCase();
        let positiveCount = 0;
        let negativeCount = 0;

        positiveWords.forEach(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'g');
            const matches = lowerText.match(regex);
            if (matches) positiveCount += matches.length;
        });

        negativeWords.forEach(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'g');
            const matches = lowerText.match(regex);
            if (matches) negativeCount += matches.length;
        });

        const totalWords = positiveCount + negativeCount;
        if (totalWords === 0) return 50;

        const score = (positiveCount / totalWords) * 100;
        return Math.round(Math.max(20, Math.min(95, score)));
    }

    async summarizeText(text) {
        if (!text || text.length < 30) {
            return 'Yacht recommandé pour votre recherche';
        }

        try {
            const response = await fetch(
                `${this.apiUrl}/${this.models.summarization}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        inputs: text.substring(0, 1000),
                        parameters: {
                            max_length: 100,
                            min_length: 30
                        }
                    })
                }
            );

            if (!response.ok) {
                return this.createLocalSummary(text);
            }

            const result = await response.json();

            if (result && result[0]?.summary_text) {
                return result[0].summary_text;
            }

            return this.createLocalSummary(text);
        } catch (error) {
            console.error('Erreur résumé:', error);
            return this.createLocalSummary(text);
        }
    }

    createLocalSummary(text) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
        if (sentences.length === 0) return 'Yacht bien noté par les clients';

        return sentences.slice(0, 2).join('. ').trim() + '.';
    }

    async analyzeYachtReviews(yacht, reviews) {
        if (!reviews || reviews.length === 0) {
            return this.getDefaultAnalysis(yacht);
        }

        try {
            const reviewsWithComments = reviews.filter(r => r.comment && r.comment.trim().length > 10);

            const allComments = reviewsWithComments
                .map(r => r.comment)
                .join(' ');

            let sentimentScore = 50;
            if (allComments.length > 10) {
                sentimentScore = await this.analyzeSentiment(allComments);
            } else {
                const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
                sentimentScore = Math.round((avgRating / 5) * 100);
            }

            let summary = 'Yacht recommandé pour votre recherche';
            if (allComments.length > 30) {
                summary = await this.summarizeText(allComments);
            } else if (reviewsWithComments.length > 0) {
                summary = this.createLocalSummary(allComments);
            }

            const keyPositives = this.extractPositiveKeywords(reviews);
            const keyNegatives = this.extractNegativeKeywords(reviews);
            const recommendationReasons = this.generateReasons(yacht, reviews, sentimentScore);

            return {
                sentimentScore,
                keyPositives,
                keyNegatives,
                summary,
                recommendationReasons,
                topReviews: this.getTopReviews(reviews)
            };
        } catch (error) {
            console.error('Erreur analyse IA:', error);
            return this.getDefaultAnalysis(yacht);
        }
    }

    getTopReviews(reviews) {
        const reviewsWithComments = reviews.filter(r => r.comment && r.comment.trim().length > 20);
        
        return reviewsWithComments
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 3)
            .map(r => ({
                clientName: r.client?.name || 'Client',
                rating: r.rating,
                comment: r.comment,
                date: r.createdAt
            }));
    }

    extractPositiveKeywords(reviews) {
        const positiveWords = [
            'excellent', 'parfait', 'super', 'génial', 'magnifique',
            'recommande', 'professionnel', 'propre', 'confortable',
            'spacieux', 'luxueux', 'agréable', 'sympa', 'merveilleux',
            'incroyable', 'fantastique', 'impressionnant', 'superbe'
        ];

        const keywords = new Set();
        const highRatedReviews = reviews.filter(r => r.rating >= 4 && r.comment);

        highRatedReviews.forEach(review => {
            const comment = review.comment.toLowerCase();
            positiveWords.forEach(word => {
                if (comment.includes(word)) {
                    const sentences = comment.split(/[.!?]+/);
                    const sentence = sentences.find(s => s.toLowerCase().includes(word));
                    if (sentence && sentence.trim().length > 10 && sentence.trim().length < 150) {
                        keywords.add(sentence.trim());
                    }
                }
            });
        });

        const keywordsArray = Array.from(keywords).slice(0, 5);

        return keywordsArray.length > 0 ? keywordsArray : [
            'Service de qualité',
            'Yacht bien entretenu',
            'Expérience agréable'
        ];
    }

    extractNegativeKeywords(reviews) {
        const negativeWords = [
            'problème', 'sale', 'bruyant', 'retard', 'déçu',
            'pas', 'mauvais', 'manque', 'vieux', 'défaut',
            'horrible', 'terrible', 'décevant', 'médiocre'
        ];

        const keywords = new Set();
        const lowRatedReviews = reviews.filter(r => r.rating <= 3 && r.comment);

        lowRatedReviews.forEach(review => {
            const comment = review.comment.toLowerCase();
            negativeWords.forEach(word => {
                if (comment.includes(word)) {
                    const sentences = comment.split(/[.!?]+/);
                    const sentence = sentences.find(s => s.toLowerCase().includes(word));
                    if (sentence && sentence.trim().length > 10 && sentence.trim().length < 150) {
                        keywords.add(sentence.trim());
                    }
                }
            });
        });

        return Array.from(keywords).slice(0, 3);
    }

    generateReasons(yacht, reviews, sentimentScore) {
        const reasons = [];

        if (sentimentScore >= 85) {
            reasons.push('Excellents retours clients avec un score de satisfaction de ' + sentimentScore + '%');
        } else if (sentimentScore >= 70) {
            reasons.push('Bons avis clients avec ' + sentimentScore + '% de satisfaction');
        } else if (sentimentScore >= 50) {
            reasons.push('Retours clients globalement positifs');
        }

        if (reviews.length > 0) {
            const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
            if (avgRating >= 4.5) {
                reasons.push(`Note exceptionnelle de ${avgRating.toFixed(1)}/5 basée sur ${reviews.length} avis`);
            } else if (avgRating >= 4) {
                reasons.push(`Très bien noté avec ${avgRating.toFixed(1)}/5 étoiles`);
            } else if (avgRating >= 3.5) {
                reasons.push(`Note correcte de ${avgRating.toFixed(1)}/5 sur ${reviews.length} avis`);
            }
        }

        if (yacht.pricePerDay < 500) {
            reasons.push('Excellent rapport qualité-prix');
        } else if (yacht.pricePerDay < 1000) {
            reasons.push('Prix compétitif pour cette catégorie');
        } else {
            reasons.push('Yacht haut de gamme avec services premium');
        }

        if (yacht.capacity >= 10) {
            reasons.push(`Grande capacité jusqu'à ${yacht.capacity} personnes, idéal pour les groupes`);
        } else if (yacht.capacity >= 6) {
            reasons.push('Capacité idéale pour familles et petits groupes');
        }

        if (yacht.amenities && yacht.amenities.length > 7) {
            reasons.push(`Très bien équipé avec ${yacht.amenities.length} équipements disponibles`);
        }

        return reasons.slice(0, 4);
    }

    calculateRecommendationScore(yacht, reviews, userPreferences = {}) {
        let score = 50;

        if (reviews && reviews.length > 0) {
            const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
            score += (avgRating / 5) * 30;
        }

        if (reviews && reviews.length >= 10) {
            score += 5;
        } else if (reviews && reviews.length >= 5) {
            score += 3;
        }

        if (yacht.pricePerDay < 500) {
            score += 10;
        } else if (yacht.pricePerDay < 1000) {
            score += 7;
        } else if (yacht.pricePerDay < 2000) {
            score += 5;
        }

        if (yacht.capacity >= 8) {
            score += 5;
        } else if (yacht.capacity >= 6) {
            score += 3;
        }

        if (yacht.amenities && yacht.amenities.length > 7) {
            score += 5;
        } else if (yacht.amenities && yacht.amenities.length > 5) {
            score += 3;
        }

        return Math.min(100, Math.round(score));
    }

    getDefaultAnalysis(yacht) {
        const avgRating = 3.5;
        const sentimentScore = Math.round((avgRating / 5) * 100);

        return {
            sentimentScore,
            keyPositives: [
                'Yacht de qualité',
                'Bon rapport qualité-prix',
                'Service professionnel'
            ],
            keyNegatives: [],
            summary: 'Yacht recommandé pour votre recherche',
            recommendationReasons: [
                'Correspond à vos critères de recherche',
                'Disponible pour vos dates',
                'Yacht vérifié et validé'
            ],
            topReviews: []
        };
    }
}

module.exports = new AIAnalysisService();
