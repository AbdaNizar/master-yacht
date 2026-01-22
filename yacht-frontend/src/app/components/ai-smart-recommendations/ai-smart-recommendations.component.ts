import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AiRecommendationService } from '../../services/aiRecommendation/ai-recommendation.service';
import { HeaderComponent } from '../header/header.component';
import { getUrl } from '../../constants/functions';

@Component({
  selector: 'app-ai-smart-recommendations',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HeaderComponent],
  templateUrl: './ai-smart-recommendations.component.html',
  styleUrls: ['./ai-smart-recommendations.component.css']
})
export class AiSmartRecommendationsComponent implements OnInit {
  recommendations: any[] = [];
  loading = false;
  aiMessage = '';
  userPreferences: any = null;
  
  budget: number | null = null;
  capacity: number | null = null;
  
  chatMessages: Array<{role: string, content: string}> = [];
  chatInput = '';
  chatLoading = false;
  showChat = false;

  constructor(
    private aiService: AiRecommendationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadRecommendations();
  }

  loadRecommendations(): void {
    this.loading = true;
    
    const params: any = {
      forceAnalyze: false
    };
    
    if (this.budget && this.budget > 0) {
      params.budget = this.budget;
    }
    
    if (this.capacity && this.capacity > 0) {
      params.capacity = this.capacity;
    }
    
    this.aiService.getRecommendations(params).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.recommendations = response.recommendations;
          this.aiMessage = response.aiMessage;
          this.userPreferences = response.userPreferences;
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error loading recommendations:', error);
      }
    });
  }

  applyFilters(): void {
    this.loadRecommendations();
  }

  resetFilters(): void {
    this.budget = null;
    this.capacity = null;
    this.loadRecommendations();
  }

  viewYacht(yachtId: string): void {
    this.router.navigate(['/dashboard/client/bookings', yachtId]);
  }

  getScoreClass(score: number): string {
    if (score >= 85) return 'score-excellent';
    if (score >= 70) return 'score-good';
    if (score >= 55) return 'score-medium';
    return 'score-low';
  }

  toggleChat(): void {
    this.showChat = !this.showChat;
    if (this.showChat) {
      setTimeout(() => this.scrollChatToBottom(), 100);
    }
  }

  sendChatMessage(): void {
    if (!this.chatInput.trim() || this.chatLoading) return;

    const userMessage = this.chatInput.trim();
    this.chatMessages.push({ role: 'user', content: userMessage });
    this.chatInput = '';
    this.chatLoading = true;

    setTimeout(() => this.scrollChatToBottom(), 100);

    this.aiService.chatWithAI(userMessage).subscribe({
      next: (response) => {
        this.chatLoading = false;
        if (response.success) {
          this.chatMessages.push({ role: 'assistant', content: response.response });
          setTimeout(() => this.scrollChatToBottom(), 100);
        }
      },
      error: (error) => {
        this.chatLoading = false;
        console.error('Chat error:', error);
        this.chatMessages.push({ 
          role: 'assistant', 
          content: 'Désolé, une erreur est survenue. 😔' 
        });
        setTimeout(() => this.scrollChatToBottom(), 100);
      }
    });
  }

  scrollChatToBottom(): void {
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  protected readonly getUrl = getUrl;
}
