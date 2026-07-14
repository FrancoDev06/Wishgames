import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environments';
import { WishlistService } from '../../core/services/wishlist.service';
import { WishlistOfferService } from '../../core/services/wishlist-offer.service';
import { NotificationService } from '../../core/services/notification.service';
import { WishlistItem } from '../../core/models/wishlist.model';
import { CollectionFormModal, CollectionFormValue } from '../../shared/components/collection-form-modal/collection-form-modal';
import { WishlistFormModal, WishlistFormValue } from '../../shared/components/wishlist-form-modal/wishlist-form-modal';
import { WishlistDetailModal } from '../../shared/components/wishlist-detail-modal/wishlist-detail-modal';
import { OfferItem, OfferFormValue } from '../../shared/components/offers-panel/offers-panel';
import { ConfirmModal } from '../../shared/components/confirm-modal/confirm-modal';
import { WishlistKanban, KanbanCardData } from '../../shared/components/wishlist-kanban/wishlist-kanban';
import { WishlistPriceView } from '../../shared/components/wishlist-price-view/wishlist-price-view';
import { resolveCoverUrl } from '../../core/utils/cover-url.util';
import { completenessLabel, conditionLabel } from '../../core/constants/game-state.constants';
import { WishlistStatus } from '../../core/constants/wishlist-status.constants';

export type ViewMode = 'grid' | 'list';
export type DisplayMode = 'cards' | 'kanban' | 'prices';
export type SortOption = 'priority' | 'date-desc' | 'date-asc' | 'title';

export interface ConsoleGroup {
  consoleName: string;
  items: WishlistItem[];
}

const SORT_COMPARATORS: Record<SortOption, (a: WishlistItem, b: WishlistItem) => number> = {
  priority: (a, b) => (b.nb_priority ?? -1) - (a.nb_priority ?? -1) || b.ts_create.localeCompare(a.ts_create),
  'date-desc': (a, b) => b.ts_create.localeCompare(a.ts_create),
  'date-asc': (a, b) => a.ts_create.localeCompare(b.ts_create),
  title: (a, b) => a.title.localeCompare(b.title),
};

@Component({
  selector: 'app-wishlist',
  imports: [CollectionFormModal, WishlistFormModal, WishlistDetailModal, ConfirmModal, WishlistKanban, WishlistPriceView],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.scss',
})
export class Wishlist implements OnInit {
  private readonly wishlistService = inject(WishlistService);
  private readonly wishlistOfferService = inject(WishlistOfferService);
  private readonly notificationService = inject(NotificationService);
  private readonly coverOrigin = environment.apiOrigin;

  protected readonly priorityLevels = [1, 2, 3, 4, 5];

  protected readonly items = signal<WishlistItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly viewMode = signal<ViewMode>('grid');
  protected readonly displayMode = signal<DisplayMode>('cards');

  protected readonly searchText = signal('');
  protected readonly sortBy = signal<SortOption>('priority');

  protected readonly buyTarget = signal<WishlistItem | null>(null);
  protected readonly buySubmitting = signal(false);

  protected readonly editTarget = signal<WishlistItem | null>(null);
  protected readonly editSubmitting = signal(false);

  protected readonly deleteTarget = signal<WishlistItem | null>(null);
  protected readonly deleteSubmitting = signal(false);

  // Vue détaillée (clic sur la carte, retour utilisateur) : regroupe infos + offres + actions,
  // remplace l'ancienne rangée de boutons directement sur la carte.
  protected readonly detailTarget = signal<WishlistItem | null>(null);
  protected readonly offers = signal<OfferItem[]>([]);
  protected readonly offersSubmitting = signal(false);

  // Recherche (titre) + tri appliqués à l'intérieur de chaque groupe console — l'arborescence
  // par console (§3.1) reste la structure de base, recherche/tri filtrent/ordonnent son contenu.
  protected readonly filteredSorted = computed<WishlistItem[]>(() => {
    const search = this.searchText().trim().toLowerCase();
    const comparator = SORT_COMPARATORS[this.sortBy()];
    const filtered = search ? this.items().filter((item) => item.title.toLowerCase().includes(search)) : this.items();
    return [...filtered].sort(comparator);
  });

  // Organisation par console (arborescence console -> jeux, §3.1) : un titre de section par console.
  protected readonly groups = computed<ConsoleGroup[]>(() => {
    const byConsole = new Map<string, WishlistItem[]>();
    for (const item of this.filteredSorted()) {
      const group = byConsole.get(item.console_name) ?? [];
      group.push(item);
      byConsole.set(item.console_name, group);
    }
    return [...byConsole.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([consoleName, groupItems]) => ({ consoleName, items: groupItems }));
  });

  // Vue Chasse (kanban) : mappe filteredSorted (recherche/tri restent actifs) vers la forme
  // générique attendue par WishlistKanban (agnostique jeux/consoles).
  protected readonly kanbanCards = computed<KanbanCardData[]>(() =>
    this.filteredSorted().map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: item.console_name,
      coverUrl: this.coverUrl(item),
      nb_priority: item.nb_priority,
      ll_status: item.ll_status,
    }))
  );

  ngOnInit(): void {
    this.fetch();
  }

  private fetch(): void {
    this.loading.set(true);
    this.wishlistService.list().subscribe({
      next: (response) => {
        this.items.set(response.data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("Impossible de charger la wishlist. Vérifie que l'API tourne (bun run start).");
        this.loading.set(false);
      },
    });
  }

  protected setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  protected setDisplayMode(mode: DisplayMode): void {
    this.displayMode.set(mode);
  }

  protected onSearchChange(value: string): void {
    this.searchText.set(value);
  }

  protected onSortChange(value: string): void {
    this.sortBy.set(value as SortOption);
  }

  protected coverUrl(item: WishlistItem): string | null {
    return resolveCoverUrl(item.cover_front_url, this.coverOrigin);
  }

  protected regionsLabel(item: WishlistItem): string {
    return item.ll_desired_regions.join(' · ');
  }

  protected completenessLabel(value: string): string {
    return completenessLabel(value);
  }

  protected conditionLabel(value: string): string {
    return conditionLabel(value);
  }

  protected openBuy(item: WishlistItem): void {
    this.buyTarget.set(item);
  }

  protected closeBuy(): void {
    this.buyTarget.set(null);
  }

  protected submitBuy(value: CollectionFormValue): void {
    const item = this.buyTarget();
    if (!item) return;

    this.buySubmitting.set(true);
    this.wishlistService.buy(item.id, value).subscribe({
      next: () => {
        this.items.update((list) => list.filter((i) => i.id !== item.id));
        this.notificationService.success(`« ${item.title} » ajouté à la collection.`);
        this.buySubmitting.set(false);
        this.closeBuy();
      },
      error: () => {
        this.notificationService.error("Échec de l'achat. Vérifie les champs et réessaie.");
        this.buySubmitting.set(false);
      },
    });
  }

  protected asEditValue(item: WishlistItem): WishlistFormValue {
    return {
      ll_desired_regions: item.ll_desired_regions,
      ll_desired_completeness: item.ll_desired_completeness,
      ll_desired_condition: item.ll_desired_condition,
      nb_priority: item.nb_priority,
      ts_last_checked: item.ts_last_checked,
    };
  }

  protected openEdit(item: WishlistItem): void {
    this.editTarget.set(item);
  }

  protected closeEdit(): void {
    this.editTarget.set(null);
  }

  protected submitEdit(value: WishlistFormValue): void {
    const item = this.editTarget();
    if (!item) return;

    this.editSubmitting.set(true);
    this.wishlistService.update(item.id, value).subscribe({
      next: (response) => {
        this.items.update((list) => list.map((i) => (i.id === item.id ? { ...i, ...response.data } : i)));
        this.notificationService.success(`« ${item.title} » mis à jour.`);
        this.editSubmitting.set(false);
        this.closeEdit();
      },
      error: () => {
        this.notificationService.error('Échec de la mise à jour.');
        this.editSubmitting.set(false);
      },
    });
  }

  protected openDelete(item: WishlistItem): void {
    this.deleteTarget.set(item);
  }

  protected closeDelete(): void {
    this.deleteTarget.set(null);
  }

  protected confirmDelete(): void {
    const item = this.deleteTarget();
    if (!item) return;

    this.deleteSubmitting.set(true);
    this.wishlistService.delete(item.id).subscribe({
      next: () => {
        this.items.update((list) => list.filter((i) => i.id !== item.id));
        this.notificationService.success(`« ${item.title} » retiré de la wishlist.`);
        this.deleteSubmitting.set(false);
        this.closeDelete();
      },
      error: () => {
        this.notificationService.error('Échec de la suppression.');
        this.deleteSubmitting.set(false);
      },
    });
  }

  protected openDetail(item: WishlistItem): void {
    this.detailTarget.set(item);
    this.offers.set([]);
    this.wishlistOfferService.list(item.id).subscribe({
      next: (response) => this.offers.set(response.data),
      error: () => this.notificationService.error('Impossible de charger les offres.'),
    });
  }

  protected closeDetail(): void {
    this.detailTarget.set(null);
  }

  private findItem(id: string): WishlistItem | undefined {
    return this.items().find((i) => i.id === id);
  }

  protected onKanbanCardClicked(id: string): void {
    const item = this.findItem(id);
    if (item) this.openDetail(item);
  }

  protected onPriceItemClicked(id: string): void {
    const item = this.findItem(id);
    if (item) this.openDetail(item);
  }

  // Glisser-déposer sur "Acheté" (vue Chasse) : ouvre directement la modale d'achat existante au
  // lieu d'écrire un statut — voir migration 0009 pour la justification (BOUGHT n'est jamais une
  // donnée persistée par un simple déplacement de carte).
  protected onKanbanBuyRequested(id: string): void {
    const item = this.findItem(id);
    if (item) this.openBuy(item);
  }

  // Mise à jour optimiste + rollback en cas d'échec, même pattern que submitEdit/confirmDelete.
  protected onKanbanStatusChanged(event: { id: string; ll_status: WishlistStatus }): void {
    const previous = this.findItem(event.id)?.ll_status;
    if (!previous) return;

    this.items.update((list) => list.map((i) => (i.id === event.id ? { ...i, ll_status: event.ll_status } : i)));
    this.wishlistService.update(event.id, { ll_status: event.ll_status }).subscribe({
      error: () => {
        this.items.update((list) => list.map((i) => (i.id === event.id ? { ...i, ll_status: previous } : i)));
        this.notificationService.error('Échec de la mise à jour du statut.');
      },
    });
  }

  // Les actions Modifier/Acheter/Supprimer se lancent depuis la vue détail : on la referme d'abord
  // pour ne pas empiler les modales (Supprimer ouvre sa propre confirmation stylée, ConfirmModal).
  protected editFromDetail(): void {
    const item = this.detailTarget();
    this.closeDetail();
    if (item) this.openEdit(item);
  }

  protected buyFromDetail(): void {
    const item = this.detailTarget();
    this.closeDetail();
    if (item) this.openBuy(item);
  }

  protected deleteFromDetail(): void {
    const item = this.detailTarget();
    this.closeDetail();
    if (item) this.openDelete(item);
  }

  protected addOffer(value: OfferFormValue): void {
    const item = this.detailTarget();
    if (!item) return;

    this.offersSubmitting.set(true);
    this.wishlistOfferService.create(item.id, value).subscribe({
      next: (response) => {
        this.offers.update((list) => [...list, response.data]);
        this.updateOffersCount(item.id, 1);
        this.offersSubmitting.set(false);
      },
      error: () => {
        this.notificationService.error("Échec de l'ajout de l'offre.");
        this.offersSubmitting.set(false);
      },
    });
  }

  // Le compteur affiché sur la carte ("Offres (N)") vient de la liste chargée au montage — on
  // l'ajuste localement après ajout/suppression pour ne pas devoir tout recharger.
  private updateOffersCount(itemId: string, delta: number): void {
    this.items.update((list) => list.map((i) => (i.id === itemId ? { ...i, nb_offers: i.nb_offers + delta } : i)));
  }

  protected updateOffer(event: { id: string; value: OfferFormValue }): void {
    this.wishlistOfferService.update(event.id, event.value).subscribe({
      next: (response) => {
        this.offers.update((list) => list.map((o) => (o.id === event.id ? response.data : o)));
      },
      error: () => this.notificationService.error("Échec de la mise à jour de l'offre."),
    });
  }

  protected deleteOffer(id: string): void {
    const item = this.detailTarget();
    this.wishlistOfferService.delete(id).subscribe({
      next: () => {
        this.offers.update((list) => list.filter((o) => o.id !== id));
        if (item) this.updateOffersCount(item.id, -1);
      },
      error: () => this.notificationService.error("Échec de la suppression de l'offre."),
    });
  }
}
