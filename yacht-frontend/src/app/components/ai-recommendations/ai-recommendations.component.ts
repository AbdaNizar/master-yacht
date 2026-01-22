import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RecommendationService, Recommendation } from '../../services/recommendationService/recommendation.service';
import { Router } from '@angular/router';
import { getUrl } from '../../constants/functions';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-ai-recommendations',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './ai-recommendations.component.html',
  styleUrls: ['./ai-recommendations.component.css']
})
export class AiRecommendationsComponent implements OnInit {
  recommendations: Recommendation[] = [];
  loading: boolean = false;
  currentPage: number = 1;
  totalPages: number = 1;
  selectedStatus: string = '';
  generating: boolean = false;
  analysisModalOpen: boolean = false;
  selectedRecommendation: Recommendation | null = null;

  constructor(
    private recommendationService: RecommendationService,
    private router: Router,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    this.loadRecommendations();
  }

  loadRecommendations(): void {
    this.loading = true;
    this.recommendationService.getMyRecommendations(this.selectedStatus, 12, this.currentPage)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.recommendations = response.data as Recommendation[];
            if (response.pagination) {
              this.totalPages = response.pagination.pages;
            }
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur chargement recommandations:', error);
          this.loading = false;
          this.toastService.error('Impossible de charger les recommandations');
        }
      });
  }

  generateNewRecommendations(): void {
    if (this.generating) return;

    this.generating = true;
    this.toastService.info('Génération en cours...');

    this.recommendationService.generateRecommendations(3, true, true)
      .subscribe({
        next: (response) => {
          this.generating = false;
          if (response.success) {
            this.toastService.success(response.message || 'Recommandations générées !');
            this.loadRecommendations();
          }
        },
        error: (error) => {
          this.generating = false;
          console.error('Erreur génération:', error);
          this.toastService.error('Impossible de générer les recommandations');
        }
      });
  }

  viewYacht(recommendation: Recommendation): void {
    this.recommendationService.markAsViewed(recommendation._id).subscribe();
    this.router.navigate(['/dashboard/client/bookings', recommendation.yacht._id]);
  }

  dismissRecommendation(recommendation: Recommendation, event: Event): void {
    event.stopPropagation();

    this.recommendationService.dismissRecommendation(recommendation._id)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.recommendations = this.recommendations.filter(r => r._id !== recommendation._id);
            this.toastService.success('Recommandation rejetée');
          }
        },
        error: (error) => {
          console.error('Erreur rejet:', error);
          this.toastService.error('Erreur lors du rejet');
        }
      });
  }

  showAIAnalysis(recommendation: Recommendation, event: Event): void {
    event.stopPropagation();
    this.selectedRecommendation = recommendation;
    this.analysisModalOpen = true;
  }

  closeAnalysisModal(): void {
    this.analysisModalOpen = false;
    this.selectedRecommendation = null;
  }

  filterByStatus(status: string): void {
    this.selectedStatus = status;
    this.currentPage = 1;
    this.loadRecommendations();
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.loadRecommendations();
  }

  getScoreIcon(score: number): string {
    if (score >= 90) return '🌟';
    if (score >= 75) return '⭐';
    if (score >= 60) return '✨';
    return '💫';
  }

  getScoreColor(score: number): string {
    if (score >= 90) return '#4CAF50';
    if (score >= 75) return '#8BC34A';
    if (score >= 60) return '#FFC107';
    return '#FF9800';
  }

  getScoreLabel(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Très Bon';
    if (score >= 60) return 'Bon';
    return 'Correct';
  }

  getSentimentGradient(score: number): string {
    if (score >= 80) return 'linear-gradient(90deg, #4CAF50, #8BC34A)';
    if (score >= 60) return 'linear-gradient(90deg, #FFC107, #FFB300)';
    if (score >= 40) return 'linear-gradient(90deg, #FF9800, #FB8C00)';
    return 'linear-gradient(90deg, #F44336, #E53935)';
  }

  getSentimentDescription(score: number): string {
    if (score >= 85) return 'Excellents retours clients ! Les utilisateurs adorent ce yacht.';
    if (score >= 70) return 'Bons retours clients. La majorité des avis sont positifs.';
    if (score >= 50) return 'Avis clients corrects. Quelques points à améliorer.';
    return 'Avis clients mitigés. Consultez les détails avant de réserver.';
  }

  protected readonly getUrl = getUrl;
}
