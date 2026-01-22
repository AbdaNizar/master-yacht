import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {YachtService} from '../../services/yachtService/yacht.service';
import {BookingService} from '../../services/bookingService/booking.service';
import { CurrencyPipe, DatePipe, NgClass, SlicePipe } from '@angular/common';
import {FormsModule} from '@angular/forms';
import {getUrl, showAlert} from '../../constants/functions';
import {AuthService} from '../../services/authService/auth.service';
import {HeaderComponent} from '../header/header.component';
import {ButtonLoaderComponent} from '../button-loader/button-loader.component';

@Component({
  selector: 'app-booking',
  imports: [
    CurrencyPipe,
    FormsModule,
    HeaderComponent,
    DatePipe,
    SlicePipe,
    ButtonLoaderComponent
],
  templateUrl: './booking.component.html',
  standalone: true,
  styleUrl: './booking.component.css'
})
export class BookingComponent implements OnInit  {
  yacht: any;
  startDate: string | null = null;
  endDate: string | null = null;
  totalPrice: number | null = null;
  isAvailable = false;
  errorMessage = '';
  user:any;
  minDate = new Date().toISOString().split('T')[0];
  isLoading = false;
  @ViewChild('carouselElement', { static: false }) carousel!: ElementRef;
  currentImageIndex = 0;
  intervalId: any;
  constructor(private route: ActivatedRoute, private router: Router,private authService : AuthService,private bookingService : BookingService, private yachtService: YachtService) {}


  ngOnInit(): void {
    this.authService.user$.subscribe((user) => {
      this.user = user;
    });
    const yachtId = this.route.snapshot.paramMap.get('id');
    if (yachtId) {
      this.yachtService.getYachtByIdToClient(yachtId).subscribe({
        next: (data) => {
          this.yacht = data;
          this.currentImageIndex = 0;
          this.startAutoSlide();
        },
        error: (err) => {
          console.error('Erreur lors de la récupération du yacht', err);
        },
      });
    }
  }

  nextImage(): void {
    if (this.yacht.images && this.yacht.images.length > 1) {
      this.currentImageIndex = (this.currentImageIndex + 1) % this.yacht.images.length;
    }
  }


  startAutoSlide(): void {
    this.intervalId = setInterval(() => {
      this.nextImage();
    }, 10000);
  }

  pauseAutoSlide(): void {
    clearInterval(this.intervalId);
  }

  resumeAutoSlide(): void {
    this.startAutoSlide();
  }

  validateDates(): void {
    this.errorMessage = '';
    this.isAvailable = false;
    console.log('this.endDate',this.endDate)
    console.log('this.startDate',this.startDate)
    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);

      if (end <= start) {
        this.errorMessage = 'La date de fin doit être postérieure à la date de début.';
        return;
      }

      this.bookingService.checkAvailability(this.yacht._id, this.startDate, this.endDate).subscribe({
        next: (response) => {
          if (response.available) {
            this.isAvailable = true;
            this.calculatePrice();
          } else {
            this.errorMessage = response.message || 'Dates indisponibles.';
          }
        },
        error: (err) => {
          this.errorMessage = 'Erreur lors de la vérification des disponibilités.';
          console.error(err);
        },
      });
    }
  }

  calculatePrice(): void {
    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      this.totalPrice = days * this.yacht.pricePerDay;
    }
  }

  bookYacht(): void {
    this.calculatePrice()
    if (!this.isAvailable) {
      showAlert({
        title: 'Dates indisponibles',
        html: 'Veuillez choisir des dates disponibles.',
        icon: 'error',
        confirmButtonText: 'OK',
      });
      return;
    }

    const bookingData = {
      yacht: this.yacht._id,
      startDate: this.startDate,
      endDate: this.endDate,
    };

    this.isLoading = true;
    this.bookingService.bookYacht(this.yacht._id, bookingData).subscribe({
      next: () => {
        this.isLoading = false;
        showAlert({
          title: 'Succès',
          html: 'Réservation effectuée avec succès !',
          icon: 'success',
          confirmButtonText: 'OK',
        }).then(() => {
          this.router.navigate(['/dashboard/client/bookings']);
        });
      },
      error: (err) => {
        this.isLoading = false;
        showAlert({
          title: 'Erreur',
          html: err.error.message || 'Une erreur est survenue.',
          icon: 'error',
          confirmButtonText: 'OK',
        });
        console.error('Erreur lors de la réservation:', err);
      },
    });
  }
  toggleExpand(review: any): void {
    review.expanded = !review.expanded;
  }

  getDaysCount(): number {
    if (this.startDate && this.endDate) {
      return Math.ceil((new Date(this.endDate).getTime() - new Date(this.startDate).getTime()) / (1000 * 60 * 60 * 24));
    }
    return 0;
  }

  protected readonly getUrl = getUrl;
}
