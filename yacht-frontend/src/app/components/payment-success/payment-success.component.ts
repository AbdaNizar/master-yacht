import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from '../../services/orderService/order.service';
import { BookingService } from '../../services/bookingService/booking.service';
import { ToastrService } from 'ngx-toastr';
import { HeaderComponent } from '../header/header.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-payment-success',
  templateUrl: './payment-success.component.html',
  styleUrl: './payment-success.component.css',
  imports: [HeaderComponent, CommonModule],
  standalone: true
})
export class PaymentSuccessComponent implements OnInit {
  paymentIntentId: string | null = null;
  isLoading = true;
  paymentSuccess = false;
  count = 5;
  currentDate = new Date();

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService,
    private bookingService: BookingService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.paymentIntentId = params['payment_intent'];
      const bookingId = params['bookingId'];
      const totalPrice = params['totalPrice'];
      const client = params['client'];

      if (this.paymentIntentId && bookingId && totalPrice && client) {
        this.processPaymentSuccess(bookingId, totalPrice, client);
      } else {
        this.toastr.error('Paiement non valide.');
        this.isLoading = false;
        this.paymentSuccess = false;
      }
    });
  }

  processPaymentSuccess(bookingId: string, totalPrice: string, client: string) {
    const orderData = {
      stripePaymentId: this.paymentIntentId,
      bookingId: bookingId,
      totalPrice: totalPrice,
      client: client
    };

    this.orderService.saveOrder(orderData).subscribe({
      next: (response) => {
        setTimeout(() => {
          this.isLoading = false;
          this.paymentSuccess = true;
          this.startCountdown();
          this.toastr.success('✅ Paiement réussi !');
        }, 3000);
      },
      error: (error) => {
        console.error('❌ Error saving order:', error);
        this.toastr.error('Erreur lors de l\'enregistrement du paiement.');
        this.isLoading = false;
        this.paymentSuccess = false;
      }
    });
  }

  startCountdown() {
    const interval = setInterval(() => {
      this.count--;

      if (this.count < 0) {
        clearInterval(interval);
        this.goToBookings();
      }
    }, 5000);
  }

  goToBookings() {
    this.router.navigate(['/dashboard/client/bookings']);
  }

  goToHome() {
    this.router.navigate(['/dashboard/client/list']);
  }
}
