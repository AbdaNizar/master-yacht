import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ai-analysis-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-analysis-modal.component.html',
  styleUrl: './ai-analysis-modal.component.css'
})
export class AiAnalysisModalComponent {
  @Input() isOpen: boolean = false;
  @Input() analysis: any = null;
  @Input() yachtName: string = '';
  @Output() close = new EventEmitter<void>();

  closeModal(): void {
    this.close.emit();
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }
}
