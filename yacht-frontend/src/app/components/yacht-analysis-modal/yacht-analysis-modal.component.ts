import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiAnalysisService, YachtAnalysis } from '../../services/aiAnalysis/ai-analysis.service';

@Component({
  selector: 'app-yacht-analysis-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './yacht-analysis-modal.component.html',
  styleUrl: './yacht-analysis-modal.component.css'
})
export class YachtAnalysisModalComponent implements OnChanges {
  @Input() isOpen: boolean = false;
  @Input() yacht: any = null;
  @Output() close = new EventEmitter<void>();

  analysis: YachtAnalysis | null = null;
  isLoading: boolean = false;

  constructor(private aiAnalysisService: AiAnalysisService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['yacht'] && this.yacht) {
      this.analyzeYacht();
    }
  }

  analyzeYacht(): void {
    this.isLoading = true;
    
    setTimeout(() => {
      this.analysis = this.aiAnalysisService.analyzeYacht(this.yacht);
      this.isLoading = false;
    }, 1500);
  }

  closeModal(): void {
    this.close.emit();
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  getScoreColor(score: number): string {
    if (score >= 8) return '#10B981';
    if (score >= 6) return '#F59E0B';
    return '#EF4444';
  }

  getScoreLabel(score: number): string {
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Bon';
    return 'Moyen';
  }
}
