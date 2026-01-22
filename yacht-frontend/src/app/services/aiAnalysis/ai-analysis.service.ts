import { Injectable } from '@angular/core';

interface ReviewAnalysis {
  positivePoints: string[];
  negativePoints: string[];
  commonThemes: string[];
  overallSentiment: string;
}

interface PriceAnalysis {
  priceCategory: string;
  valueForMoney: string;
  comparison: string;
}

interface CapacityAnalysis {
  suitableFor: string[];
  spaceAssessment: string;
  recommendations: string[];
}

export interface YachtAnalysis {
  reviewAnalysis: ReviewAnalysis;
  priceAnalysis: PriceAnalysis;
  capacityAnalysis: CapacityAnalysis;
  overallScore: number;
  recommendation: string;
}

@Injectable({
  providedIn: 'root'
})
export class AiAnalysisService {

  constructor() { }

  analyzeYacht(yacht: any): YachtAnalysis {
    const reviewAnalysis = this.analyzeReviews(yacht.reviews || []);
    const priceAnalysis = this.analyzePrice(yacht.pricePerDay, yacht.averageRating || 0);
    const capacityAnalysis = this.analyzeCapacity(yacht.capacity);
    const overallScore = this.calculateOverallScore(yacht);
    const recommendation = this.generateRecommendation(reviewAnalysis, priceAnalysis, capacityAnalysis, overallScore);

    return {
      reviewAnalysis,
      priceAnalysis,
      capacityAnalysis,
      overallScore,
      recommendation
    };
  }

  private analyzeReviews(reviews: any[]): ReviewAnalysis {
    if (!reviews || reviews.length === 0) {
      return {
        positivePoints: ['Aucun avis disponible pour le moment'],
        negativePoints: [],
        commonThemes: ['Nouveau yacht sans historique d\'avis'],
        overallSentiment: 'Neutre - Aucun avis client'
      };
    }

    const positiveKeywords = [
      'excellent', 'parfait', 'magnifique', 'superbe', 'incroyable', 
      'propre', 'confortable', 'luxueux', 'spacieux', 'moderne',
      'bien', 'agréable', 'recommande', 'professionnel', 'accueillant'
    ];

    const negativeKeywords = [
      'mauvais', 'sale', 'vieux', 'décevant', 'problème', 'défaut',
      'inconfortable', 'petit', 'étroit', 'bruyant', 'pas recommandé'
    ];

    const positivePoints: string[] = [];
    const negativePoints: string[] = [];
    const themes = new Map<string, number>();

    reviews.forEach(review => {
      const comment = (review.comment || '').toLowerCase();
      const rating = review.rating || 0;

      if (rating >= 4) {
        positiveKeywords.forEach(keyword => {
          if (comment.includes(keyword)) {
            const point = `Les clients apprécient: ${keyword}`;
            if (!positivePoints.includes(point)) {
              positivePoints.push(point);
            }
          }
        });
      }

      if (rating <= 2) {
        negativeKeywords.forEach(keyword => {
          if (comment.includes(keyword)) {
            const point = `Point d'attention: ${keyword}`;
            if (!negativePoints.includes(point)) {
              negativePoints.push(point);
            }
          }
        });
      }

      if (comment.includes('service')) themes.set('Qualité du service', (themes.get('Qualité du service') || 0) + 1);
      if (comment.includes('propre') || comment.includes('propreté')) themes.set('Propreté', (themes.get('Propreté') || 0) + 1);
      if (comment.includes('confort')) themes.set('Confort', (themes.get('Confort') || 0) + 1);
      if (comment.includes('prix') || comment.includes('rapport qualité')) themes.set('Rapport qualité/prix', (themes.get('Rapport qualité/prix') || 0) + 1);
    });

    const avgRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
    
    let sentiment = '';
    if (avgRating >= 4.5) sentiment = 'Excellent - Les clients sont très satisfaits';
    else if (avgRating >= 4) sentiment = 'Très bon - Satisfaction générale élevée';
    else if (avgRating >= 3) sentiment = 'Bon - Expérience client satisfaisante';
    else if (avgRating >= 2) sentiment = 'Moyen - Plusieurs points à améliorer';
    else sentiment = 'Faible - Amélioration nécessaire';

    if (positivePoints.length === 0) {
      positivePoints.push('Plusieurs clients satisfaits de leur expérience');
    }

    const commonThemes = Array.from(themes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([theme]) => theme);

    if (commonThemes.length === 0) {
      commonThemes.push('Expérience client variée');
    }

    return {
      positivePoints: positivePoints.slice(0, 5),
      negativePoints: negativePoints.slice(0, 3),
      commonThemes,
      overallSentiment: sentiment
    };
  }

  private analyzePrice(pricePerDay: number, rating: number): PriceAnalysis {
    let priceCategory = '';
    let valueForMoney = '';
    let comparison = '';

    if (pricePerDay < 200) {
      priceCategory = 'Économique';
      comparison = 'Prix très accessible, idéal pour les budgets serrés';
      valueForMoney = rating >= 4 ? 'Excellent rapport qualité/prix' : 'Bon rapport qualité/prix pour cette gamme';
    } else if (pricePerDay < 500) {
      priceCategory = 'Standard';
      comparison = 'Prix dans la moyenne du marché';
      valueForMoney = rating >= 4 ? 'Très bon rapport qualité/prix' : 'Rapport qualité/prix correct';
    } else if (pricePerDay < 1000) {
      priceCategory = 'Premium';
      comparison = 'Yacht haut de gamme avec services premium';
      valueForMoney = rating >= 4 ? 'Qualité justifie le prix' : 'Prix élevé mais prestations de qualité';
    } else {
      priceCategory = 'Luxe';
      comparison = 'Yacht de luxe avec équipements exceptionnels';
      valueForMoney = rating >= 4 ? 'Expérience exclusive justifiant l\'investissement' : 'Segment luxe avec prestations haut de gamme';
    }

    return {
      priceCategory,
      valueForMoney,
      comparison
    };
  }

  private analyzeCapacity(capacity: number): CapacityAnalysis {
    let suitableFor: string[] = [];
    let spaceAssessment = '';
    let recommendations: string[] = [];

    if (capacity <= 4) {
      suitableFor = ['Couples', 'Petites familles', 'Sorties romantiques'];
      spaceAssessment = 'Yacht intime, parfait pour des moments privilégiés';
      recommendations = [
        'Idéal pour une escapade en couple',
        'Parfait pour découvrir la navigation à deux',
        'Recommandé pour des sorties calmes et paisibles'
      ];
    } else if (capacity <= 8) {
      suitableFor = ['Familles', 'Petits groupes', 'Amis'];
      spaceAssessment = 'Capacité idéale pour profiter à plusieurs sans être trop nombreux';
      recommendations = [
        'Excellent pour des sorties en famille',
        'Adapté aux groupes d\'amis',
        'Espace suffisant pour socialiser confortablement'
      ];
    } else if (capacity <= 12) {
      suitableFor = ['Grands groupes', 'Événements familiaux', 'Sorties d\'entreprise'];
      spaceAssessment = 'Grand yacht permettant d\'accueillir de nombreuses personnes';
      recommendations = [
        'Parfait pour organiser des fêtes',
        'Idéal pour les événements d\'entreprise',
        'Recommandé pour les réunions de famille importantes'
      ];
    } else {
      suitableFor = ['Événements majeurs', 'Grandes célébrations', 'Groupes importants'];
      spaceAssessment = 'Yacht de très grande capacité pour événements exceptionnels';
      recommendations = [
        'Parfait pour les grands événements',
        'Idéal pour les célébrations importantes',
        'Recommandé pour les mariages et réceptions'
      ];
    }

    return {
      suitableFor,
      spaceAssessment,
      recommendations
    };
  }

  private calculateOverallScore(yacht: any): number {
    const reviewScore = yacht.averageRating || 0;
    const reviewCount = (yacht.reviews || []).length;
    
    let reviewWeight = reviewScore * 2;
    if (reviewCount === 0) reviewWeight = 5;
    else if (reviewCount < 5) reviewWeight = reviewScore * 1.5;

    const priceScore = this.getPriceScore(yacht.pricePerDay);
    const capacityScore = 7;

    const totalScore = (reviewWeight * 0.6) + (priceScore * 0.2) + (capacityScore * 0.2);
    
    return Math.round(totalScore * 10) / 10;
  }

  private getPriceScore(price: number): number {
    if (price < 200) return 8;
    if (price < 500) return 7;
    if (price < 1000) return 6;
    return 5;
  }

  private generateRecommendation(
    reviewAnalysis: ReviewAnalysis, 
    priceAnalysis: PriceAnalysis, 
    capacityAnalysis: CapacityAnalysis,
    score: number
  ): string {
    let recommendation = '';

    if (score >= 8) {
      recommendation = `Ce yacht est hautement recommandé ! ${reviewAnalysis.overallSentiment}. `;
    } else if (score >= 6) {
      recommendation = `Ce yacht offre une bonne expérience. ${reviewAnalysis.overallSentiment}. `;
    } else {
      recommendation = `Ce yacht peut convenir selon vos besoins. ${reviewAnalysis.overallSentiment}. `;
    }

    recommendation += `${priceAnalysis.valueForMoney}. `;
    recommendation += `${capacityAnalysis.spaceAssessment}.`;

    return recommendation;
  }
}
