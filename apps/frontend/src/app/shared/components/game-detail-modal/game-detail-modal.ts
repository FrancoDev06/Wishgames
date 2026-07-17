import { Component, EventEmitter, Input, Output } from '@angular/core';
import { GameListItem } from '../../../core/models/game.model';
import { regionShortLabel } from '../../../core/constants/game-state.constants';

// Vue détaillée d'une édition régionale précise du catalogue (une ligne = une région, §2bis),
// ouverte au clic sur la carte (retour utilisateur : on ne savait pas dans quelle région un jeu
// est disponible, et cliquer sur une carte ne faisait rien) — métadonnées catalogue (année, genres,
// note, description...) + statut collection/wishlist pour CETTE édition, mêmes actions rapides que
// la carte (+ Collection / + Wishlist).
@Component({
  selector: 'app-game-detail-modal',
  imports: [],
  templateUrl: './game-detail-modal.html',
  styleUrl: './game-detail-modal.scss',
})
export class GameDetailModal {
  @Input({ required: true }) game!: GameListItem;
  @Input() coverUrl: string | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() addToCollectionRequested = new EventEmitter<void>();
  @Output() addToWishlistRequested = new EventEmitter<void>();

  protected close(): void {
    this.closed.emit();
  }

  protected regionLabel(): string | null {
    return this.game.region ? regionShortLabel(this.game.region) : null;
  }
}
