import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { YachtService } from '../../services/yachtService/yacht.service';
import { AuthService } from '../../services/authService/auth.service';
import { getUrl } from '../../constants/functions';

interface Review {
  _id: string;
  client: {
    name: string;
    image: string;
  };
  rating: number;
  comment: string;
  yacht: {
    name: string;
  };
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit, OnDestroy {
  stats = [
    { icon: 'fa-ship', number: '500+', label: 'Yachts de Luxe' },
    { icon: 'fa-users', number: '10K+', label: 'Clients Satisfaits' },
    { icon: 'fa-globe', number: '50+', label: 'Destinations' },
    { icon: 'fa-star', number: '4.9', label: 'Note Moyenne' }
  ];

  features = [
    {
      icon: 'fa-search',
      title: 'Recherche Intelligente',
      description: 'Trouvez le yacht parfait grâce à notre système de recommandation IA'
    },
    {
      icon: 'fa-calendar-check',
      title: 'Réservation Facile',
      description: 'Réservez en quelques clics avec confirmation instantanée'
    },
    {
      icon: 'fa-lock',
      title: 'Paiement Sécurisé',
      description: 'Transactions 100% sécurisées avec Stripe'
    },
    {
      icon: 'fa-comments',
      title: 'Support 24/7',
      description: 'Chat en temps réel avec les propriétaires et notre équipe'
    },
    {
      icon: 'fa-mobile-alt',
      title: 'Application Mobile',
      description: 'Gérez vos réservations partout, à tout moment'
    },
    {
      icon: 'fa-certificate',
      title: 'Qualité Garantie',
      description: 'Tous nos yachts sont vérifiés et certifiés'
    }
  ];

  testimonials: Review[] = [];
  currentTestimonial = 0;
  isScrolled = false;
  isLoggedIn = false;
  currentUser: any = null;
  showUserMenu = false;
  private carouselInterval: any;

  constructor(
    private router: Router,
    private yachtService: YachtService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.checkAuth();
    this.loadReviews();
    this.carouselInterval = setInterval(() => {
      if (this.testimonials.length > 0) {
        this.currentTestimonial = (this.currentTestimonial + 1) % this.testimonials.length;
      }
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
    }
  }

  checkAuth(): void {
    this.isLoggedIn = this.authService.isAuthenticated();
    if (this.isLoggedIn) {
      this.currentUser = this.authService.getUser();
    }
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  goToDashboard(): void {
    if (this.currentUser) {
      this.router.navigate([`/dashboard/${this.currentUser.role}/list`]);
    }
  }

  logout(): void {
    this.authService.logout();
    this.isLoggedIn = false;
    this.currentUser = null;
    this.showUserMenu = false;
    this.router.navigate(['/']);
  }

  loadReviews(): void {
    this.yachtService.getPublicYachts().subscribe({
      next: (yachts: any[]) => {
        const allReviews: Review[] = [];

        yachts.forEach(yacht => {
          if (yacht.reviews && yacht.reviews.length > 0) {
            yacht.reviews.forEach((review: any) => {
              if (review.rating >= 4 && review.comment && review.comment.trim().length > 0) {
                allReviews.push({
                  _id: review._id,
                  client: review.client,
                  rating: review.rating,
                  comment: review.comment,
                  yacht: {
                    name: yacht.name
                  }
                });
              }
            });
          }
        });

        allReviews.sort((a, b) => b.rating - a.rating);

        this.testimonials = allReviews.slice(0, 10);

        if (this.testimonials.length === 0) {
          this.testimonials = [];
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement des avis:', error);
        this.testimonials = [];
      }
    });
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.isScrolled = window.scrollY > 50;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-container')) {
      this.showUserMenu = false;
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  getStarArray(rating: number): number[] {
    return Array(rating).fill(0);
  }

  getClientAvatar(image: string): string {
    return image ? getUrl(image) : 'assets/default-avatar.png';
  }

  getUserAvatar(): string {
    return this.currentUser?.image ? getUrl(this.currentUser.image) : 'assets/default-avatar.png';
  }

  protected readonly getUrl = getUrl;
}
