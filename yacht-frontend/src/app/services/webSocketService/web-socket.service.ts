import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {AuthService} from '../authService/auth.service';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private notificationSocket: WebSocket | undefined;
  private notificationSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  public notificationSubject$ = this.notificationSubject.asObservable();

  private reconnectInterval = 5000;
  private isManuallyClosed = false;
   user : any

  constructor( private authService :AuthService) {
    this.initializeNotificationWebSocket();
      authService.user$.subscribe((user) => {
      this.user = user;
    });
  }

  private initializeNotificationWebSocket(): void {
    this.notificationSocket = new WebSocket('ws://localhost:3001/api/');

    this.notificationSocket.addEventListener('open', () => {
      console.log('✅ Notification WebSocket connection established');
    });

    this.notificationSocket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      console.log('event.data',event.data)
      if (message.notification !== undefined && message.notification !== null) {
        console.log('message.notification?.user',message.notification)
        if (message.notification.user.toString() == this.user.id.toString()) {
          console.log('🔔 New notification for user:', message.notification);
          this.notificationSubject.next(message.notification);
        } else {
          console.log('❌ Ignoring notification (not for this user)', message.notification);
        }
      }
    });

    this.notificationSocket.addEventListener('close', () => {

      if (!this.isManuallyClosed) {
        this.reconnectWebSocket();
      }
    });

    this.notificationSocket.addEventListener('error', (error) => {
      console.error('⚠️ Notification WebSocket error:', error);
    });
  }

  private reconnectWebSocket(): void {
    console.log(`🔄 Reconnecting WebSocket in ${this.reconnectInterval / 1000} seconds...`);
    setTimeout(() => {
      if (!this.isManuallyClosed) {
        this.initializeNotificationWebSocket();
      }
    }, this.reconnectInterval);
  }

  public closeWebSocket(): void {
    this.isManuallyClosed = true;
    if (this.notificationSocket) {
      this.notificationSocket.close();
    }
  }

  public clearNotification(): void {
    this.notificationSubject.next(null);
  }
}
