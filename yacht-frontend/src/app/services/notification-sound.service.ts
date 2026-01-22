import { Injectable } from '@angular/core';

export interface NotificationSound {
  name: string;
  path: string;
  volume: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationSoundService {
  
  private audio: HTMLAudioElement | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5;

  // Sons disponibles
  private readonly sounds: { [key: string]: NotificationSound } = {
    message: {
      name: 'Nouveau message',
      path: 'assets/sounds/notification.mp3',
      volume: 0.5
    },
    sent: {
      name: 'Message envoyé',
      path: 'assets/sounds/sent.mp3',
      volume: 0.3
    },
    error: {
      name: 'Erreur',
      path: 'assets/sounds/error.mp3',
      volume: 0.4
    }
  };

  constructor() {
    this.loadPreferences();
  }

  /**
   * Joue le son de notification pour un nouveau message
   */
  playMessageSound(): void {
    this.play('message');
  }

  /**
   * Joue le son de confirmation d'envoi
   */
  playSentSound(): void {
    this.play('sent');
  }

  /**
   * Joue le son d'erreur
   */
  playErrorSound(): void {
    this.play('error');
  }

  /**
   * Joue un son spécifique
   */
  private play(soundKey: string): void {
    if (!this.enabled) {
      return;
    }

    const sound = this.sounds[soundKey];
    if (!sound) {
      console.warn(`Son "${soundKey}" introuvable`);
      return;
    }

    try {
      // Créer un nouvel audio à chaque fois pour permettre plusieurs sons simultanés
      const audio = new Audio(sound.path);
      audio.volume = sound.volume * this.volume;
      
      audio.play().catch(error => {
        console.warn('Impossible de jouer le son:', error);
        // Le navigateur peut bloquer l'autoplay
        // On ignore silencieusement cette erreur
      });
    } catch (error) {
      console.error('Erreur lors de la lecture du son:', error);
    }
  }

  /**
   * Active ou désactive les sons
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.savePreferences();
  }

  /**
   * Retourne l'état d'activation des sons
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Définit le volume général (0.0 à 1.0)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.savePreferences();
  }

  /**
   * Retourne le volume actuel
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Teste le son avec le volume actuel
   */
  testSound(): void {
    this.playMessageSound();
  }

  /**
   * Sauvegarde les préférences dans le localStorage
   */
  private savePreferences(): void {
    try {
      const preferences = {
        enabled: this.enabled,
        volume: this.volume
      };
      localStorage.setItem('chat_sound_preferences', JSON.stringify(preferences));
    } catch (error) {
      console.warn('Impossible de sauvegarder les préférences sonores:', error);
    }
  }

  /**
   * Charge les préférences depuis le localStorage
   */
  private loadPreferences(): void {
    try {
      const saved = localStorage.getItem('chat_sound_preferences');
      if (saved) {
        const preferences = JSON.parse(saved);
        this.enabled = preferences.enabled ?? true;
        this.volume = preferences.volume ?? 0.5;
      }
    } catch (error) {
      console.warn('Impossible de charger les préférences sonores:', error);
      // Garder les valeurs par défaut
    }
  }

  /**
   * Réinitialise les préférences aux valeurs par défaut
   */
  resetPreferences(): void {
    this.enabled = true;
    this.volume = 0.5;
    this.savePreferences();
  }

  /**
   * Vérifie si le navigateur supporte l'audio
   */
  isAudioSupported(): boolean {
    return typeof Audio !== 'undefined';
  }

  /**
   * Précharge tous les sons pour une lecture instantanée
   */
  preloadSounds(): void {
    Object.values(this.sounds).forEach(sound => {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = sound.path;
    });
  }
}
