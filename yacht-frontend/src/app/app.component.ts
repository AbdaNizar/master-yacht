import {Component, OnInit, OnDestroy, ChangeDetectorRef, AfterViewInit} from '@angular/core';
import {Router, RouterOutlet, NavigationEnd} from '@angular/router';
import {SidebarComponent} from './helpers/sidebar/sidebar.component';
import {HeaderComponent} from './components/header/header.component';
import {SidebarService} from './services/sidebarService/sidebar.service';
import {ChatService} from './services/chat.service';
import {AuthService} from './services/authService/auth.service';
import {Subscription} from 'rxjs';
import {CommonModule} from '@angular/common';
import {filter} from 'rxjs/operators';
import {ToastContainerComponent} from './components/toast-container/toast-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent, CommonModule, ToastContainerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy, AfterViewInit {
  title = 'yacht-frontend';
  showSidebar: boolean = false;
  isSidebarCollapsed: boolean = false;
  private subscription: Subscription = new Subscription();

  constructor(
    private router: Router,
    private sidebarService: SidebarService,
    private chatService: ChatService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.checkRoute();

    this.subscription.add(
      this.router.events
        .pipe(filter(event => event instanceof NavigationEnd))
        .subscribe(() => {
          this.checkRoute();
          setTimeout(() => {
            this.cdr.detectChanges();
          }, 100);
        })
    );

    this.subscription.add(
      this.sidebarService.isCollapsed$.subscribe((collapsed) => {
        this.isSidebarCollapsed = collapsed;
        this.cdr.markForCheck();
        setTimeout(() => {
          this.cdr.detectChanges();
        }, 0);
      })
    );

    setTimeout(() => {
      const token = localStorage.getItem('token') || localStorage.getItem('jwt');
      if (token && this.authService.isAuthenticated()) {
        this.chatService.connectWebSocket(token);
        this.chatService.loadUnreadCount();
      }
    }, 500);
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  private checkRoute(): void {
    const currentRoute = this.router.url;
    this.showSidebar = !['/login', '/register', '/not-found', '/'].includes(currentRoute)
                       && !currentRoute.includes('not-found')
                       && currentRoute !== '/';
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.chatService.disconnectWebSocket();
  }
}
