import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../services/toast.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.css'
})
export class ToastContainerComponent {
  toasts: Toast[] = [];

  constructor(
    private toastService: ToastService,
    private router: Router
  ) {
    this.toastService.toasts$.subscribe(toasts => {
      this.toasts = toasts;
    });
  }

  removeToast(id: string): void {
    this.toastService.remove(id);
  }

  onToastClick(toast: Toast): void {
    if (toast.url) {
      this.router.navigate([toast.url]);
      this.removeToast(toast.id);
    }
  }

  getIcon(type: string): string {
    const icons: { [key: string]: string } = {
      success: '✓',
      error: '✖',
      info: 'ℹ',
      warning: '⚠',
      recommendation: '🤖'
    };
    return icons[type] || 'ℹ';
  }
}
