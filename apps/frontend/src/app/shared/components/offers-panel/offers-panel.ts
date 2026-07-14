import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmModal } from '../confirm-modal/confirm-modal';
import {
  COMPLETENESS_OPTIONS,
  CONDITION_OPTIONS,
  completenessLabel,
  conditionLabel,
  showBoxCondition,
  showManualCondition,
} from '../../../core/constants/game-state.constants';

// Forme commune à WishlistOffer (jeux) et ConsoleWishlistOffer (matériel) — le composant est
// agnostique de l'entité recherchée, le parent (Wishlist / Consoles) fait le lien avec le bon service.
// Complétude/état constatés sur l'offre elle-même (ex. Vinted : "complet boîte et jeu bon état et
// notice très bon état", §3.2/§3.5) — distincts des critères de recherche globaux du jeu/console.
// Les jeux détaillent jeu/boîte/notice séparément (ll_condition_media/box/manual, comme la
// Collection) ; les consoles n'ont qu'un état global (ll_condition_overall, comme ConsoleFormModal).
export interface OfferItem {
  id: string;
  nb_price: number | null;
  ll_source_label: string | null;
  ll_source_url: string | null;
  ll_notes: string | null;
  ll_completeness: string | null;
  ll_condition_media: string | null;
  ll_condition_box: string | null;
  ll_condition_manual: string | null;
  ll_condition_overall: string | null;
}

export interface OfferFormValue {
  nb_price: number | null;
  ll_source_label: string | null;
  ll_source_url: string | null;
  ll_notes: string | null;
  ll_completeness: string | null;
  ll_condition_media: string | null;
  ll_condition_box: string | null;
  ll_condition_manual: string | null;
  ll_condition_overall: string | null;
}

// État interne du formulaire (chaînes vides plutôt que null, pour se lier aux <select> comme
// ailleurs dans l'app — cf. WishlistFormModal/CollectionFormModal) ; converti en null à l'émission.
interface OfferFormState {
  nb_price: number | null;
  ll_source_label: string;
  ll_source_url: string;
  ll_notes: string;
  ll_completeness: string;
  ll_condition_media: string;
  ll_condition_box: string;
  ll_condition_manual: string;
  ll_condition_overall: string;
}

function emptyForm(): OfferFormState {
  return {
    nb_price: null,
    ll_source_label: '',
    ll_source_url: '',
    ll_notes: '',
    ll_completeness: '',
    ll_condition_media: '',
    ll_condition_box: '',
    ll_condition_manual: '',
    ll_condition_overall: '',
  };
}

function toFormState(offer: OfferItem): OfferFormState {
  return {
    nb_price: offer.nb_price,
    ll_source_label: offer.ll_source_label ?? '',
    ll_source_url: offer.ll_source_url ?? '',
    ll_notes: offer.ll_notes ?? '',
    ll_completeness: offer.ll_completeness ?? '',
    ll_condition_media: offer.ll_condition_media ?? '',
    ll_condition_box: offer.ll_condition_box ?? '',
    ll_condition_manual: offer.ll_condition_manual ?? '',
    ll_condition_overall: offer.ll_condition_overall ?? '',
  };
}

function toFormValue(state: OfferFormState): OfferFormValue {
  return {
    nb_price: state.nb_price,
    ll_source_label: state.ll_source_label || null,
    ll_source_url: state.ll_source_url || null,
    ll_notes: state.ll_notes || null,
    ll_completeness: state.ll_completeness || null,
    ll_condition_media: state.ll_condition_media || null,
    ll_condition_box: state.ll_condition_box || null,
    ll_condition_manual: state.ll_condition_manual || null,
    ll_condition_overall: state.ll_condition_overall || null,
  };
}

// Suivi d'offres multiples pour un jeu/une console recherché·e (§3.2/§3.5) : plusieurs prix/sources
// constatés en parallèle (ex. "50€ sur Leboncoin, complet en boîte"), pour comparer avant d'acheter.
// Panneau embarqué (pas de backdrop propre) — utilisé dans WishlistDetailModal / ConsoleWishlistDetailModal.
@Component({
  selector: 'app-offers-panel',
  imports: [FormsModule, ConfirmModal],
  templateUrl: './offers-panel.html',
  styleUrl: './offers-panel.scss',
})
export class OffersPanel {
  @Input() offers: OfferItem[] = [];
  @Input() submitting = false;
  // Détermine quels champs état/complétude afficher : jeu/boîte/notice (jeux) vs état global (consoles).
  @Input() itemKind: 'game' | 'console' = 'game';

  @Output() added = new EventEmitter<OfferFormValue>();
  @Output() updated = new EventEmitter<{ id: string; value: OfferFormValue }>();
  @Output() deleted = new EventEmitter<string>();

  protected readonly completenessOptions = COMPLETENESS_OPTIONS;
  protected readonly conditionOptions = CONDITION_OPTIONS;
  protected readonly completenessLabel = completenessLabel;
  protected readonly conditionLabel = conditionLabel;

  protected readonly editingId = signal<string | null>(null);
  protected readonly deleteTargetId = signal<string | null>(null);
  protected newForm: OfferFormState = emptyForm();
  protected editForm: OfferFormState = emptyForm();

  protected isGame(): boolean {
    return this.itemKind === 'game';
  }

  protected showBoxCondition(form: OfferFormState): boolean {
    return showBoxCondition(form.ll_completeness);
  }

  protected showManualCondition(form: OfferFormState): boolean {
    return showManualCondition(form.ll_completeness);
  }

  protected onCompletenessChange(form: OfferFormState): void {
    if (!this.showBoxCondition(form)) form.ll_condition_box = '';
    if (!this.showManualCondition(form)) form.ll_condition_manual = '';
  }

  // Résumé compact affiché sur la ligne d'offre en vue lecture (ex. "CIB · Jeu: Bon · Boîte: Très
  // bon", ou "Bon état" côté console) — le détail complet reste dans le formulaire d'édition.
  protected offerStateSummary(offer: OfferItem): string {
    const parts: string[] = [];
    if (offer.ll_completeness) parts.push(completenessLabel(offer.ll_completeness));
    if (this.itemKind === 'game') {
      if (offer.ll_condition_media) parts.push(`Jeu : ${conditionLabel(offer.ll_condition_media)}`);
      if (offer.ll_condition_box) parts.push(`Boîte : ${conditionLabel(offer.ll_condition_box)}`);
      if (offer.ll_condition_manual) parts.push(`Notice : ${conditionLabel(offer.ll_condition_manual)}`);
    } else if (offer.ll_condition_overall) {
      parts.push(conditionLabel(offer.ll_condition_overall));
    }
    return parts.join(' · ');
  }

  protected submitNew(): void {
    this.added.emit(toFormValue(this.newForm));
    this.newForm = emptyForm();
  }

  protected startEdit(offer: OfferItem): void {
    this.editingId.set(offer.id);
    this.editForm = toFormState(offer);
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
  }

  protected submitEdit(id: string): void {
    this.updated.emit({ id, value: toFormValue(this.editForm) });
    this.editingId.set(null);
  }

  protected remove(id: string): void {
    this.deleteTargetId.set(id);
  }

  protected cancelRemove(): void {
    this.deleteTargetId.set(null);
  }

  protected confirmRemove(): void {
    const id = this.deleteTargetId();
    if (!id) return;
    this.deleted.emit(id);
    this.deleteTargetId.set(null);
  }
}
