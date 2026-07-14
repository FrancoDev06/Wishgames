import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { WISHLIST_STATUS_COLUMNS, WishlistStatus, WishlistStatusColumn } from '../../../core/constants/wishlist-status.constants';

// Forme commune à WishlistItem (jeux) et ConsoleWishlistItem (matériel) — le composant est
// agnostique de l'entité, le parent (Wishlist / Consoles) fait le mapping vers cette forme,
// même principe que OffersPanel (agnostique jeu/console via [itemKind]).
export interface KanbanCardData {
  id: string;
  title: string;
  subtitle: string | null;
  coverUrl: string | null;
  nb_priority: number | null;
  ll_status: WishlistStatus;
}

// Vue "Chasse" (kanban, refonte Wishlist §0) : une colonne par étape de recherche, glisser-déposer
// pour faire avancer un item. La colonne "Acheté" n'est jamais un statut réellement persisté par un
// dépôt de carte — elle déclenche le flux d'achat existant (buyRequested) à la place, qui seul
// retire l'item de la wishlist (voir justification dans la migration 0009 et le composant parent).
@Component({
  selector: 'app-wishlist-kanban',
  imports: [DragDropModule],
  templateUrl: './wishlist-kanban.html',
  styleUrl: './wishlist-kanban.scss',
})
export class WishlistKanban implements OnChanges {
  @Input() cards: KanbanCardData[] = [];

  @Output() statusChanged = new EventEmitter<{ id: string; ll_status: WishlistStatus }>();
  @Output() buyRequested = new EventEmitter<string>();
  @Output() cardClicked = new EventEmitter<string>();

  protected readonly columnDefs: WishlistStatusColumn[] = WISHLIST_STATUS_COLUMNS;
  protected readonly connectedListIds = WISHLIST_STATUS_COLUMNS.map((c) => c.value);

  // Copie locale mutable par colonne : CDK a besoin d'un tableau qu'il peut réordonner pendant le
  // drag. Resynchronisée à chaque changement de [cards] (ex. après une mise à jour optimiste côté
  // parent), ce qui écrase proprement tout état intermédiaire du drag une fois l'action retombée.
  protected columns: Record<WishlistStatus, KanbanCardData[]> = { SEARCHING: [], SPOTTED: [], NEGOTIATING: [], BOUGHT: [] };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cards']) this.rebuildColumns();
  }

  private rebuildColumns(): void {
    const next: Record<WishlistStatus, KanbanCardData[]> = { SEARCHING: [], SPOTTED: [], NEGOTIATING: [], BOUGHT: [] };
    for (const card of this.cards) {
      // BOUGHT n'existe jamais en pratique côté données (jamais persisté), mais on garde la
      // colonne prête à l'affichage pour rester cohérente avec columnDefs.
      (next[card.ll_status] ??= []).push(card);
    }
    this.columns = next;
  }

  protected onDrop(event: CdkDragDrop<KanbanCardData[]>, targetStatus: WishlistStatus): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    const card = event.previousContainer.data[event.previousIndex];

    if (targetStatus === 'BOUGHT') {
      // Ne rien déplacer localement : sans mutation des tableaux liés, CDK ramène la carte à sa
      // position d'origine automatiquement. Le parent ouvre la modale d'achat existante.
      this.buyRequested.emit(card.id);
      return;
    }

    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    this.statusChanged.emit({ id: card.id, ll_status: targetStatus });
  }

  protected onCardClick(card: KanbanCardData): void {
    this.cardClicked.emit(card.id);
  }
}
