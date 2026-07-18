import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { COMPLETENESS_OPTIONS, CONDITION_OPTIONS, REGION_OPTIONS } from '../../../core/constants/game-state.constants';
import { toDateInputValue } from '../../../core/utils/date.util';

export interface WishlistFormValue {
  ll_region: string | null;
  ll_desired_completeness: string | null;
  ll_desired_condition: string | null;
  nb_priority: number | null;
  ts_last_checked: string | null;
}

interface FormState {
  ll_region: string;
  ll_desired_completeness: string;
  ll_desired_condition: string;
  nb_priority: string;
  ts_last_checked: string;
}

function emptyForm(): FormState {
  return {
    ll_region: '',
    ll_desired_completeness: '',
    ll_desired_condition: '',
    nb_priority: '',
    ts_last_checked: '',
  };
}

// Formulaire réutilisable pour "ajouter un jeu à la wishlist" avec ses critères de recherche
// (§3.2 : complétude/état désirés, priorité, date de dernière vérification — tous optionnels,
// ce sont des critères de recherche et pas des exigences strictes).
@Component({
  selector: 'app-wishlist-form-modal',
  imports: [FormsModule],
  templateUrl: './wishlist-form-modal.html',
  styleUrl: './wishlist-form-modal.scss',
})
export class WishlistFormModal implements OnInit {
  @Input({ required: true }) heading!: string;
  @Input() subtitle = '';
  @Input() confirmLabel = 'Ajouter';
  @Input() submitting = false;
  // Pré-remplissage en mode édition (modification d'une entrée wishlist existante).
  @Input() initialValue: WishlistFormValue | null = null;
  // Région imposée (ajout depuis une carte Catalogue précise, une par édition régionale, §2bis) —
  // le select est alors verrouillé sur cette valeur, même logique que CollectionFormModal : une
  // entrée wishlist cible une édition régionale précise, plusieurs entrées possibles pour un même
  // jeu (une par région suivie séparément, §9).
  @Input() lockedRegion: string | null = null;

  @Output() confirmed = new EventEmitter<WishlistFormValue>();
  @Output() cancelled = new EventEmitter<void>();

  ngOnInit(): void {
    if (this.lockedRegion) this.form.ll_region = this.lockedRegion;
    if (!this.initialValue) return;
    const v = this.initialValue;
    this.form = {
      ll_region: v.ll_region ?? '',
      ll_desired_completeness: v.ll_desired_completeness ?? '',
      ll_desired_condition: v.ll_desired_condition ?? '',
      nb_priority: v.nb_priority ? String(v.nb_priority) : '',
      ts_last_checked: toDateInputValue(v.ts_last_checked),
    };
  }

  protected readonly completenessOptions = COMPLETENESS_OPTIONS;
  protected readonly conditionOptions = CONDITION_OPTIONS;
  protected readonly regionOptions = REGION_OPTIONS;
  protected readonly priorityLevels = [1, 2, 3, 4, 5];

  protected form: FormState = emptyForm();

  protected submit(): void {
    this.confirmed.emit({
      ll_region: this.form.ll_region || null,
      ll_desired_completeness: this.form.ll_desired_completeness || null,
      ll_desired_condition: this.form.ll_desired_condition || null,
      nb_priority: this.form.nb_priority ? Number(this.form.nb_priority) : null,
      ts_last_checked: this.form.ts_last_checked || null,
    });
  }

  protected cancel(): void {
    this.cancelled.emit();
  }
}
