import { Component, OnInit } from '@angular/core';
import { NotificationService } from '../../services/notificationService/notification.service';
import { WebSocketService } from '../../services/webSocketService/web-socket.service';
import { DatePipe } from '@angular/common';
import {ToastrModule, ToastrService} from 'ngx-toastr';
import {getUrl} from '../../constants/functions';
import {Router} from '@angular/router';
import {HttpClient} from '@angular/common/http';
import {FormsModule} from '@angular/forms';
import {WeatherService} from '../../services/weatherService/weather.service';

@Component({
  selector: 'app-header',
  imports: [DatePipe, ToastrModule, FormsModule],
  templateUrl: './header.component.html',
  standalone: true,
  styleUrl: './header.component.css',
})
export class HeaderComponent implements OnInit{
  notifications: any[] = [];
  unreadCount: number = 0;
  showNotifications: boolean = false;
  weatherData: any = null;
  searchTerm = '';
  selectedCountryFlag = '';
  filteredCountries: any[] = [];
  countries: any[] = [];
  isLoading = false;
  showWeather = false;
  constructor(
    private notificationService: NotificationService,
    private webSocketService: WebSocketService,
    private toastrService: ToastrService ,
    private weatherService: WeatherService ,
    private router: Router,private http: HttpClient) {
    this.loadCountries()
  }

  ngOnInit(): void {
    this.loadNotifications();

    this.webSocketService.notificationSubject$.subscribe((notification) => {
      if (notification) {
        this.notifications.unshift(notification);
        this.unreadCount++;
        this.showToast(notification);
        console.log('hereee')
      }
    });
  }

  loadNotifications(): void {
    this.notificationService.getNotifications().subscribe((data) => {
      this.notifications = data;
      this.unreadCount = this.notifications.filter((n) => !n.read).length;
    });
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    this.showWeather =false;
  }

  goToNotification(notification: any): void {
    if (!notification.read) {
      this.notificationService.markAsRead(notification._id).subscribe(() => {
        notification.read = true;
        this.unreadCount--;
      });
    }
      this.router.navigate([notification.url]);
  }

  markAllAsRead(event: Event): void {
    event.stopPropagation();
    this.notificationService.markAllAsRead().subscribe(() => {
      this.unreadCount = 0;
      this.notifications.forEach((notification) => (notification.read = true));
      this.toggleNotifications()
    });

  }


  private showToast(notification: any): void {
    const toastrContent = `<div>${notification.message}</div>`;
    const bgToster = 'bg-client';

    this.toastrService.show(toastrContent, '', {
      onActivateTick: true,
      timeOut: 5000,
      extendedTimeOut: 5000,
      enableHtml: true,
      positionClass: 'toast-top-right',
      closeButton: true,
      progressBar: true,
      toastClass: bgToster,
    });
  }


  toggleWeather() {
    this.showWeather = !this.showWeather;
    this.showNotifications = false;
    if (!this.showWeather){
      this.searchTerm ='';
      this.weatherData =null;
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
    console.log('this.filteredCountries',this.filteredCountries)
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
