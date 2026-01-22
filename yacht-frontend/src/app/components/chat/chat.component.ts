import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, Conversation, Message } from '../../services/chat.service';
import { AuthService } from '../../services/authService/auth.service';
import { Subscription } from 'rxjs';
import { getUrl } from '../../constants/functions';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  conversations: Conversation[] = [];
  selectedConversation: Conversation | null = null;
  messages: Message[] = [];
  newMessageText: string = '';
  currentUser: any;
  currentUserId: string = '';
  loading: boolean = false;
  showEmojiPicker: boolean = false;
  private shouldScroll: boolean = false;

  emojis: string[] = ['😊', '😂', '❤️', '👍', '👎', '🎉', '😍', '🙏', '✅', '❌', '🚀', '⚓', '🛥️', '🌊'];

  private subscriptions: Subscription[] = [];

  constructor(
    private chatService: ChatService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();
    this.currentUserId = this.currentUser._id || this.currentUser.id;
    
    this.loadConversations();

    const state = history.state;
    if (state && state.conversationId) {
      setTimeout(() => {
        const conv = this.conversations.find(c => c._id === state.conversationId);
        if (conv) {
          this.selectConversation(conv);
        }
      }, 500);
    }

    const newMessageSub = this.chatService.newMessage$.subscribe(message => {
      if (message) {
        this.loadConversations();
        
        if (this.selectedConversation && message.conversation === this.selectedConversation._id) {
          const exists = this.messages.find(m => m._id === message._id);
          if (!exists) {
            this.messages.push(message);
            this.shouldScroll = true;
          }
          
          if (!this.isMyMessage(message)) {
            this.chatService.markAsRead(this.selectedConversation._id).subscribe(() => {
              this.loadConversations();
              this.chatService.loadUnreadCount();
            });
          }
        }
      }
    });

    const messagesReadSub = this.chatService.messagesRead$.subscribe(data => {
      if (data && this.selectedConversation && data.conversationId === this.selectedConversation._id) {
        this.messages.forEach(msg => {
          if (this.isMyMessage(msg)) {
            msg.isRead = true;
          }
        });
      }
    });

    this.subscriptions.push(newMessageSub, messagesReadSub);
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadConversations(): void {
    this.chatService.getConversations().subscribe({
      next: (response) => {
        if (response.success) {
          this.conversations = response.data;
          
          if (this.selectedConversation) {
            const updated = this.conversations.find(c => c._id === this.selectedConversation!._id);
            if (updated) {
              this.selectedConversation = updated;
            }
          }
        }
      },
      error: (err) => console.error('Erreur chargement conversations:', err)
    });
  }

  selectConversation(conversation: Conversation): void {
    this.selectedConversation = conversation;
    this.loading = true;

    this.chatService.getMessages(conversation._id).subscribe({
      next: (response) => {
        if (response.success) {
          this.messages = response.data;
          this.loading = false;
          
          this.shouldScroll = true;
          
          this.chatService.markAsRead(conversation._id).subscribe(() => {
            this.loadConversations();
            this.chatService.loadUnreadCount();
          });
        }
      },
      error: (err) => {
        console.error('Erreur chargement messages:', err);
        this.loading = false;
      }
    });
  }

  sendMessage(): void {
    if (!this.newMessageText.trim() || !this.selectedConversation) return;

    const content = this.newMessageText.trim();
    this.newMessageText = '';

    this.chatService.sendMessage(this.selectedConversation._id, content).subscribe({
      next: (response) => {
        if (response.success) {
        }
      },
      error: (err) => console.error('Erreur envoi:', err)
    });
  }

  addEmoji(emoji: string): void {
    this.newMessageText += emoji;
    this.showEmojiPicker = false;
  }

  getOtherParticipant(conversation: Conversation): any {
    const other = conversation.participants.find(p => p._id !== this.currentUserId);
    return other || conversation.participants[0];
  }

  getSenderId(message: Message): string {
    if (typeof message.sender === 'string') {
      return message.sender;
    }
    return message.sender._id || message.sender.id || '';
  }

  isMyMessage(message: Message): boolean {
    const senderId = this.getSenderId(message);
    return senderId === this.currentUserId;
  }

  scrollToBottom(): void {
    try {
      if (this.messagesContainer && this.messagesContainer.nativeElement) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {}
  }

  protected readonly getUrl = getUrl;
}
