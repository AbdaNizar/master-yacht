import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private collapsedSubject = new BehaviorSubject<boolean>(false);
  public isCollapsed$ = this.collapsedSubject.asObservable();
  
  private mobileOpenSubject = new BehaviorSubject<boolean>(false);
  public isMobileOpen$ = this.mobileOpenSubject.asObservable();

  constructor() {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      this.collapsedSubject.next(JSON.parse(savedState));
    }
  }

  toggle(): void {
    const newState = !this.collapsedSubject.value;
    this.collapsedSubject.next(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  }

  setCollapsed(collapsed: boolean): void {
    this.collapsedSubject.next(collapsed);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(collapsed));
  }

  getState(): boolean {
    return this.collapsedSubject.value;
  }

  // Mobile menu management
  openMobile(): void {
    this.mobileOpenSubject.next(true);
  }

  closeMobile(): void {
    this.mobileOpenSubject.next(false);
  }

  toggleMobile(): void {
    this.mobileOpenSubject.next(!this.mobileOpenSubject.value);
  }

  getMobileState(): boolean {
    return this.mobileOpenSubject.value;
  }
}
