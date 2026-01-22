import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/authService/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-not-found',
  imports: [CommonModule],
  templateUrl: './page-not-found.component.html',
  standalone: true,
  styleUrl: './page-not-found.component.css'
})
export class PageNotFoundComponent implements OnInit {
  isAuthenticated: boolean = false;
  userRole: string = '';

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Check if user is authenticated
    const user = this.authService.getUser();
    this.isAuthenticated = !!user;
    this.userRole = user?.role || '';
  }

  getBackButtonText(): string {
    if (!this.isAuthenticated) {
      return 'Retour à l\'accueil';
    }

    switch (this.userRole) {
      case 'admin':
        return 'Retour au Dashboard Admin';
      case 'owner':
        return 'Retour au Dashboard Propriétaire';
      case 'client':
        return 'Retour au Dashboard Client';
      default:
        return 'Retour à l\'accueil';
    }
  }

  goBack(): void {
    if (!this.isAuthenticated) {
      this.router.navigate(['/login']);
      return;
    }

    switch (this.userRole) {
      case 'admin':
        this.router.navigate(['/dashboard/admin']);
        break;
      case 'owner':
        this.router.navigate(['/dashboard/owner/list']);
        break;
      case 'client':
        this.router.navigate(['/dashboard/client/list']);
        break;
      default:
        this.router.navigate(['/login']);
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }
}
