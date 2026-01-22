import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {YachtService} from '../../services/yachtService/yacht.service';
import {ToastrService} from 'ngx-toastr';
import {ReviewService} from '../../services/reviewService/review.service';
import { NgClass } from '@angular/common';
import {getUrl} from '../../constants/functions';
import {FormsModule} from '@angular/forms';
import {HeaderComponent} from '../header/header.component';
import {BookingService} from '../../services/bookingService/booking.service';
import {ButtonLoaderComponent} from '../button-loader/button-loader.component';

@Component({
  selector: 'app-add-review',
  imports: [
    NgClass,
    FormsModule,
    HeaderComponent,
    ButtonLoaderComponent
],
  templateUrl: './add-review.component.html',
  standalone: true,
  styleUrl: './add-review.component.css'
})
export class AddReviewComponent implements OnInit {
  yachtId: string = '';
  bookingId: string = '';
  yachtName: string = '';
  yachtImage: string = '';
  successMessage: string = '';
  rating: number = 0;
  comment: string = '';
  isLoading = false;
  constructor(
    private route: ActivatedRoute,
    private reviewService: ReviewService,
    private bookingService: BookingService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.bookingId = this.route.snapshot.paramMap.get('id') || '';
    console.log('bookingId',this.bookingId)
    this.bookingService.getBookingsById(this.bookingId).subscribe(
      (booking) => {
        console.log('booking',booking)
        this.yachtId = booking.yacht._id;
        this.yachtName = booking.yacht.name;
        this.yachtImage = booking.yacht.images[0];
      },
      (error) => {
        console.error('❌ Erreur lors du chargement du yacht:', error);
      }
    );
  }

  setRating(star: number) {
    this.rating = star;
  }

  submitReview() {
    if (this.rating === 0) {
      this.toastr.warning('Veuillez attribuer une note avant de soumettre.');
      return;
    }

    if (!this.comment.trim()) {
      this.toastr.warning('Le commentaire ne peut pas être vide.');
      return;
    }

    const reviewData = {
      yacht: this.yachtId,
      rating: this.rating,
      comment: this.comment,
      bookingId: this.bookingId
    };
    this.isLoading = true;
    this.reviewService.submitReview(reviewData).subscribe(
      (response) => {
        this.isLoading = false;
        this.successMessage = '✅ Votre avis a été soumis et est en attente de validation.';
        this.toastr.success('Votre avis a été soumis avec succès !');
        setTimeout(() => {
          this.router.navigate(['/dashboard/client/bookings']);
        }, 3000);
      },
      (error) => {
        this.isLoading = false;
        console.error('❌ Erreur lors de l\'envoi de l\'avis:', error);
        this.toastr.error('Erreur lors de l\'envoi de l\'avis.');
      }
    );
  }

  protected readonly getUrl = getUrl;
}
