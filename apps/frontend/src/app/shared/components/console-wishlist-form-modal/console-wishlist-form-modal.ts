import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VIDEO_STANDARD_OPTIONS } from '../../../core/constants/game-state.constants';
import { toDateInputValue } from '../../../core/utils/date.util';

export interface ConsoleWishlistFormValue {
  ll_desired_video_standard: string | null;
  ts_last_checked: string | null;
}

interface FormState {
  ll_desired_video_standard: string;
  ts_last_checked: string;
}

function emptyForm(): FormState {
  return { ll_desired_video_standard: '', ts_last_checked: '' };
}

// Formulaire réutilisable pour "rechercher une console" (§3.5) : standard vidéo désiré et date de
// dernière vérification, tous deux optionnels (critères de recherche, pas d'exigence stricte).
@Component({
  selector: 'app-console-wishlist-form-modal',
  imports: [FormsModule],
  templateUrl: './console-wishlist-form-modal.html',
  styleUrl: './console-wishlist-form-modal.scss',
})
export class ConsoleWishlistFormModal implements OnInit {
  @Input({ required: true }) heading!: string;
  @Input() confirmLabel = 'Ajouter';
  @Input() submitting = false;
  @Input() initialValue: ConsoleWishlistFormValue | null = null;

  @Output() confirmed = new EventEmitter<ConsoleWishlistFormValue>();
  @Output() cancelled = new EventEmitter<void>();

  ngOnInit(): void {
    if (!this.initialValue) return;
    this.form = {
      ll_desired_video_standard: this.initialValue.ll_desired_video_standard ?? '',
      ts_last_checked: toDateInputValue(this.initialValue.ts_last_checked),
    };
  }

  protected readonly videoStandardOptions = VIDEO_STANDARD_OPTIONS;

  protected form: FormState = emptyForm();

  protected submit(): void {
    this.confirmed.emit({
      ll_desired_video_standard: this.form.ll_desired_video_standard || null,
      ts_last_checked: this.form.ts_last_checked || null,
    });
  }

  protected cancel(): void {
    this.cancelled.emit();
  }
}
