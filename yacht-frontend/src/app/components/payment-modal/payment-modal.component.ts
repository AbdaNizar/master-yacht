import { Component, AfterViewInit, ElementRef, ViewChild, Input } from '@angular/core';
import { loadStripe, Stripe, StripeElements, Appearance } from '@stripe/stripe-js';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-payment-modal',
  templateUrl: './payment-modal.component.html',
  styleUrl: './payment-modal.component.css',
  imports: [CommonModule],
  standalone: true
})
export class PaymentModalComponent implements AfterViewInit {
  @ViewChild('paymentElement', { static: false }) paymentElementRef!: ElementRef;
  @Input() booking: any;
  isFormLoaded = false;
  isProcessing = false;
  stripe: Stripe | null = null;
  elements!: StripeElements;
  clientSecret: string | null = null;
  isModalOpen = false;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService
  ) {}

  async ngAfterViewInit() {}

  async openPaymentModal(booking: any) {
    this.isModalOpen = true;
    this.booking = booking;
    this.isFormLoaded = false;
    
    this.http.post<{ clientSecret: string }>('http://localhost:3001/stripe/create-payment-intent', {
      amount: booking.totalPrice * 100,
      currency: 'eur',
    }).subscribe({
      next: async (response) => {
        this.clientSecret = response?.clientSecret;

        if (this.clientSecret) {
          this.stripe = await loadStripe('pk_test_51QhsftIvZLQyTs3vjqctYGy3jrBGqFMmr2rfy4mvGBsPHFz3dMr47XGj8b1dbc3F3eqRT5o8mfMg7oRGbc35cxU100K1SZw6xl');

          if (!this.stripe) {
            this.toastr.error('Erreur lors du chargement de Stripe');
            return;
          }

          const appearance: Appearance = {
            theme: 'flat',
            variables: {
              colorPrimary: '#667EEA',
              colorBackground: '#0F172A',
              colorText: '#F1F5F9',
              colorDanger: '#EF4444',
              fontFamily: 'Inter, system-ui, sans-serif',
              spacingUnit: '4px',
              borderRadius: '12px'
            }
          };

          this.elements = this.stripe.elements({ clientSecret: this.clientSecret, appearance });
          const paymentElement = this.elements.create('payment');
          paymentElement.mount(this.paymentElementRef.nativeElement);
          
          setTimeout(() => {
            this.isFormLoaded = true;
          }, 1000);
        }
      },
      error: (error) => {
        console.error('Error fetching client secret:', error);
        this.toastr.error('Erreur lors de l\'initialisation du paiement');
        this.closeModal();
      }
    });
  }

  async handlePayment(booking = this.booking) {
    if (!this.stripe || !this.elements || this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    const queryParams = new URLSearchParams({
      bookingId: booking._id,
      totalPrice: booking.totalPrice.toString(),
      client: booking.client
    });

    const result = await this.stripe.confirmPayment({
      elements: this.elements,
      confirmParams: {
        return_url: `http://localhost:4200/dashboard/client/payment-success?${queryParams}`
      }
    });

    if (result.error) {
      console.error('Payment failed:', result.error.message);
      this.toastr.error('Erreur de paiement: ' + result.error.message);
      this.isProcessing = false;
    }
  }

  closeModal() {
    this.isModalOpen = false;
    this.isFormLoaded = false;
    this.isProcessing = false;
  }
}
