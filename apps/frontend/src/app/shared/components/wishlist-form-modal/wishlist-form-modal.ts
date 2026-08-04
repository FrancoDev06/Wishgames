import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { COMPLETENESS_OPTIONS, CONDITION_OPTIONS, REGION_OPTIONS } from '../../../core/constants/game-state.constants';
import { toDateInputValue } from '../../../core/utils/date.util';
import { OfferFormValue } from '../offers-panel/offers-panel';

export interface WishlistFormValue {
  ll_region: string | null;
  ll_desired_completeness: string | null;
  ll_desired_condition: string | null;
  nb_priority: number | null;
  ts_last_checked: string | null;
  flag_hard_to_play: boolean;
  ll_search_keywords: string | null;
}

interface FormState {
  ll_region: string;
  ll_desired_completeness: string;
  ll_desired_condition: string;
  nb_priority: string;
  ts_last_checked: string;
  flag_hard_to_play: boolean;
  ll_search_keywords: string;
}

// Date du jour au format attendu par <input type="date"> — pré-remplit "Dernière vérification"
// à la création (retour utilisateur : on vient de vérifier puisqu'on ajoute l'entrée maintenant).
function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): FormState {
  return {
    ll_region: '',
    ll_desired_completeness: '',
    ll_desired_condition: '',
    nb_priority: '',
    ts_last_checked: todayInputValue(),
    flag_hard_to_play: false,
    ll_search_keywords: '',
  };
}

// Brouillon d'offre saisi pendant la création de l'entrée wishlist (retour utilisateur : éviter
// d'ajouter l'entrée puis devoir rouvrir son détail juste pour déclarer une offre déjà connue).
// Volontairement plus succinct que le formulaire complet d'OffersPanel (prix/source/lien) : les
// détails de complétude/état/notes restent modifiables ensuite via la vue détail si besoin.
interface OfferDraftState {
  nb_price: number | null;
  ll_source_label: string;
  ll_source_url: string;
}

function emptyOfferDraft(): OfferDraftState {
  return { nb_price: null, ll_source_label: '', ll_source_url: '' };
}

function toOfferFormValue(draft: OfferDraftState): OfferFormValue {
  return {
    nb_price: draft.nb_price,
    ll_source_label: draft.ll_source_label || null,
    ll_source_url: draft.ll_source_url || null,
    ll_notes: null,
    ll_completeness: null,
    ll_condition_media: null,
    ll_condition_box: null,
    ll_condition_manual: null,
    ll_condition_overall: null,
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
  // Région pré-sélectionnée (ajout depuis une carte Catalogue précise, §2bis) — simple valeur par
  // défaut, modifiable, même logique que CollectionFormModal : le Catalogue n'expose parfois qu'une
  // jaquette "Europe" générique alors que l'édition réellement recherchée est plus précise (France,
  // Allemagne...), retour utilisateur.
  @Input() lockedRegion: string | null = null;

  @Output() confirmed = new EventEmitter<WishlistFormValue>();
  // Émis juste avant `confirmed`, avec les offres saisies pendant la création (liste vide si
  // aucune) — permet au parent de les créer une fois l'entrée wishlist elle-même créée, sans
  // coupler ce composant à un identifiant qui n'existe pas encore à ce stade.
  @Output() offersReady = new EventEmitter<OfferFormValue[]>();
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
      flag_hard_to_play: v.flag_hard_to_play,
      ll_search_keywords: v.ll_search_keywords ?? '',
    };
  }

  protected readonly completenessOptions = COMPLETENESS_OPTIONS;
  protected readonly conditionOptions = CONDITION_OPTIONS;
  protected readonly regionOptions = REGION_OPTIONS;
  protected readonly priorityLevels = [1, 2, 3, 4, 5];

  protected form: FormState = emptyForm();

  // Offres saisies pendant la création (mode ajout uniquement, cf. template) : liste des offres
  // déjà validées via "+ Ajouter cette offre" + le brouillon en cours de saisie.
  protected pendingOffers: OfferFormValue[] = [];
  protected offerDraft: OfferDraftState = emptyOfferDraft();

  protected canAddOfferDraft(): boolean {
    return !!(this.offerDraft.nb_price || this.offerDraft.ll_source_label || this.offerDraft.ll_source_url);
  }

  protected addOfferDraft(): void {
    if (!this.canAddOfferDraft()) return;
    this.pendingOffers.push(toOfferFormValue(this.offerDraft));
    this.offerDraft = emptyOfferDraft();
  }

  protected removePendingOffer(index: number): void {
    this.pendingOffers.splice(index, 1);
  }

  protected submit(): void {
    // Le brouillon en cours (non validé via "+ Ajouter cette offre") est inclus aussi : oublier de
    // cliquer ce bouton avant "Ajouter à la wishlist" ne doit pas faire perdre l'offre saisie.
    if (this.canAddOfferDraft()) this.addOfferDraft();

    this.offersReady.emit(this.pendingOffers);
    this.confirmed.emit({
      ll_region: this.form.ll_region || null,
      ll_desired_completeness: this.form.ll_desired_completeness || null,
      ll_desired_condition: this.form.ll_desired_condition || null,
      nb_priority: this.form.nb_priority ? Number(this.form.nb_priority) : null,
      ts_last_checked: this.form.ts_last_checked || null,
      flag_hard_to_play: this.form.flag_hard_to_play,
      ll_search_keywords: this.form.ll_search_keywords.trim() || null,
    });
  }

  protected cancel(): void {
    this.cancelled.emit();
  }
}
