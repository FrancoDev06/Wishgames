import { Component, EventEmitter, Input, Output } from '@angular/core';
import { OffersPanel, OfferItem, OfferFormValue } from '../offers-panel/offers-panel';
import { ConsoleWishlistItem } from '../../../core/models/console-wishlist.model';
import { videoStandardLabel } from '../../../core/constants/game-state.constants';
import { toDateInputValue } from '../../../core/utils/date.util';

// Vue détaillée d'une console recherchée (§3.5), ouverte au clic sur la carte plutôt que d'empiler
// les boutons directement dessus (retour utilisateur) : infos + offres + actions, tout en un seul endroit.
@Component({
  selector: 'app-console-wishlist-detail-modal',
  imports: [OffersPanel],
  templateUrl: './console-wishlist-detail-modal.html',
  styleUrl: './console-wishlist-detail-modal.scss',
})
export class ConsoleWishlistDetailModal {
  @Input({ required: true }) item!: ConsoleWishlistItem;
  @Input() offers: OfferItem[] = [];
  @Input() offersSubmitting = false;

  protected readonly videoStandardLabel = videoStandardLabel;
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
}
