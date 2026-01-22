import {Component, OnInit, OnDestroy, ChangeDetectorRef} from '@angular/core';
import {MENU_ITEMS} from '../../constants/menu-items';
import {Role} from '../../constants/Role.enum';
import {AuthService} from '../../services/authService/auth.service';
import {SidebarService} from '../../services/sidebarService/sidebar.service';
import {User} from '../../constants/User';
import {Router, RouterLink} from '@angular/router';
import {CommonModule} from '@angular/common';
import {Subscription} from 'rxjs';
import {getUrl, getUrlToSideBar} from '../../constants/functions';
import {ChatService} from '../../services/chat.service';
import {ToastService} from '../../services/toast.service';

@Component({
  selector: 'app-sidebar',
  imports: [
    RouterLink,
    CommonModule
  ],
  templateUrl: './sidebar.component.html',
  standalone: true,
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit, OnDestroy {
  role: Role = Role.CLIENT;
  user: any = User;
  isCollapsed: boolean = false;
  isMobileOpen: boolean = false;

  menuItems: Array<{ name: string; route: string; icon: string }> = [];
  private subscriptions: Subscription = new Subscription();

  constructor(
    private router: Router,
    private authService: AuthService,
    private sidebarService: SidebarService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.authService.user$.subscribe((user) => {
        this.user = user;
        this.role = user?.role;
        this.menuItems = MENU_ITEMS[this.role] || [];
      })
    );

    this.subscriptions.add(
      this.sidebarService.isCollapsed$.subscribe((collapsed) => {
        this.isCollapsed = collapsed;
      })
    );

    this.subscriptions.add(
      this.sidebarService.isMobileOpen$.subscribe((open) => {
        this.isMobileOpen = open;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  toggleSidebar(): void {
    this.sidebarService.toggle();
  }

  toggleMobileSidebar(): void {
    this.sidebarService.toggleMobile();
  }

  closeMobileSidebar(): void {
    this.sidebarService.closeMobile();
  }

  onMenuItemClick(): void {
    // Ferme le menu mobile après avoir cliqué sur un élément
    if (window.innerWidth <= 1024) {
      this.closeMobileSidebar();
    }
  }

  logout(): void {
    this.authService.logout();
    this.toastService.clearOnLogout();
    localStorage.removeItem('sidebarCollapsed');
    this.closeMobileSidebar();
    this.router.navigate(['/']);
  }

  protected readonly getUrlToSideBar = getUrlToSideBar;
  protected readonly getUrl = getUrl;
}
