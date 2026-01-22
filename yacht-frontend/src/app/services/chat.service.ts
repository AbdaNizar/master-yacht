import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

export interface Message {
  _id: string;
  conversation: string;
  sender: any;
  receiver: any;
  content: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  _id: string;
  participants: any[];
  booking?: any;
  yacht?: any;
  lastMessage?: Message;
  lastMessageAt: Date;
  unreadCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TypingEvent {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = 'http://localhost:3001/chat';
  private wsUrl = 'ws://localhost:3001/api/';
  private socket$: WebSocketSubject<any> | null = null;
  private pingInterval: any;
  private currentToken: string = '';
  
  // Paramètres de reconnexion
  private reconnectionAttempts = 0;
  private readonly maxReconnectionAttempts = 5;
  private readonly reconnectionDelay = 3000; // 3 secondes
  private isReconnecting = false;

  // Observables publics
  public unreadCount$ = new BehaviorSubject<number>(0);
  public newMessage$ = new BehaviorSubject<Message | null>(null);
  public typing$ = new Subject<TypingEvent>();
  public connectionStatus$ = new BehaviorSubject<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  public messageDeleted$ = new Subject<{ messageId: string; conversationId: string }>();
  public messagesRead$ = new Subject<{ conversationId: string; count: number }>();

  // Protection contre les duplications
  private processedMessageIds = new Set<string>();
  private readonly MESSAGE_CACHE_DURATION = 5000; // 5 secondes

  constructor(private http: HttpClient) {}

  /**
   * Connecte le WebSocket avec reconnexion automatique
   */
  connectWebSocket(token: string): void {
    if (this.socket$ && !this.isReconnecting) {
      console.log('WebSocket déjà connecté');
      return;
    }

    this.currentToken = token;
    this.isReconnecting = false;

    console.log('🔌 Connexion WebSocket Chat...');

    this.socket$ = webSocket({
      url: `${this.wsUrl}?token=${token}`,
      deserializer: msg => JSON.parse(msg.data),
      serializer: msg => JSON.stringify(msg),
      openObserver: {
        next: () => {
          console.log('✅ WebSocket Chat connecté');
          this.connectionStatus$.next('connected');
          this.reconnectionAttempts = 0;
          this.isReconnecting = false;
          this.startPingInterval();
        }
      },
      closeObserver: {
        next: () => {
          console.log('❌ WebSocket Chat déconnecté');
          this.connectionStatus$.next('disconnected');
          this.stopPingInterval();
          this.handleReconnection();
        }
      }
    });

    this.subscribeToMessages();
  }

  /**
   * S'abonne aux messages WebSocket
   */
  private subscribeToMessages(): void {
    if (!this.socket$) return;

    this.socket$.subscribe({
      next: (message) => {
        this.handleWebSocketMessage(message);
      },
      error: (err) => {
        console.error('🔴 WebSocket error:', err);
        this.connectionStatus$.next('disconnected');
        this.handleReconnection();
      },
      complete: () => {
        console.log('WebSocket connection closed');
        this.connectionStatus$.next('disconnected');
      }
    });
  }

  /**
   * Gère les différents types de messages WebSocket
   */
  private handleWebSocketMessage(message: any): void {
    switch (message.type) {
      case 'connected':
        console.log('✅ WebSocket: Message de bienvenue reçu');
        break;

      case 'new_message':
        const msg = message.data;
        
        // Vérifier si ce message a déjà été traité
        if (this.processedMessageIds.has(msg._id)) {
          console.log('🔄 Message dupliqué ignoré:', msg._id);
          return;
        }

        // Marquer comme traité
        this.processedMessageIds.add(msg._id);
        
        // Retirer de la cache après la durée définie
        setTimeout(() => {
          this.processedMessageIds.delete(msg._id);
        }, this.MESSAGE_CACHE_DURATION);

        console.log('📨 Nouveau message reçu:', msg);
        this.newMessage$.next(msg);
        this.loadUnreadCount();
        break;

      case 'typing':
        console.log('⌨️ Événement de frappe:', message.data);
        this.typing$.next(message.data);
        break;

      case 'message_deleted':
        console.log('🗑️ Message supprimé:', message.data);
        this.messageDeleted$.next(message.data);
        break;

      case 'messages_read':
        console.log('👀 Messages lus:', message.data);
        this.messagesRead$.next(message.data);
        break;

      case 'pong':
        // Réponse au ping - connexion active
        break;

      default:
        console.warn('⚠️ Type de message WebSocket inconnu:', message.type);
    }
  }

  /**
   * Gère la reconnexion automatique
   */
  private handleReconnection(): void {
    if (this.isReconnecting || !this.currentToken) {
      return;
    }

    if (this.reconnectionAttempts >= this.maxReconnectionAttempts) {
      console.error(`❌ Impossible de se reconnecter après ${this.maxReconnectionAttempts} tentatives`);
      this.connectionStatus$.next('disconnected');
      return;
    }

    this.isReconnecting = true;
    this.reconnectionAttempts++;
    this.connectionStatus$.next('reconnecting');

    const delay = this.reconnectionDelay * this.reconnectionAttempts;
    console.log(`🔄 Tentative de reconnexion ${this.reconnectionAttempts}/${this.maxReconnectionAttempts} dans ${delay}ms...`);

    setTimeout(() => {
      this.socket$ = null;
      this.connectWebSocket(this.currentToken);
    }, delay);
  }

  /**
   * Démarre l'intervalle de ping pour maintenir la connexion
   */
  private startPingInterval(): void {
    this.stopPingInterval();
    
    this.pingInterval = setInterval(() => {
      if (this.socket$ && this.connectionStatus$.value === 'connected') {
        try {
          this.socket$.next({ type: 'ping' });
        } catch (error) {
          console.error('Erreur lors de l\'envoi du ping:', error);
        }
      }
    }, 30000); // 30 secondes
  }

  /**
   * Arrête l'intervalle de ping
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Déconnecte le WebSocket
   */
  disconnectWebSocket(): void {
    console.log('🔌 Déconnexion WebSocket...');
    this.stopPingInterval();
    
    if (this.socket$) {
      this.socket$.complete();
      this.socket$ = null;
    }
    
    this.currentToken = '';
    this.reconnectionAttempts = 0;
    this.isReconnecting = false;
    this.processedMessageIds.clear();
    this.connectionStatus$.next('disconnected');
  }

  /**
   * Charge le nombre de messages non lus
   */
  loadUnreadCount(): void {
    this.getUnreadCount().subscribe({
      next: (response) => {
        if (response.success) {
          this.unreadCount$.next(response.data.unreadCount);
        }
      },
      error: (err) => {
        console.error('Erreur lors du chargement du compteur non lu:', err);
      }
    });
  }

  // ==================== API HTTP ====================

  getConversations(): Observable<any> {
    return this.http.get(`${this.apiUrl}/conversations`);
  }

  getOrCreateConversation(participantId: string, bookingId?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/conversations`, { participantId, bookingId });
  }

  getMessages(conversationId: string, page: number = 1, limit: number = 50): Observable<any> {
    return this.http.get(`${this.apiUrl}/conversations/${conversationId}/messages?page=${page}&limit=${limit}`);
  }

  sendMessage(conversationId: string, content: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/messages`, { conversationId, content });
  }

  markAsRead(conversationId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/conversations/${conversationId}/read`, {});
  }

  getUnreadCount(): Observable<any> {
    return this.http.get(`${this.apiUrl}/unread-count`);
  }

  deleteMessage(messageId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/messages/${messageId}`);
  }

  notifyTyping(conversationId: string, isTyping: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}/typing`, { conversationId, isTyping });
  }

  /**
   * Retourne l'état de la connexion
   */
  isConnected(): boolean {
    return this.connectionStatus$.value === 'connected';
  }

  /**
   * Force une reconnexion
   */
  forceReconnect(): void {
    if (this.currentToken) {
      this.disconnectWebSocket();
      this.connectWebSocket(this.currentToken);
    }
  }

  /**
   * Nettoie le cache de messages traités (utile pour les tests)
   */
  clearMessageCache(): void {
    this.processedMessageIds.clear();
  }
}
