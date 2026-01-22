import { Injectable } from '@angular/core';
import { ToastService } from '../toast.service';

export interface ChatError {
  code: string;
  message: string;
  context?: string;
  details?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ChatErrorService {
  
  constructor(private toastService: ToastService) {}

  /**
   * Gère les erreurs du système de chat
   */
  handleError(error: any, context: string): void {
    console.error(`🔴 Chat Error [${context}]:`, error);
    
    const chatError = this.parseError(error, context);
    this.logError(chatError);
    this.notifyUser(chatError);
  }

  /**
   * Parse l'erreur en format standardisé
   */
  private parseError(error: any, context: string): ChatError {
    // Erreur HTTP
    if (error.status !== undefined) {
      return {
        code: `HTTP_${error.status}`,
        message: this.getHttpErrorMessage(error.status),
        context,
        details: error.error
      };
    }

    // Erreur WebSocket
    if (error.type === 'websocket') {
      return {
        code: 'WEBSOCKET_ERROR',
        message: 'Erreur de connexion temps réel',
        context,
        details: error
      };
    }

    // Erreur réseau
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Impossible de contacter le serveur',
        context
      };
    }

    // Erreur générique
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'Une erreur inattendue est survenue',
      context,
      details: error
    };
  }

  /**
   * Retourne un message utilisateur approprié selon le code HTTP
   */
  private getHttpErrorMessage(status: number): string {
    const messages: { [key: number]: string } = {
      0: 'Impossible de contacter le serveur. Vérifiez votre connexion internet.',
      400: 'Requête invalide. Veuillez réessayer.',
      401: 'Session expirée. Veuillez vous reconnecter.',
      403: 'Vous n\'avez pas les permissions nécessaires.',
      404: 'Conversation ou message introuvable.',
      409: 'Conflit avec une opération en cours.',
      429: 'Trop de requêtes. Veuillez patienter quelques instants.',
      500: 'Erreur serveur. Nos équipes ont été notifiées.',
      502: 'Service temporairement indisponible.',
      503: 'Service en maintenance. Réessayez dans quelques minutes.'
    };

    return messages[status] || `Erreur ${status}. Veuillez réessayer.`;
  }

  /**
   * Log l'erreur dans la console avec formatage
   */
  private logError(error: ChatError): void {
    const timestamp = new Date().toISOString();
    console.group(`🔴 Chat Error [${error.code}] - ${timestamp}`);
    console.log('Context:', error.context);
    console.log('Message:', error.message);
    if (error.details) {
      console.log('Details:', error.details);
    }
    console.groupEnd();
  }

  /**
   * Notifie l'utilisateur via un toast
   */
  private notifyUser(error: ChatError): void {
    // Ne pas notifier les erreurs 401 (géré par l'interceptor)
    if (error.code === 'HTTP_401') {
      return;
    }

    // Type de toast selon la gravité
    const toastType = this.getToastType(error.code);
    
    this.toastService.show({
      type: toastType,
      message: error.message,
      duration: 5000
    });
  }

  /**
   * Détermine le type de toast selon le code d'erreur
   */
  private getToastType(code: string): 'success' | 'error' | 'info' | 'warning' {
    if (code.startsWith('HTTP_5')) {
      return 'error';
    }
    
    if (code === 'NETWORK_ERROR' || code === 'WEBSOCKET_ERROR') {
      return 'warning';
    }

    if (code.startsWith('HTTP_4')) {
      return 'warning';
    }

    return 'error';
  }

  /**
   * Gère spécifiquement les erreurs WebSocket
   */
  handleWebSocketError(event: any): void {
    this.handleError(
      { type: 'websocket', event },
      'WebSocket Connection'
    );
  }

  /**
   * Gère les erreurs de reconnexion
   */
  handleReconnectionError(attempt: number, maxAttempts: number): void {
    const error: ChatError = {
      code: 'RECONNECTION_FAILED',
      message: `Tentative de reconnexion ${attempt}/${maxAttempts} échouée`,
      context: 'WebSocket Reconnection'
    };

    this.logError(error);

    if (attempt === maxAttempts) {
      this.toastService.show({
        type: 'error',
        message: 'Impossible de rétablir la connexion. Veuillez rafraîchir la page.',
        duration: 10000
      });
    }
  }

  /**
   * Gère les erreurs de validation de message
   */
  handleValidationError(field: string, reason: string): void {
    const error: ChatError = {
      code: 'VALIDATION_ERROR',
      message: `${field}: ${reason}`,
      context: 'Message Validation'
    };

    this.logError(error);
    this.toastService.show({
      type: 'warning',
      message: error.message,
      duration: 4000
    });
  }
}
