import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TopReview {
  clientName: string;
  rating: number;
  comment: string;
  date: Date;
}

export interface AIAnalysis {
  sentimentScore: number;
  keyPositives: string[];
  keyNegatives: string[];
  summary: string;
  topReviews?: TopReview[];
}

export interface Recommendation {
  _id: string;
  user: string;
  yacht: any;
  score: number;
  reasons: string[];
  aiAnalysis: AIAnalysis;
  basedOnReviews: any[];
  status: 'pending' | 'sent' | 'viewed' | 'dismissed';
  notificationSent: boolean;
  emailSent: boolean;
  viewedAt?: Date;
  dismissedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecommendationResponse {
  success: boolean;
  data: Recommendation[] | Recommendation;
  message?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class RecommendationService {
  private apiUrl = 'http://localhost:3001/recommendations';

  constructor(private http: HttpClient) { }

  generateRecommendations(limit: number = 3, sendNotification: boolean = true, sendEmail: boolean = true): Observable<RecommendationResponse> {
    return this.http.post<RecommendationResponse>(`${this.apiUrl}/generate`, {
      limit,
      sendNotification,
      sendEmail
    });
  }

  getMyRecommendations(status?: string, limit: number = 10, page: number = 1): Observable<RecommendationResponse> {
    let url = `${this.apiUrl}/my-recommendations?limit=${limit}&page=${page}`;
    if (status) {
      url += `&status=${status}`;
    }
    return this.http.get<RecommendationResponse>(url);
  }

  markAsViewed(id: string): Observable<RecommendationResponse> {
    return this.http.put<RecommendationResponse>(`${this.apiUrl}/${id}/view`, {});
  }

  dismissRecommendation(id: string): Observable<RecommendationResponse> {
    return this.http.put<RecommendationResponse>(`${this.apiUrl}/${id}/dismiss`, {});
  }

  analyzeYacht(yachtId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/analyze/${yachtId}`);
  }
}
