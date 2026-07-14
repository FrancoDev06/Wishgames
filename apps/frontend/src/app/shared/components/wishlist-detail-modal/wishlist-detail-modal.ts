import { Component, EventEmitter, Input, Output } from '@angular/core';
import { OffersPanel, OfferItem, OfferFormValue } from '../offers-panel/offers-panel';
import { WishlistItem } from '../../../core/models/wishlist.model';
import { completenessLabel, conditionLabel, regionShortLabel } from '../../../core/constants/game-state.constants';
import { toDateInputValue } from '../../../core/utils/date.util';

// Vue détaillée d'un jeu recherché (§3.2), ouverte au clic sur la carte plutôt que d'empiler les
// boutons directement dessus (retour utilisateur) : infos + offres + actions, tout en un seul endroit.
@Component({
  selector: 'app-wishlist-detail-modal',
  imports: [OffersPanel],
  templateUrl: './wishlist-detail-modal.html',
  styleUrl: './wishlist-detail-modal.scss',
})
export class WishlistDetailModal {
  @Input({ required: true }) item!: WishlistItem;
  @Input() coverUrl: string | null = null;
  @Input() offers: OfferItem[] = [];
  @Input() offersSubmitting = false;

  protected readonly priorityLevels = [1, 2, 3, 4, 5];
  protected readonly completenessLabel = completenessLabel;
  protected readonly conditionLabel = conditionLabel;
  protected readonly formatDate = toDateInputValue;

  @Output() offerAdded = new EventEmitter<OfferFormValue>();
  @Output() offerUpdated = new EventEmitter<{ id: string; value: OfferFormValue }>();
  @Output() offerDeleted = new EventEmitter<string>();
  @Output() editRequested = new EventEmitter<void>();
  @Output() buyRequested = new EventEmitter<void>();
  @Output() deleteRequested = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  protected close(): void {
    this.closed.emit();
  }

  protected regionsLabel(): string {
    return this.item.ll_desired_regions.map(regionShortLabel).join(', ');
  }
}
