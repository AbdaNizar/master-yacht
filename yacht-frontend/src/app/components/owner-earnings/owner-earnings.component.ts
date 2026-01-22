import {Component, OnInit} from '@angular/core';
import Chart from 'chart.js/auto';
import {HeaderComponent} from '../header/header.component';
import {HttpClient} from '@angular/common/http';
import {OrderService} from '../../services/orderService/order.service';
import {getUrl} from '../../constants/functions';

@Component({
  selector: 'app-owner-earnings',
  imports: [
    HeaderComponent
],
  templateUrl: './owner-earnings.component.html',
  standalone: true,
  styleUrl: './owner-earnings.component.css'
})
export class OwnerEarningsComponent implements OnInit {
  totalEarnings: number = 0;
  yachtEarnings: any[] = [];
  currentImage: any[] = [];
  yachtImages: any = {};

  constructor(private http: HttpClient , private orderService : OrderService) {}

  ngOnInit() {
    this.fetchEarnings();
  }

  fetchEarnings() {
    this.orderService.ownerEarnings().subscribe(response => {
      this.totalEarnings = response.totalEarnings;
      this.yachtEarnings = Object.keys(response.yachts).map(yachtName => ({
        name: yachtName,
        images: response.yachts[yachtName].images,
        reservations: response.yachts[yachtName].reservations,
        totalRevenue: response.yachts[yachtName].totalRevenue
      }));
      this.yachtEarnings.forEach((yacht, index) => {
        let currentIndex = 0;
        this.currentImage[index] = yacht.images[0];
        setInterval(() => {
          currentIndex = (currentIndex + 1) % yacht.images.length;
          this.currentImage[index] = yacht.images[currentIndex];
        }, 5000);
      });
      this.renderChart();
    });
  }

  renderChart() {
    const ctx = document.getElementById('earningsChart') as HTMLCanvasElement;
    if (ctx) {
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: this.yachtEarnings.map(yacht => yacht.name),
          datasets: [{
            label: 'Revenus (DT)',
            data: this.yachtEarnings.map(yacht => yacht.totalRevenue),
            backgroundColor: 'rgba(99, 102, 241, 0.8)',
            borderColor: '#6366F1',
            borderWidth: 2,
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              titleColor: 'white',
              bodyColor: 'white',
              padding: 12,
              cornerRadius: 8,
              displayColors: false,
              callbacks: {
                label: function(context) {
                  return `Revenu: ${context.parsed.y} DT`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: {
                display: false
              },
              ticks: {
                color: 'rgba(255, 255, 255, 0.7)',
                font: {
                  size: 12,
                  family: "'Inter', sans-serif",
                  weight: 600
                }
              }
            },
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(255, 255, 255, 0.05)',

              },
              ticks: {
                color: 'rgba(255, 255, 255, 0.7)',
                font: {
                  size: 12,
                  family: "'Inter', sans-serif",
                  weight: 600
                },
                callback: function(value) {
                  return value + ' DT';
                }
              }
            }
          }
        }
      });
    }
  }

  protected readonly getUrl = getUrl;
}
