import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { environment } from '../../../environments/environments';
import { WishlistService } from '../../core/services/wishlist.service';
import { WishlistOfferService } from '../../core/services/wishlist-offer.service';
import { PlatformService } from '../../core/services/platform.service';
import { ConsoleWishlistService, ConsoleBuyPayload } from '../../core/services/console-wishlist.service';
import { ConsoleWishlistOfferService } from '../../core/services/console-wishlist-offer.service';
import { NotificationService } from '../../core/services/notification.service';
import { WishlistItem } from '../../core/models/wishlist.model';
import { ConsoleOption } from '../../core/models/game.model';
import { ConsoleWishlistItem } from '../../core/models/console-wishlist.model';
import { CollectionFormModal, CollectionFormValue } from '../../shared/components/collection-form-modal/collection-form-modal';
import { WishlistFormModal, WishlistFormValue } from '../../shared/components/wishlist-form-modal/wishlist-form-modal';
import { WishlistDetailModal } from '../../shared/components/wishlist-detail-modal/wishlist-detail-modal';
import { ConsoleFormModal, ConsoleFormValue } from '../../shared/components/console-form-modal/console-form-modal';
import {
  ConsoleWishlistFormModal,
  ConsoleWishlistFormValue,
} from '../../shared/components/console-wishlist-form-modal/console-wishlist-form-modal';
import { ConsoleWishlistDetailModal } from '../../shared/components/console-wishlist-detail-modal/console-wishlist-detail-modal';
import { OfferItem, OfferFormValue } from '../../shared/components/offers-panel/offers-panel';
import { ConfirmModal } from '../../shared/components/confirm-modal/confirm-modal';
import { WishlistKanban, KanbanCardData } from '../../shared/components/wishlist-kanban/wishlist-kanban';
import { WishlistPriceView } from '../../shared/components/wishlist-price-view/wishlist-price-view';
import { resolveCoverUrl } from '../../core/utils/cover-url.util';
import { consolePhotoUrl } from '../../core/utils/console-photo.util';
import {
  completenessLabel,
  completenessColor,
  conditionLabel,
  conditionColor,
  regionLabel,
  regionColor,
  videoStandardLabel,
} from '../../core/constants/game-state.constants';
import { consoleColor } from '../../core/constants/console-colors.constant';
import { WishlistStatus } from '../../core/constants/wishlist-status.constants';
import { toDateInputValue } from '../../core/utils/date.util';

export type Tab = 'jeux' | 'consoles';
export type ViewMode = 'grid' | 'list';
export type DisplayMode = 'cards' | 'kanban' | 'prices';
export type ConsoleDisplayMode = 'cards' | 'kanban';
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

// Page "Ce que tu aimerais ajouter" : onglet Jeux (déjà existant) + onglet Consoles (repris de
// l'ancienne page /consoles, §refonte design — fusion en 4 pages avec onglet Jeux/Consoles au lieu
// d'une page dédiée, cf. maquette "Éditorial aurora chromée").
@Component({
  selector: 'app-wishlist',
  imports: [
    CollectionFormModal,
    WishlistFormModal,
    WishlistDetailModal,
    ConsoleFormModal,
    ConsoleWishlistFormModal,
    ConsoleWishlistDetailModal,
    ConfirmModal,
    WishlistKanban,
    WishlistPriceView,
  ],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.scss',
})
export class Wishlist implements OnInit {
  private readonly wishlistService = inject(WishlistService);
  private readonly wishlistOfferService = inject(WishlistOfferService);
  private readonly platformService = inject(PlatformService);
  private readonly consoleWishlistService = inject(ConsoleWishlistService);
  private readonly consoleWishlistOfferService = inject(ConsoleWishlistOfferService);
  private readonly notificationService = inject(NotificationService);
  private readonly coverOrigin = environment.apiOrigin;

  protected readonly priorityLevels = [1, 2, 3, 4, 5];

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly tab = signal<Tab>('jeux');
  protected readonly viewMode = signal<ViewMode>('grid');

  // ---------- Jeux ----------
  protected readonly items = signal<WishlistItem[]>([]);
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

  // ---------- Consoles ----------
  protected readonly allConsoles = signal<ConsoleOption[]>([]);
  protected readonly consoleItems = signal<ConsoleWishlistItem[]>([]);
  protected readonly consoleDisplayMode = signal<ConsoleDisplayMode>('cards');

  private readonly wishlistedConsoleIds = computed(() => new Set(this.consoleItems().map((i) => i.id_console)));
  protected readonly consolesToAdd = computed(() => this.allConsoles().filter((c) => !this.wishlistedConsoleIds().has(c.id)));

  protected readonly addConsoleTarget = signal<ConsoleOption | null>(null);
  protected readonly addConsoleSubmitting = signal(false);

  protected readonly buyConsoleTarget = signal<ConsoleWishlistItem | null>(null);
  protected readonly buyConsoleSubmitting = signal(false);

  protected readonly editConsoleTarget = signal<ConsoleWishlistItem | null>(null);
  protected readonly editConsoleSubmitting = signal(false);

  protected readonly deleteConsoleTarget = signal<ConsoleWishlistItem | null>(null);
  protected readonly deleteConsoleSubmitting = signal(false);

  protected readonly consoleDetailTarget = signal<ConsoleWishlistItem | null>(null);
  protected readonly consoleOffers = signal<OfferItem[]>([]);
  protected readonly consoleOffersSubmitting = signal(false);

  protected readonly consoleKanbanCards = computed<KanbanCardData[]>(() =>
    this.consoleItems().map((item) => ({
      id: item.id,
      title: item.console_name,
      subtitle: null,
      coverUrl: null,
      nb_priority: null,
      ll_status: item.ll_status,
    })),
  );

  protected readonly consoleColor = consoleColor;
  protected readonly videoStandardLabel = videoStandardLabel;
  protected readonly formatDate = toDateInputValue;

  protected consolePhotoUrl(slug: string): string {
    return consolePhotoUrl(slug, this.coverOrigin);
  }

  // Pas de garantie que la photo existe (consolePhotoUrl construit toujours une URL) : si elle
  // 404, on la masque pour laisser voir le fond coloré derrière plutôt que l'icône d'image cassée.
  protected hidePhoto(event: Event): void {
    (event.target as HTMLImageElement).style.visibility = 'hidden';
  }

  ngOnInit(): void {
    this.loading.set(true);
    forkJoin({
      games: this.wishlistService.list(),
      consoles: this.platformService.list(),
      consoleWishlist: this.consoleWishlistService.list(),
    }).subscribe({
      next: ({ games, consoles, consoleWishlist }) => {
        this.items.set(games.data);
        this.allConsoles.set(consoles.data);
        this.consoleItems.set(consoleWishlist.data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("Impossible de charger la wishlist. Vérifie que l'API tourne (bun run start).");
        this.loading.set(false);
      },
    });
  }

  protected setTab(tab: Tab): void {
    this.tab.set(tab);
  }

  protected setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  protected setDisplayMode(mode: DisplayMode): void {
    this.displayMode.set(mode);
  }

  protected setConsoleDisplayMode(mode: ConsoleDisplayMode): void {
    this.consoleDisplayMode.set(mode);
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

  protected regionLabel(value: string | null): string {
    return regionLabel(value);
  }

  protected regionColor(value: string | null): string {
    return regionColor(value);
  }

  protected completenessLabel(value: string): string {
    return completenessLabel(value);
  }

  protected completenessColor(value: string): string {
    return completenessColor(value);
  }

  protected conditionLabel(value: string): string {
    return conditionLabel(value);
  }

  protected conditionColor(value: string): string {
    return conditionColor(value);
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
      ll_region: item.ll_region,
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

  // ---------- Consoles : actions ----------
  protected openAddConsole(console: ConsoleOption): void {
    this.addConsoleTarget.set(console);
  }

  protected closeAddConsole(): void {
    this.addConsoleTarget.set(null);
  }

  protected submitAddConsole(value: ConsoleWishlistFormValue): void {
    const console = this.addConsoleTarget();
    if (!console) return;

    this.addConsoleSubmitting.set(true);
    this.consoleWishlistService.create({ id_console: console.id, ...value }).subscribe({
      next: (response) => {
        this.consoleItems.update((list) => [
          ...list,
          { ...response.data, console_slug: console.ll_slug, console_name: console.ll_name, nb_offers: 0 },
        ]);
        this.notificationService.success(`« ${console.ll_name} » ajoutée à la wishlist.`);
        this.addConsoleSubmitting.set(false);
        this.closeAddConsole();
      },
      error: () => {
        this.notificationService.error("Échec de l'ajout à la wishlist.");
        this.addConsoleSubmitting.set(false);
      },
    });
  }

  protected openBuyConsole(item: ConsoleWishlistItem): void {
    this.buyConsoleTarget.set(item);
  }

  protected closeBuyConsole(): void {
    this.buyConsoleTarget.set(null);
  }

  protected submitBuyConsole(value: ConsoleBuyPayload): void {
    const item = this.buyConsoleTarget();
    if (!item) return;

    this.buyConsoleSubmitting.set(true);
    this.consoleWishlistService.buy(item.id, value).subscribe({
      next: () => {
        this.consoleItems.update((list) => list.filter((i) => i.id !== item.id));
        this.notificationService.success(`« ${item.console_name} » ajoutée à la collection.`);
        this.buyConsoleSubmitting.set(false);
        this.closeBuyConsole();
      },
      error: () => {
        this.notificationService.error("Échec de l'achat.");
        this.buyConsoleSubmitting.set(false);
      },
    });
  }

  protected asConsoleEditValue(item: ConsoleWishlistItem): ConsoleWishlistFormValue {
    return {
      ll_desired_video_standard: item.ll_desired_video_standard,
      ts_last_checked: item.ts_last_checked,
    };
  }

  protected openEditConsole(item: ConsoleWishlistItem): void {
    this.editConsoleTarget.set(item);
  }

  protected closeEditConsole(): void {
    this.editConsoleTarget.set(null);
  }

  protected submitEditConsole(value: ConsoleWishlistFormValue): void {
    const item = this.editConsoleTarget();
    if (!item) return;

    this.editConsoleSubmitting.set(true);
    this.consoleWishlistService.update(item.id, value).subscribe({
      next: (response) => {
        this.consoleItems.update((list) => list.map((i) => (i.id === item.id ? { ...i, ...response.data } : i)));
        this.notificationService.success(`« ${item.console_name} » mise à jour.`);
        this.editConsoleSubmitting.set(false);
        this.closeEditConsole();
      },
      error: () => {
        this.notificationService.error('Échec de la mise à jour.');
        this.editConsoleSubmitting.set(false);
      },
    });
  }

  protected openDeleteConsole(item: ConsoleWishlistItem): void {
    this.deleteConsoleTarget.set(item);
  }

  protected closeDeleteConsole(): void {
    this.deleteConsoleTarget.set(null);
  }

  protected confirmDeleteConsole(): void {
    const item = this.deleteConsoleTarget();
    if (!item) return;

    this.deleteConsoleSubmitting.set(true);
    this.consoleWishlistService.delete(item.id).subscribe({
      next: () => {
        this.consoleItems.update((list) => list.filter((i) => i.id !== item.id));
        this.notificationService.success(`« ${item.console_name} » retirée de la wishlist.`);
        this.deleteConsoleSubmitting.set(false);
        this.closeDeleteConsole();
      },
      error: () => {
        this.notificationService.error('Échec de la suppression.');
        this.deleteConsoleSubmitting.set(false);
      },
    });
  }

  protected openConsoleDetail(item: ConsoleWishlistItem): void {
    this.consoleDetailTarget.set(item);
    this.consoleOffers.set([]);
    this.consoleWishlistOfferService.list(item.id).subscribe({
      next: (response) => this.consoleOffers.set(response.data),
      error: () => this.notificationService.error('Impossible de charger les offres.'),
    });
  }

  protected closeConsoleDetail(): void {
    this.consoleDetailTarget.set(null);
  }

  private findConsoleItem(id: string): ConsoleWishlistItem | undefined {
    return this.consoleItems().find((i) => i.id === id);
  }

  protected onConsoleKanbanCardClicked(id: string): void {
    const item = this.findConsoleItem(id);
    if (item) this.openConsoleDetail(item);
  }

  protected onConsoleKanbanBuyRequested(id: string): void {
    const item = this.findConsoleItem(id);
    if (item) this.openBuyConsole(item);
  }

  protected onConsoleKanbanStatusChanged(event: { id: string; ll_status: WishlistStatus }): void {
    const previous = this.findConsoleItem(event.id)?.ll_status;
    if (!previous) return;

    this.consoleItems.update((list) => list.map((i) => (i.id === event.id ? { ...i, ll_status: event.ll_status } : i)));
    this.consoleWishlistService.update(event.id, { ll_status: event.ll_status }).subscribe({
      error: () => {
        this.consoleItems.update((list) => list.map((i) => (i.id === event.id ? { ...i, ll_status: previous } : i)));
        this.notificationService.error('Échec de la mise à jour du statut.');
      },
    });
  }

  protected editConsoleFromDetail(): void {
    const item = this.consoleDetailTarget();
    this.closeConsoleDetail();
    if (item) this.openEditConsole(item);
  }

  protected buyConsoleFromDetail(): void {
    const item = this.consoleDetailTarget();
    this.closeConsoleDetail();
    if (item) this.openBuyConsole(item);
  }

  protected deleteConsoleFromDetail(): void {
    const item = this.consoleDetailTarget();
    this.closeConsoleDetail();
    if (item) this.openDeleteConsole(item);
  }

  protected addConsoleOffer(value: OfferFormValue): void {
    const item = this.consoleDetailTarget();
    if (!item) return;

    this.consoleOffersSubmitting.set(true);
    this.consoleWishlistOfferService.create(item.id, value).subscribe({
      next: (response) => {
        this.consoleOffers.update((list) => [...list, response.data]);
        this.updateConsoleOffersCount(item.id, 1);
        this.consoleOffersSubmitting.set(false);
      },
      error: () => {
        this.notificationService.error("Échec de l'ajout de l'offre.");
        this.consoleOffersSubmitting.set(false);
      },
    });
  }

  private updateConsoleOffersCount(itemId: string, delta: number): void {
    this.consoleItems.update((list) => list.map((i) => (i.id === itemId ? { ...i, nb_offers: i.nb_offers + delta } : i)));
  }

  protected updateConsoleOffer(event: { id: string; value: OfferFormValue }): void {
    this.consoleWishlistOfferService.update(event.id, event.value).subscribe({
      next: (response) => {
        this.consoleOffers.update((list) => list.map((o) => (o.id === event.id ? response.data : o)));
      },
      error: () => this.notificationService.error("Échec de la mise à jour de l'offre."),
    });
  }

  protected deleteConsoleOffer(id: string): void {
    const item = this.consoleDetailTarget();
    this.consoleWishlistOfferService.delete(id).subscribe({
      next: () => {
        this.consoleOffers.update((list) => list.filter((o) => o.id !== id));
        if (item) this.updateConsoleOffersCount(item.id, -1);
      },
      error: () => this.notificationService.error("Échec de la suppression de l'offre."),
    });
  }
}
