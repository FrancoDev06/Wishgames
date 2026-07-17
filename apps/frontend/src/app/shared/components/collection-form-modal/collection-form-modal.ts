import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CONDITION_OPTIONS,
  REGION_OPTIONS,
  showBoxCondition,
  showManualCondition,
} from '../../../core/constants/game-state.constants';
import { toDateInputValue } from '../../../core/utils/date.util';

export interface CollectionFormValue {
  ll_region: string | null;
  ll_completeness: string;
  ll_condition_overall: string;
  ll_condition_media: string | null;
  ll_condition_box: string | null;
  ll_condition_manual: string | null;
  nb_price_paid: number | null;
  ll_purchase_location: string | null;
  ts_acquired: string | null;
  nb_quantity: number;
}

interface FormState {
  ll_region: string;
  ll_completeness: string;
  ll_condition_media: string;
  ll_condition_box: string;
  ll_condition_manual: string;
  nb_price_paid: number | null;
  ll_purchase_location: string;
  ts_acquired: string;
  nb_quantity: number;
}

function emptyForm(): FormState {
  return {
    ll_region: '',
    ll_completeness: '',
    ll_condition_media: '',
    ll_condition_box: '',
    ll_condition_manual: '',
    nb_price_paid: null,
    ll_purchase_location: '',
    ts_acquired: '',
    nb_quantity: 1,
  };
}

// Formulaire réutilisable pour "ajouter/acheter un jeu à la collection" — utilisé par le bouton
// Acheter de la Wishlist (transfert) et par l'ajout direct depuis le Catalogue.
@Component({
  selector: 'app-collection-form-modal',
  imports: [FormsModule],
  templateUrl: './collection-form-modal.html',
  styleUrl: './collection-form-modal.scss',
})
export class CollectionFormModal implements OnInit {
  @Input({ required: true }) heading!: string;
  @Input() subtitle = '';
  @Input() confirmLabel = 'Confirmer';
  @Input() submitting = false;
  // Région imposée (ajout depuis une carte Catalogue précise, une par édition régionale, §2bis) —
  // le select est alors verrouillé sur cette valeur plutôt que de laisser choisir.
  @Input() lockedRegion: string | null = null;
  // Pré-remplissage en mode édition (modification d'une ligne de collection existante) — la région
  // n'est volontairement pas modifiable en édition (identifie la ligne, changerait de fiche §9).
  @Input() initialValue: CollectionFormValue | null = null;

  @Output() confirmed = new EventEmitter<CollectionFormValue>();
  @Output() cancelled = new EventEmitter<void>();

  ngOnInit(): void {
    if (this.lockedRegion) this.form.ll_region = this.lockedRegion;
    if (!this.initialValue) return;
    const v = this.initialValue;
    this.form = {
      ll_region: v.ll_region ?? '',
      ll_completeness: v.ll_completeness,
      ll_condition_media: v.ll_condition_media ?? '',
      ll_condition_box: v.ll_condition_box ?? '',
      ll_condition_manual: v.ll_condition_manual ?? '',
      nb_price_paid: v.nb_price_paid,
      ll_purchase_location: v.ll_purchase_location ?? '',
      ts_acquired: toDateInputValue(v.ts_acquired),
      nb_quantity: v.nb_quantity,
    };
  }

  protected readonly completenessOptions = [
    { value: 'LOOSE', label: 'Loose' },
    { value: 'LOOSE_MANUAL', label: 'Loose + Manuel' },
    { value: 'BOXED', label: 'Boxed' },
    { value: 'CIB', label: 'CIB (Complete In Box)' },
    { value: 'SEALED', label: 'Sealed' },
    { value: 'NOS', label: 'NOS' },
  ];
  protected readonly conditionOptions = CONDITION_OPTIONS;

  protected readonly regionOptions = REGION_OPTIONS;

  protected form: FormState = emptyForm();

  protected showBoxCondition(): boolean {
    return showBoxCondition(this.form.ll_completeness);
  }

  protected showManualCondition(): boolean {
    return showManualCondition(this.form.ll_completeness);
  }

  protected onCompletenessChange(): void {
    if (!this.showBoxCondition()) this.form.ll_condition_box = '';
    if (!this.showManualCondition()) this.form.ll_condition_manual = '';
  }

  protected submit(): void {
    if (!this.form.ll_completeness || !this.form.ll_condition_media) return;

    this.confirmed.emit({
      ll_region: this.form.ll_region || null,
      ll_completeness: this.form.ll_completeness,
      // Pas de champ "état général" séparé : l'état du média (le jeu lui-même, toujours
      // présent quelle que soit la complétude) en tient lieu.
      ll_condition_overall: this.form.ll_condition_media,
      ll_condition_media: this.form.ll_condition_media,
      ll_condition_box: this.showBoxCondition() ? this.form.ll_condition_box || null : null,
      ll_condition_manual: this.showManualCondition() ? this.form.ll_condition_manual || null : null,
      nb_price_paid: this.form.nb_price_paid,
      ll_purchase_location: this.form.ll_purchase_location || null,
      ts_acquired: this.form.ts_acquired || null,
      nb_quantity: this.form.nb_quantity || 1,
    });
  }

  protected cancel(): void {
    this.cancelled.emit();
  }
}
