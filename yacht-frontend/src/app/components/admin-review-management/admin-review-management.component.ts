import {Component, OnInit} from '@angular/core';
import {AdminService} from '../../services/adminService/admin.service';
import {ToastrService} from 'ngx-toastr';
import { DatePipe, SlicePipe } from '@angular/common';
import {getUrl} from '../../constants/functions';
import {HeaderComponent} from '../header/header.component';
import {ButtonLoaderComponent} from '../button-loader/button-loader.component';

@Component({
  selector: 'app-admin-review-management',
  imports: [
    DatePipe,
    SlicePipe,
    HeaderComponent,
    ButtonLoaderComponent
],
  templateUrl: './admin-review-management.component.html',
  standalone: true,
  styleUrl: './admin-review-management.component.css'
})
export class AdminReviewManagementComponent implements OnInit {
  pendingReviews: any[] = [];
  loadingReviews: { [key: string]: boolean } = {};

  constructor(
    private adminService: AdminService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadPendingReviews();
  }

  loadPendingReviews() {
    this.adminService.getPendingReviews().subscribe({
      next: (data) => {
        this.pendingReviews = data.map(review => ({
          ...review,
          expanded: false
        })  )    },
      error: () => {
        this.toastr.error("Erreur lors du chargement des avis.");
      }
    });
  }


  toggleExpand(review: any) {
    review.expanded = !review.expanded;
  }

  approveReview(reviewId: string) {
    this.loadingReviews[reviewId] = true;
    this.adminService.approveReview(reviewId).subscribe({
      next: () => {
        this.loadingReviews[reviewId] = false;
        this.toastr.success("Avis validé avec succès.");
        this.pendingReviews = this.pendingReviews.filter(review => review._id !== reviewId);
      },
      error: () => {
        this.loadingReviews[reviewId] = false;
        this.toastr.error("Erreur lors de l'approbation de l'avis.");
      }
    });
  }

  deleteReview(reviewId: string) {
    this.loadingReviews[reviewId] = true;
    this.adminService.deleteReview(reviewId).subscribe({
      next: () => {
        this.loadingReviews[reviewId] = false;
        this.toastr.success("Avis supprimé avec succès.");
        this.pendingReviews = this.pendingReviews.filter(review => review._id !== reviewId);
      },
      error: () => {
        this.loadingReviews[reviewId] = false;
        this.toastr.error("Erreur lors de la suppression de l'avis.");
      }
    });
  }

  protected readonly getUrl = getUrl;
}
