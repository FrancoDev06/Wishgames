import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { COMPLETENESS_OPTIONS, CONDITION_OPTIONS, VIDEO_STANDARD_OPTIONS } from '../../../core/constants/game-state.constants';
import { toDateInputValue } from '../../../core/utils/date.util';

export interface ConsoleFormValue {
  ll_completeness: string;
  ll_condition_overall: string;
  ll_video_standard: string | null;
  flag_with_cables: boolean;
  flag_with_controller: boolean;
  nb_price_paid: number | null;
  ll_purchase_location: string | null;
  ts_acquired: string | null;
  nb_quantity: number;
  ll_notes: string | null;
}

interface FormState {
  ll_completeness: string;
  ll_condition_overall: string;
  ll_video_standard: string;
  flag_with_cables: boolean;
  flag_with_controller: boolean;
  nb_price_paid: number | null;
  ll_purchase_location: string;
  ts_acquired: string;
  nb_quantity: number;
  ll_notes: string;
}

function emptyForm(): FormState {
  return {
    ll_completeness: '',
    ll_condition_overall: '',
    ll_video_standard: '',
    flag_with_cables: false,
    flag_with_controller: false,
    nb_price_paid: null,
    ll_purchase_location: '',
    ts_acquired: '',
    nb_quantity: 1,
    ll_notes: '',
  };
}

// Formulaire réutilisable pour "ajouter/acheter une console" (§3.5) — utilisé pour l'ajout direct
// à la collection de consoles et pour le bouton "Acheter" depuis la wishlist de consoles.
@Component({
  selector: 'app-console-form-modal',
  imports: [FormsModule],
  templateUrl: './console-form-modal.html',
  styleUrl: './console-form-modal.scss',
})
export class ConsoleFormModal implements OnInit {
  @Input({ required: true }) heading!: string;
  @Input() confirmLabel = 'Ajouter';
  @Input() submitting = false;
  // Pré-remplissage en mode édition (modification d'une ligne de collection existante).
  @Input() initialValue: ConsoleFormValue | null = null;

  @Output() confirmed = new EventEmitter<ConsoleFormValue>();
  @Output() cancelled = new EventEmitter<void>();

  ngOnInit(): void {
    if (!this.initialValue) return;
    const v = this.initialValue;
    this.form = {
      ll_completeness: v.ll_completeness,
      ll_condition_overall: v.ll_condition_overall,
      ll_video_standard: v.ll_video_standard ?? '',
      flag_with_cables: v.flag_with_cables,
      flag_with_controller: v.flag_with_controller,
      nb_price_paid: v.nb_price_paid,
      ll_purchase_location: v.ll_purchase_location ?? '',
      ts_acquired: toDateInputValue(v.ts_acquired),
      nb_quantity: v.nb_quantity,
      ll_notes: v.ll_notes ?? '',
    };
  }

  protected readonly completenessOptions = COMPLETENESS_OPTIONS;
  protected readonly conditionOptions = CONDITION_OPTIONS;
  protected readonly videoStandardOptions = VIDEO_STANDARD_OPTIONS;

  protected form: FormState = emptyForm();

  protected submit(): void {
    if (!this.form.ll_completeness || !this.form.ll_condition_overall) return;

    this.confirmed.emit({
      ll_completeness: this.form.ll_completeness,
      ll_condition_overall: this.form.ll_condition_overall,
      ll_video_standard: this.form.ll_video_standard || null,
      flag_with_cables: this.form.flag_with_cables,
      flag_with_controller: this.form.flag_with_controller,
      nb_price_paid: this.form.nb_price_paid,
      ll_purchase_location: this.form.ll_purchase_location || null,
      ts_acquired: this.form.ts_acquired || null,
      nb_quantity: this.form.nb_quantity || 1,
      ll_notes: this.form.ll_notes || null,
    });
  }

  protected cancel(): void {
    this.cancelled.emit();
  }
}
