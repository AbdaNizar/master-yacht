import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, Conversation, Message } from '../../services/chatService/chat.service';
import { AuthService } from '../../services/authService/auth.service';
import { ChatErrorService } from '../../services/chatErrorService/chat-error.service';
import { NotificationSoundService } from '../../services/notificationSoundService/notification-sound.service';
import { Subscription } from 'rxjs';
import { getUrl } from '../../constants/functions';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  // Conversations
  conversations: Conversation[] = [];
  filteredConversations: Conversation[] = [];
  selectedConversation: Conversation | null = null;
  searchTerm: string = '';

  // Messages
  messages: Message[] = [];
  newMessageText: string = '';
  currentUser: any;
  loading: boolean = false;
  isLoadingMore: boolean = false;
  
  // Pagination
  private currentPage = 1;
  private hasMoreMessages = true;

  // UI
  showEmojiPicker: boolean = false;
  emojis: string[] = ['😊', '😂', '❤️', '👍', '👎', '🎉', '😍', '🙏', '✅', '❌', '🚀', '⚓', '🛥️', '🌊'];

  // Typing indicator
  typingUsers = new Set<string>();
  private typingTimeout: any;

  // Connection status
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting' = 'disconnected';

  private subscriptions: Subscription[] = [];

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private chatErrorService: ChatErrorService,
    private soundService: NotificationSoundService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();
    this.loadConversations();

    // Précharger les sons
    this.soundService.preloadSounds();

    // Observer les nouveaux messages
    const newMessageSub = this.chatService.newMessage$.subscribe(message => {
      if (message && this.selectedConversation && message.conversation === this.selectedConversation._id) {
        this.messages.push(message);
        setTimeout(() => this.scrollToBottom(), 100);
        this.chatService.markAsRead(this.selectedConversation._id).subscribe();
        
        // Jouer le son si ce n'est pas notre message
        if (!this.isMyMessage(message)) {
          this.soundService.playMessageSound();
        }
      }
      this.loadConversations();
    });

    // Observer le statut de connexion
    const statusSub = this.chatService.connectionStatus$.subscribe(status => {
      this.connectionStatus = status;
    });

    // Observer les événements de frappe
    const typingSub = this.chatService.typing$.subscribe(event => {
      if (event.conversationId === this.selectedConversation?._id) {
        if (event.isTyping) {
          this.typingUsers.add(event.userId);
        } else {
          this.typingUsers.delete(event.userId);
        }
      }
    });

    // Observer les suppressions de messages
    const deletedSub = this.chatService.messageDeleted$.subscribe(event => {
      if (event.conversationId === this.selectedConversation?._id) {
        this.messages = this.messages.filter(m => m._id !== event.messageId);
      }
    });

    this.subscriptions.push(newMessageSub, statusSub, typingSub, deletedSub);
  }

  ngAfterViewInit(): void {
    // Rien à faire ici pour l'instant, mais gardé pour future utilisation
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    clearTimeout(this.typingTimeout);
  }

  loadConversations(): void {
    this.chatService.getConversations().subscribe({
      next: (response) => {
        if (response.success) {
          this.conversations = response.data;
          this.filterConversations();
        }
      },
      error: (error) => {
        this.chatErrorService.handleError(error, 'Load Conversations');
      }
    });
  }

  filterConversations(): void {
    if (!this.searchTerm.trim()) {
      this.filteredConversations = this.conversations;
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredConversations = this.conversations.filter(conv => {
        const otherParticipant = this.getOtherParticipant(conv);
        return otherParticipant.name.toLowerCase().includes(term) ||
               conv.lastMessage?.content.toLowerCase().includes(term) ||
               conv.yacht?.name.toLowerCase().includes(term);
      });
    }
  }

  selectConversation(conversation: Conversation): void {
    this.selectedConversation = conversation;
    this.loading = true;
    this.currentPage = 1;
    this.hasMoreMessages = true;
    this.typingUsers.clear();

    this.chatService.getMessages(conversation._id).subscribe({
      next: (response) => {
        if (response.success) {
          this.messages = response.data;
          this.loading = false;
          setTimeout(() => this.scrollToBottom(), 100);
          this.chatService.markAsRead(conversation._id).subscribe(() => {
            this.loadConversations();
            this.chatService.loadUnreadCount();
          });
        }
      },
      error: (error) => {
        this.chatErrorService.handleError(error, 'Load Messages');
        this.loading = false;
      }
    });
  }

  loadMoreMessages(): void {
    if (!this.selectedConversation || this.isLoadingMore || !this.hasMoreMessages) return;
    
    this.isLoadingMore = true;
    this.currentPage++;
    
    this.chatService.getMessages(this.selectedConversation._id, this.currentPage).subscribe({
      next: (response) => {
        if (response.success) {
          const container = this.messagesContainer.nativeElement;
          const oldScrollHeight = container.scrollHeight;
          
          // Ajouter les nouveaux messages au début
          this.messages = [...response.data.reverse(), ...this.messages];
          this.hasMoreMessages = response.pagination.page < response.pagination.pages;
          
          // Maintenir la position de scroll
          setTimeout(() => {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - oldScrollHeight;
            this.isLoadingMore = false;
          }, 100);
        }
      },
      error: (error) => {
        this.chatErrorService.handleError(error, 'Load More Messages');
        this.isLoadingMore = false;
        this.currentPage--;
      }
    });
  }

  onScroll(): void {
    const element = this.messagesContainer?.nativeElement;
    if (!element) return;
    
    // Si on est en haut et qu'il y a plus de messages
    if (element.scrollTop < 100 && this.hasMoreMessages && !this.isLoadingMore) {
      this.loadMoreMessages();
    }
  }

  sendMessage(): void {
    if (!this.newMessageText.trim() || !this.selectedConversation) return;

    const content = this.newMessageText.trim();
    this.newMessageText = '';

    // Arrêter l'indicateur de frappe
    if (this.selectedConversation) {
      this.chatService.notifyTyping(this.selectedConversation._id, false).subscribe();
      clearTimeout(this.typingTimeout);
    }

    this.chatService.sendMessage(this.selectedConversation._id, content).subscribe({
      next: (response) => {
        if (response.success) {
          this.messages.push(response.data);
          setTimeout(() => this.scrollToBottom(), 100);
          this.loadConversations();
          
          // Son de confirmation
          this.soundService.playSentSound();
        }
      },
      error: (error) => {
        this.chatErrorService.handleError(error, 'Send Message');
        this.soundService.playErrorSound();
        // Restaurer le texte en cas d'erreur
        this.newMessageText = content;
      }
    });
  }

  deleteMessage(messageId: string): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) {
      return;
    }

    this.chatService.deleteMessage(messageId).subscribe({
      next: (response) => {
        if (response.success) {
          this.messages = this.messages.filter(m => m._id !== messageId);
        }
      },
      error: (error) => {
        this.chatErrorService.handleError(error, 'Delete Message');
      }
    });
  }

  onMessageInput(): void {
    if (this.selectedConversation) {
      // Notifier qu'on est en train d'écrire
      this.chatService.notifyTyping(this.selectedConversation._id, true).subscribe();
      
      // Arrêter après 3 secondes d'inactivité
      clearTimeout(this.typingTimeout);
      this.typingTimeout = setTimeout(() => {
        if (this.selectedConversation) {
          this.chatService.notifyTyping(this.selectedConversation._id, false).subscribe();
        }
      }, 3000);
    }
  }

  addEmoji(emoji: string): void {
    this.newMessageText += emoji;
    this.showEmojiPicker = false;
    this.onMessageInput(); // Notifier qu'on écrit
  }

  getOtherParticipant(conversation: Conversation): any {
    return conversation.participants.find(p => p._id !== this.currentUser._id);
  }

  isMyMessage(message: Message): boolean {
    return message.sender._id === this.currentUser._id || message.sender === this.currentUser._id;
  }

  isOtherUserTyping(): boolean {
    return this.typingUsers.size > 0;
  }

  scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  protected readonly getUrl = getUrl;
}
