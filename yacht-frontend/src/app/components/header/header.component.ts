import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { NotificationService } from '../../services/notificationService/notification.service';
import { WebSocketService } from '../../services/webSocketService/web-socket.service';
import { ChatService } from '../../services/chat.service';
import { DatePipe } from '@angular/common';
import {getUrl} from '../../constants/functions';
import {Router} from '@angular/router';
import {HttpClient} from '@angular/common/http';
import {FormsModule} from '@angular/forms';
import {WeatherService} from '../../services/weatherService/weather.service';
import {ToastService} from '../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {
  notifications: any[] = [];
  unreadCount: number = 0;
  unreadChatCount: number = 0;
  showNotifications: boolean = false;
  weatherData: any = null;
  searchTerm = '';
  selectedCountryFlag = '';
  filteredCountries: any[] = [];
  countries: any[] = [];
  isLoading = false;
  showWeather = false;

  private chatSubscription: Subscription | null = null;

  constructor(
    private notificationService: NotificationService,
    private webSocketService: WebSocketService,
    private toastService: ToastService,
    private weatherService: WeatherService,
    private chatService: ChatService,
    private router: Router,
    private http: HttpClient
  ) {
    this.loadCountries();
  }

  ngOnInit(): void {
    this.loadNotifications();
    this.loadChatUnreadCount();

    this.webSocketService.notificationSubject$.subscribe((notification) => {
      if (notification) {
        this.notifications.unshift(notification);
        this.unreadCount++;
        this.showToast(notification);
      }
    });

    this.chatSubscription = this.chatService.unreadCount$.subscribe(count => {
      this.unreadChatCount = count;
    });

    const userId = JSON.parse(localStorage.getItem('user') || '{}').id;
    this.chatService.newMessage$.subscribe(message => {
      if (message && message.sender !== userId && message.sender._id !== userId && message.sender.id !== userId) {
        this.toastService.show({
          type: 'info',
          message: 'Nouveau message reçu',
          duration: 4000
        });
      }
    });
  }

  ngOnDestroy(): void {
    if (this.chatSubscription) {
      this.chatSubscription.unsubscribe();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const notificationIcon = document.querySelector('.notification-icon');
    const notificationDropdown = document.querySelector('.notification-dropdown');
    const weatherIcon = document.querySelector('.weather-icon');
    const weatherDropdown = document.querySelector('.weather-dropdown');
    const chatIcon = document.querySelector('.chat-icon');

    if (chatIcon && chatIcon.contains(target)) {
      return;
    }

    if (this.showNotifications && notificationIcon && notificationDropdown) {
      if (!notificationIcon.contains(target) && !notificationDropdown.contains(target)) {
        this.showNotifications = false;
      }
    }

    if (this.showWeather && weatherIcon && weatherDropdown) {
      if (!weatherIcon.contains(target) && !weatherDropdown.contains(target)) {
        this.showWeather = false;
      }
    }
  }

  loadChatUnreadCount(): void {
    this.chatService.loadUnreadCount();
  }

  goToChat(event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/dashboard/chat']);
  }

  loadNotifications(): void {
    this.notificationService.getNotifications().subscribe((data) => {
      this.notifications = data;
      this.unreadCount = this.notifications.filter((n) => !n.read).length;
    });
  }

  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
    this.showWeather = false;
  }

  goToNotification(notification: any): void {
    if (!notification.read) {
      this.notificationService.markAsRead(notification._id).subscribe(() => {
        notification.read = true;
        this.unreadCount--;
      });
    }
    this.showNotifications = false;
    this.router.navigate([notification.url]);
  }

  markAllAsRead(event: Event): void {
    event.stopPropagation();
    this.notificationService.markAllAsRead().subscribe(() => {
      this.unreadCount = 0;
      this.notifications.forEach((notification) => (notification.read = true));
    });
  }

  private showToast(notification: any): void {
    let type: 'success' | 'error' | 'info' | 'warning' | 'recommendation' = 'info';

    if (notification.type === 'ai_recommendation') {
      type = 'recommendation';
    } else if (notification.type === 'booking_confirmed' || notification.type === 'payment_received') {
      type = 'success';
    } else if (notification.type === 'booking_cancelled' || notification.type === 'booking_rejected') {
      type = 'error';
    } else if (notification.type === 'payment_reminder' || notification.type === 'booking_ending_soon') {
      type = 'warning';
    }

    this.toastService.show({
      type: type,
      message: notification.message,
      url: notification.url,
      duration: 6000
    });
  }

  toggleWeather(event: Event) {
    event.stopPropagation();
    this.showWeather = !this.showWeather;
    this.showNotifications = false;
    if (!this.showWeather) {
      this.searchTerm = '';
      this.weatherData = null;
    }
  }

  async loadCountries() {
    try {
      const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,flags', {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.countries = data.map((c: any) => ({
        name: c.name.common,
        code: c.cca2,
        flag: c.flags.svg
      }));
    } catch (error) {
      console.error('Error loading countries:', error);
    }
  }

  filterCountries() {
    this.filteredCountries = this.searchTerm
      ? this.countries.filter(c => c.name.toLowerCase().includes(this.searchTerm.toLowerCase()))
      : [];
  }

  selectCountry(country: any) {
    this.searchTerm = country.name;
    this.selectedCountryFlag = country.flag;
    this.filteredCountries = [];
    this.getWeather(country.name);
  }

  getWeather(country: string) {
    this.isLoading = true;
    this.weatherData = null;

    this.weatherService.getWeather(country).subscribe(
      (response: any) => {
        setTimeout(() => {
          this.isLoading = false;
          this.weatherData = {
            name: response.name,
            country: response.sys.country,
            temp: response.main.temp,
            description: response.weather[0].description,
            humidity: response.main.humidity,
            windSpeed: response.wind.speed,
            icon: `https://openweathermap.org/img/wn/${response.weather[0].icon}.png`
          };
        }, 2000);
      },
      (error) => {
        console.error('Erreur météo:', error);
        this.weatherData = null;
        this.isLoading = false;
      }
    );
  }

  protected readonly getUrl = getUrl;
}
