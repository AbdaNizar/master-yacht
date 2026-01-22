import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button 
      [type]="type"
      [disabled]="loading || disabled"
      [class]="buttonClass"
      (click)="handleClick($event)">
      <span *ngIf="!loading" class="button-content">
        <ng-content></ng-content>
        <i *ngIf="icon" [class]="icon"></i>
      </span>
      <span *ngIf="loading" class="loader-container">
        <span class="circle-loader">
          <i class="fas fa-ship boat-icon"></i>
        </span>
      </span>
    </button>
  `,
  styles: [`
    button {
      width: 100%;
      padding: var(--space-lg);
      background: var(--primary-gradient);
      color: white;
      border: none;
      border-radius: var(--radius-lg);
      font-size: 1.125rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-md);
      transition: all var(--transition-base);
      box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
      margin-top: var(--space-md);
      position: relative;
      overflow: hidden;
    }

    button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(99, 102, 241, 0.5);
    }

    button:active:not(:disabled) {
      transform: translateY(0);
    }

    button:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .button-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-md);
    }

    .loader-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    .circle-loader {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 255, 255, 0.2);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .boat-icon {
      position: absolute;
      font-size: 18px;
      color: white;
      animation: float 1.5s ease-in-out infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes float {
      0%, 100% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-8px);
      }
    }
  `]
})
export class ButtonLoaderComponent {
  @Input() loading: boolean = false;
  @Input() disabled: boolean = false;
  @Input() type: string = 'button';
  @Input() icon: string = '';
  @Input() buttonClass: string = 'btn-primary';

  handleClick(event: Event) {
    if (this.loading || this.disabled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
