import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning' | 'recommendation';
  duration: number;
  url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  public toasts$ = this.toastsSubject.asObservable();
  
  // Cache pour éviter les duplications
  private recentToasts = new Set<string>();
  private readonly DUPLICATE_THRESHOLD = 2000; // 2 secondes

  show(options: { message: string; type?: 'success' | 'error' | 'info' | 'warning' | 'recommendation'; duration?: number; url?: string } | string, type?: 'success' | 'error' | 'info' | 'warning' | 'recommendation', duration?: number): void {
    let toast: Toast;
    
    if (typeof options === 'string') {
      const id = this.generateId();
      toast = { 
        id, 
        message: options, 
        type: type || 'info', 
        duration: duration || 3000 
      };
    } else {
      const id = this.generateId();
      toast = { 
        id, 
        message: options.message, 
        type: options.type || 'info', 
        duration: options.duration || 3000,
        url: options.url
      };
    }

    // Créer une clé unique basée sur le message et le type
    const toastKey = `${toast.message}-${toast.type}`;
    
    // Vérifier si un toast identique a été affiché récemment
    if (this.recentToasts.has(toastKey)) {
      console.log('Toast dupliqué ignoré:', toastKey);
      return;
    }

    // Ajouter à la liste des toasts récents
    this.recentToasts.add(toastKey);
    
    // Retirer de la liste après le seuil de duplication
    setTimeout(() => {
      this.recentToasts.delete(toastKey);
    }, this.DUPLICATE_THRESHOLD);

    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next([...currentToasts, toast]);

    setTimeout(() => {
      this.remove(toast.id);
    }, toast.duration);
  }

  remove(id: string): void {
    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next(currentToasts.filter(t => t.id !== id));
  }

  success(message: string, duration: number = 3000): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration: number = 3000): void {
    this.show(message, 'error', duration);
  }

  info(message: string, duration: number = 3000): void {
    this.show(message, 'info', duration);
  }

  warning(message: string, duration: number = 3000): void {
    this.show(message, 'warning', duration);
  }

  /**
   * Nettoie tous les toasts
   */
  clear(): void {
    this.toastsSubject.next([]);
    this.recentToasts.clear();
  }

  clearOnLogout(): void {
    this.clear();
  }

  private generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
