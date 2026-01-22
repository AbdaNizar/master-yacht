import { Injectable } from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {getUrl} from '../../constants/functions';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private userSubject: BehaviorSubject<any>;
  public user$: Observable<any>;

  constructor() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    this.userSubject = new BehaviorSubject<any>(user);
    this.user$ = this.userSubject.asObservable();
  }
  setUser(user: any): void {
    this.userSubject.next(user);
    if (user) {
      if(user.image){
        user.image = getUrl(user.image)
      }
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }
  getUser(): any {
    return this.userSubject.value;
  }
  isAuthenticated(): boolean {
    return !!(localStorage.getItem('jwt') || localStorage.getItem('token'));
  }

  logout(): void {
    this.setUser(null);
    localStorage.removeItem('jwt');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}
