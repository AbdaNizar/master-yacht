import {Component, OnInit, ViewChild} from '@angular/core';
import {BookingService} from '../../services/bookingService/booking.service';
import {ToastrService} from 'ngx-toastr';
import { DatePipe, NgClass } from '@angular/common';
import {getUrl, showAlert} from '../../constants/functions';
import {HeaderComponent} from '../header/header.component';
import {WebSocketService} from '../../services/webSocketService/web-socket.service';
import {PaymentModalComponent} from '../payment-modal/payment-modal.component';
import {Router, RouterLink} from '@angular/router';
import {ReviewService} from '../../services/reviewService/review.service';
import {ChatService} from '../../services/chat.service';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-client-bookings',
  templateUrl: './client-bookings.component.html',
  standalone: true,
  imports: [
    NgClass,
    DatePipe,
    HeaderComponent,
    PaymentModalComponent,
    RouterLink,
    FormsModule
],
  styleUrl: './client-bookings.component.css'
})
export class ClientBookingsComponent implements OnInit {
  bookings: any[] = [];
  filteredBookings: any[] = [];
  currentImageIndex: { [key: string]: number } = {};
  selectedBooking: any = null;
  isPaymentModalVisible = false;
  @ViewChild(PaymentModalComponent) paymentModal!: PaymentModalComponent;

  selectedStatus: string = 'all';
  searchTerm: string = '';
  sortBy: string = 'date-desc';

  constructor(
    private bookingService: BookingService,
    private router: Router,
    private reviewService: ReviewService,
    private webSocketService: WebSocketService,
    private toastr: ToastrService,
    private chatService: ChatService
  ) {}

  ngOnInit(): void {
    this.loadClientBookings();
    this.webSocketService.notificationSubject$.subscribe((notification) => {
      if (notification) {
        this.loadClientBookings();
      }
    });
  }

  loadClientBookings(): void {
    this.bookingService.getBookingsForClient().subscribe({
      next: (data) => {
        this.bookings = data;
        this.bookings = this.bookings.map(booking => ({
          ...booking,
          hasReviewed: false
        }));
        this.bookings.forEach(booking => {
          this.reviewService.getHasReview(booking._id).subscribe((response: any) => {
            booking.hasReviewed = response.hasReviewed;
          });
        });
        this.bookings.forEach(booking => {
          this.currentImageIndex[booking._id] = 0;
        });
        this.applyFilters();
      },
      error: (err) => {
        console.error('Error fetching client bookings:', err);
        this.toastr.error('Erreur lors du chargement des réservations.');
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.bookings];

    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter(booking => booking.status === this.selectedStatus);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.yacht.name.toLowerCase().includes(term)
      );
    }

    switch(this.sortBy) {
      case 'date-desc':
        filtered.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        break;
      case 'date-asc':
        filtered.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        break;
      case 'price-desc':
        filtered.sort((a, b) => b.totalPrice - a.totalPrice);
        break;
      case 'price-asc':
        filtered.sort((a, b) => a.totalPrice - b.totalPrice);
        break;
    }

    this.filteredBookings = filtered;
  }

  onStatusChange(): void {
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onSortChange(): void {
    this.applyFilters();
  }

  getStatusCount(status: string): number {
    if (status === 'all') return this.bookings.length;
    return this.bookings.filter(b => b.status === status).length;
  }

  nextImage(booking: any, event: Event) {
    event.stopPropagation();
    if (!booking.yacht.images || booking.yacht.images.length === 0) return;

    this.currentImageIndex[booking._id] =
      (this.currentImageIndex[booking._id] + 1) % booking.yacht.images.length;
  }

  async cancelBooking(bookingId: string): Promise<void> {
    const customAlertData = {
      title: 'Confirmer l\'annulation',
      html: "Êtes-vous sûr de vouloir annuler cette réservation ?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e63946',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Oui, annuler',
      cancelButtonText: 'Non, fermer',
    };

    try {
      const result = await showAlert(customAlertData);

      if (result.isConfirmed) {
        this.bookingService.updateBookingStatus(bookingId, 'canceled').subscribe({
          next: () => {
            showAlert({
              title: 'Annulé !',
              html: 'Votre réservation a été annulée avec succès.',
              icon: 'success',
            });
            this.loadClientBookings();
          },
          error: () => {
            showAlert({
              title: 'Erreur',
              html: 'Une erreur s\'est produite lors de l\'annulation.',
              icon: 'error',
            });
          }
        });
      }
    } catch (error) {
      console.error("Erreur dans showAlert :", error);
    }
  }

  goToAddReview(bookingId: string) {
    this.router.navigate(['/dashboard/client/add-review', bookingId]);
  }

  openChat(booking: any) {
    this.chatService.getOrCreateConversation(booking.yacht.owner, booking._id)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.router.navigate(['/dashboard/chat'], {
              state: { conversationId: response.data._id }
            });
          }
        },
        error: (err) => {
          console.error('Error creating conversation:', err);
          this.toastr.error('Impossible d\'ouvrir la conversation');
        }
      });
  }

  protected readonly getUrl = getUrl;
}
