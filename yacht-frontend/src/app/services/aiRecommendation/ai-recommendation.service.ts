import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AiRecommendationService {
  private apiUrl = 'http://localhost:3001/ai';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  analyzePreferences(): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/analyze-preferences`,
      {},
      { headers: this.getHeaders() }
    );
  }

  getRecommendations(params?: { budget?: number; capacity?: number; forceAnalyze?: boolean }): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/recommendations`,
      params || {},
      { headers: this.getHeaders() }
    );
  }

  chatWithAI(message: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/chat`,
      { message },
      { headers: this.getHeaders() }
    );
  }
}
