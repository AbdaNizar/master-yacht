import { Component, OnInit } from '@angular/core';
import { YachtService } from '../../services/yachtService/yacht.service';
import { NgClass, SlicePipe } from '@angular/common';
import { getUrl, showAlert } from '../../constants/functions';
import { AuthService } from '../../services/authService/auth.service';
import { Router } from '@angular/router';
import {HeaderComponent} from '../header/header.component';
import {GoogleMap, MapMarker} from '@angular/google-maps';
import {WebSocketService} from '../../services/webSocketService/web-socket.service';
import { ToastService } from '../../services/toast.service';
import { YachtAnalysisModalComponent } from '../yacht-analysis-modal/yacht-analysis-modal.component';

@Component({
  selector: 'app-yacht-list',
  imports: [
    NgClass,
    HeaderComponent,
    GoogleMap,
    MapMarker,
    SlicePipe,
    YachtAnalysisModalComponent
],
  templateUrl: './yacht-list.component.html',
  standalone: true,
  styleUrl: './yacht-list.component.css'
})
export class YachtListComponent implements OnInit {
  yachts: any[] = [];
  role: string = '';
  currentImageIndex: { [key: string]: number } = {};
  imageInterval: { [key: string]: any } = {};
  isMapModalOpen = false;
  expandedDescriptions: { [key: string]: boolean } = {};

  center = { lat: 0, lng: 0 };
  zoom = 12;

  isReviewsModalOpen = false;
  selectedYacht: any = null;
  averageRating = 0;
  reviewCount = 0;
  protected readonly Math = Math;
  
  isAiAnalysisModalOpen = false;
  selectedYachtForAnalysis: any = null;

  constructor(
    private yachtService: YachtService,
    private authService: AuthService,
    private router: Router,
    private webSocketService: WebSocketService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.authService.user$.subscribe((user) => {
      this.role = user.role;

      if (this.role === 'owner') {
        this.loadOwnerYachts();
      } else if (this.role === 'client') {
        this.loadPublicYachts();
      }
    });

    this.webSocketService.notificationSubject$.subscribe((notification) => {
      if (notification) {
        if (this.role === 'owner') {
          this.loadOwnerYachts();
        } else if (this.role === 'client') {
          this.loadPublicYachts();
        }
      }
    });
  }

  loadOwnerYachts(): void {
    this.yachtService.getMyYachts().subscribe({
      next: (data) => {
        this.yachts =data
        this.yachts.forEach(yacht => {
          this.currentImageIndex[yacht._id] = 0;
          this.startAutoSlide(yacht._id);
        });
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des yachts:', err);
      }
    });
  }

  openLocationModal(yacht: any): void {
    if (yacht.location) {
      const [lat, lng] = yacht.location.split(',').map((cord: string) => {
        return parseFloat(cord.trim());
      });

      this.center = { lat, lng };
      this.isMapModalOpen =true
    } else {
      console.error('Position non disponible');
    }
  }

  closeMapModal() {
    this.isMapModalOpen = false;
  }

  loadPublicYachts(): void {
    this.yachtService.getPublicYachts().subscribe({
      next: (data) => {
        this.yachts = data;
        this.yachts.forEach(yacht => {
          this.currentImageIndex[yacht._id] = 0;
          this.startAutoSlide(yacht._id);
        });
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des yachts publics:', err);
      }
    });
  }

  nextImage(yacht: any, event: Event): void {
    event.stopPropagation();
    if (yacht.images && yacht.images.length > 0) {
      this.currentImageIndex[yacht._id] =
        (this.currentImageIndex[yacht._id] + 1) % yacht.images.length;
    }
  }

  startAutoSlide(yachtId: string): void {
    this.imageInterval[yachtId] = setInterval(() => {
      this.nextImage({ _id: yachtId, images: this.yachts.find(y => y._id === yachtId)?.images }, new Event(''));
    }, 10000);
  }

  pauseAutoSlide(yachtId: string): void {
    clearInterval(this.imageInterval[yachtId]);
  }

  resumeAutoSlide(yachtId: string): void {
    this.startAutoSlide(yachtId);
  }

  protected readonly getUrl = getUrl;

  editYacht(yacht: any): void {
    this.router.navigate([`dashboard/owner/yacht/edit/${yacht._id}`]);
  }

  async deleteYacht(id: string): Promise<void> {
    const customAlertData = {
      title: 'Êtes-vous sûr ?',
      html: "Cette action est irréversible !",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e63946',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
    };
    try {
      const result = await showAlert(customAlertData);
      if (result.isConfirmed) {
        this.yachtService.deleteYacht(id).subscribe({
          next: () => {
            this.yachts = this.yachts.filter((yacht) => yacht._id !== id);
            this.toastService.success('Yacht supprimé avec succès');
          },
          error: (err) => {
            this.toastService.error('Erreur lors de la suppression du yacht');
          },
        });
      }
    } catch (error) {
      console.error('Error showing alert:', error);
    }
  }

  async togglePublicStatus(yacht: any): Promise<void> {
    const customAlertData = {
      title: yacht.isPublic ? 'Rendre ce yacht privé ?' : 'Rendre ce yacht public ?',
      html: yacht.isPublic
        ? 'Ce yacht ne sera plus visible par les utilisateurs publics.'
        : 'Ce yacht sera désormais visible par tous les utilisateurs.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: yacht.isPublic ? 'Oui, rendre privé' : 'Oui, rendre public',
      cancelButtonText: 'Annuler',
    };

    try {
      const result = await showAlert(customAlertData);
      if (result.isConfirmed) {
        this.yachtService.togglePublicStatus(yacht._id).subscribe({
          next: (response) => {
            yacht.isPublic = response.isPublic;
            this.toastService.success(`Yacht maintenant ${response.isPublic ? 'Public' : 'Privé'}`);
          },
          error: (err) => {
            this.toastService.error('Erreur lors de la modification du statut');
          },
        });
      }
    } catch (error) {
      console.error('Error showing alert:', error);
    }
  }

  goToBooking(yacht: any): void {
    if (this.role !== 'owner') {
      this.router.navigate(['/dashboard/client/bookings', yacht._id]);
    }
  }

  showReviews(yacht: any, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    if (!yacht.reviews || yacht.reviews.length === 0) {
      this.toastService.info('Ce yacht n\'a pas encore de commentaires.');
      return;
    }

    this.selectedYacht = yacht;
    this.reviewCount = yacht.reviews.length;
    this.averageRating = yacht.averageRating ||
      (yacht.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / this.reviewCount);
    this.isReviewsModalOpen = true;
  }

  closeReviewsModal(): void {
    this.isReviewsModalOpen = false;
    this.selectedYacht = null;
  }

  formatDate(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return d.toLocaleDateString('fr-FR', options);
  }

  toggleDescription(yachtId: string, event: Event): void {
    event.stopPropagation();
    this.expandedDescriptions[yachtId] = !this.expandedDescriptions[yachtId];
  }

  getRatingCount(rating: number): number {
    if (!this.selectedYacht?.reviews) return 0;
    return this.selectedYacht.reviews.filter((r: any) => r.rating === rating).length;
  }

  getRatingPercentage(rating: number): number {
    if (!this.selectedYacht?.reviews || this.selectedYacht.reviews.length === 0) return 0;
    const count = this.getRatingCount(rating);
    return (count / this.selectedYacht.reviews.length) * 100;
  }

  openAiAnalysis(yacht: any, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectedYachtForAnalysis = yacht;
    this.isAiAnalysisModalOpen = true;
  }

  closeAiAnalysisModal(): void {
    this.isAiAnalysisModalOpen = false;
    this.selectedYachtForAnalysis = null;
  }
}
