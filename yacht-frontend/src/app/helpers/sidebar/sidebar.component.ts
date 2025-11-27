import {Component, OnInit} from '@angular/core';
import {MENU_ITEMS} from '../../constants/menu-items';
import {Role} from '../../constants/Role.enum';
import {AuthService} from '../../services/authService/auth.service';
import {User} from '../../constants/User';
import {RouterLink} from '@angular/router';

import {getUrl, getUrlToSideBar} from '../../constants/functions';

@Component({
  selector: 'app-sidebar',
  imports: [
    RouterLink
],
  templateUrl: './sidebar.component.html',
  standalone: true,
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {
  role: Role = Role.CLIENT;
  user: any = User;

  menuItems: Array<{ name: string; route: string }> = [];
  constructor(private authService: AuthService) {}

  ngOnInit(): void {

    this.authService.user$.subscribe((user) => {
      this.user = user;
      this.role = user?.role
    });
    this.menuItems = MENU_ITEMS[this.role] || [];
  }

  logout(): void {
    localStorage.removeItem('user');
    localStorage.removeItem('jwt');
    window.location.href = '/login';
  }

  protected readonly getUrlToSideBar = getUrlToSideBar;
  protected readonly getUrl = getUrl;
}
