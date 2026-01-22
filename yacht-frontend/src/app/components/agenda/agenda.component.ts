import { Component, OnInit } from '@angular/core';
import { BookingService } from '../../services/bookingService/booking.service';
import { ToastrService } from 'ngx-toastr';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import timeGridPlugin from '@fullcalendar/timegrid';
import { HeaderComponent } from '../header/header.component';
import { WebSocketService } from '../../services/webSocketService/web-socket.service';
import { ChatService } from '../../services/chat.service';
import { Router } from '@angular/router';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import { getUrl } from '../../constants/functions';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-agenda',
  imports: [FullCalendarModule, HeaderComponent, CommonModule],
  templateUrl: './agenda.component.html',
  standalone: true,
  styleUrl: './agenda.component.css',
})
export class AgendaComponent implements OnInit {
  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin, interactionPlugin],
    events: [],
  };

  showBookingModal = false;
  selectedBooking: any = null;
  currentImageIndex = 0;

  constructor(
    private bookingService: BookingService,
    private webSocketService: WebSocketService,
    private toastr: ToastrService,
    private chatService: ChatService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadBookings();
    this.webSocketService.notificationSubject$.subscribe((notification) => {
      if (notification) {
        this.loadBookings();
      }
    });
  }

  loadBookings(): void {
    this.bookingService.getBookingsForOwner().subscribe({
      next: (data) => {
        this.initializeCalendar(data);
      },
      error: (err) => {
        console.error('Error fetching bookings:', err);
      },
    });
  }

  initializeCalendar(data: any[]): void {
    this.calendarOptions = {
      plugins: [dayGridPlugin, interactionPlugin, timeGridPlugin],
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay',
      },
      locales: [frLocale],
      locale: 'fr',
      events: data.map((booking: any) => ({
        id: booking._id,
        title: booking.yacht.name,
        start: booking.startDate,
        end: booking.endDate,
        extendedProps: {
          yachtImages: booking.yacht.images || [],
          clientImage: booking.client.image,
          clientId: booking.client._id,
          status: booking.status,
          totalPrice: booking.totalPrice,
          clientName: booking.client.name,
          clientEmail: booking.client.email,
          clientPhone: booking.client.phone,
          yachtName: booking.yacht.name,
        },
        classNames: [`booking-${booking.status}`],
      })),
      nowIndicator: true,
      editable: false,
      eventClick: this.onEventClick.bind(this),
      eventDidMount: (info) => {
        const { yachtImages, clientImage, status, totalPrice, yachtName, clientName } = info.event.extendedProps;

        if (!yachtImages || yachtImages.length === 0) {
          yachtImages.push('assets/img/default-yacht.jpg');
        }

        let currentIndex = 0;

        const updateImage = () => {
          const imgElement = document.getElementById(`yacht-img-${info.event.id}`) as HTMLImageElement;
          if (imgElement) {
            imgElement.src = getUrl(yachtImages[currentIndex]);
          }
        };

        const imageInterval = setInterval(() => {
          currentIndex = (currentIndex + 1) % yachtImages.length;
          updateImage();
        }, 3000);

        let statusColor = "#FFA500";
        if (status === "accepted") statusColor = "#28A745";
        else if (status === "canceled") statusColor = "#DC3545";
        else if (status === "payed") statusColor = "#007BFF";
        else if (status === "ongoing") statusColor = "#e331e0";
        else if (status === "done") statusColor = "#686767";

        tippy(info.el, {
          content: `
  <div style="text-align: left; font-family: Arial, sans-serif; color: #fdf0ff; max-width: 220px;">
    <div style="display: flex; align-items: center; margin-bottom: 10px;">
      <img src="${getUrl(clientImage)}" alt="Client" style="width: 50px; height: 50px; border-radius: 50%; margin-right: 10px; border: 2px solid #6c63ff;" />
      <div>
        <div style="font-weight: bold; color: #fbf0ff; font-size: 14px;">${clientName}</div>
        <small style="color: #555;">Client</small>
      </div>
    </div>
    <img id="yacht-img-${info.event.id}" src="${getUrl(yachtImages[0])}" alt="Yacht" style="width: 100%; height: 80px; border-radius: 8px; object-fit: cover; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);" />
    <div style="margin-bottom: 8px;">
      <strong style="color: #ffffff;">Statut:</strong>
      <span style="color: ${statusColor};">
        ${this.getStatusText(status)}
      </span>
    </div>
    <div>
      <strong style="color: #ffffff;">Prix total:</strong>
      <span style="color: #000; font-weight: bold;">${totalPrice} DT</span>
    </div>
  </div>
  `,
          allowHTML: true,
          theme: 'light',
          onHidden() {
            clearInterval(imageInterval);
          }
        });
      },
    };
  }

  onEventClick(info: any): void {
    const booking = info.event.extendedProps;

    if (booking.status === 'canceled') {
      this.toastr.warning('Cette réservation a déjà été annulée.');
      return;
    }

    this.selectedBooking = {
      bookingId: info.event.id,
      ...booking
    };
    this.currentImageIndex = 0;
    this.showBookingModal = true;
  }

  closeModal(): void {
    this.showBookingModal = false;
    this.selectedBooking = null;
    this.currentImageIndex = 0;
  }

  nextImage(): void {
    if (this.selectedBooking && this.selectedBooking.yachtImages) {
      this.currentImageIndex = (this.currentImageIndex + 1) % this.selectedBooking.yachtImages.length;
    }
  }

  previousImage(): void {
    if (this.selectedBooking && this.selectedBooking.yachtImages) {
      this.currentImageIndex = this.currentImageIndex === 0 
        ? this.selectedBooking.yachtImages.length - 1 
        : this.currentImageIndex - 1;
    }
  }

  acceptBooking(): void {
    if (!this.selectedBooking) return;
    
    this.bookingService.updateBookingStatus(this.selectedBooking.bookingId, 'accepted').subscribe({
      next: () => {
        this.toastr.success('✅ Réservation acceptée avec succès !');
        this.closeModal();
        this.loadBookings();
      },
      error: (err) => {
        this.toastr.error('Erreur lors de l\'acceptation de la réservation');
        console.error(err);
      }
    });
  }

  rejectBooking(): void {
    if (!this.selectedBooking) return;
    
    this.bookingService.updateBookingStatus(this.selectedBooking.bookingId, 'canceled').subscribe({
      next: () => {
        this.toastr.success('❌ Réservation refusée avec succès !');
        this.closeModal();
        this.loadBookings();
      },
      error: (err) => {
        this.toastr.error('Erreur lors du refus de la réservation');
        console.error(err);
      }
    });
  }

  cancelBooking(): void {
    if (!this.selectedBooking) return;
    
    this.bookingService.updateBookingStatus(this.selectedBooking.bookingId, 'canceled').subscribe({
      next: () => {
        this.toastr.success('🚫 Réservation annulée avec succès !');
        this.closeModal();
        this.loadBookings();
      },
      error: (err) => {
        this.toastr.error('Erreur lors de l\'annulation de la réservation');
        console.error(err);
      }
    });
  }

  openChat(clientId: string, bookingId: string): void {
    this.chatService.getOrCreateConversation(clientId, bookingId)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.closeModal();
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

  getStatusText(status: string): string {
    const statusMap: any = {
      pending: 'En attente',
      accepted: 'Accepté',
      payed: 'Payé',
      ongoing: 'En cours',
      done: 'Terminé',
      canceled: 'Annulé'
    };
    return statusMap[status] || status;
  }

  protected readonly getUrl = getUrl;
}
