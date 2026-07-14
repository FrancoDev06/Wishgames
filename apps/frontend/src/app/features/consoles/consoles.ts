import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { PlatformService } from '../../core/services/platform.service';
import { ConsoleCollectionService } from '../../core/services/console-collection.service';
import { ConsoleWishlistService, ConsoleBuyPayload } from '../../core/services/console-wishlist.service';
import { ConsoleWishlistOfferService } from '../../core/services/console-wishlist-offer.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConsoleOption } from '../../core/models/game.model';
import { ConsoleCollectionItem } from '../../core/models/console-collection.model';
import { ConsoleWishlistItem } from '../../core/models/console-wishlist.model';
import { ConsoleFormModal, ConsoleFormValue } from '../../shared/components/console-form-modal/console-form-modal';
import {
  ConsoleWishlistFormModal,
  ConsoleWishlistFormValue,
} from '../../shared/components/console-wishlist-form-modal/console-wishlist-form-modal';
import { ConsoleWishlistDetailModal } from '../../shared/components/console-wishlist-detail-modal/console-wishlist-detail-modal';
import { OfferItem, OfferFormValue } from '../../shared/components/offers-panel/offers-panel';
import { ConfirmModal } from '../../shared/components/confirm-modal/confirm-modal';
import { WishlistKanban, KanbanCardData } from '../../shared/components/wishlist-kanban/wishlist-kanban';
import { completenessLabel, conditionLabel, videoStandardLabel } from '../../core/constants/game-state.constants';
import { consoleColor } from '../../core/constants/console-colors.constant';
import { WishlistStatus } from '../../core/constants/wishlist-status.constants';
import { toDateInputValue } from '../../core/utils/date.util';
import { consolePhotoUrl } from '../../core/utils/console-photo.util';
import { environment } from '../../../environments/environments';

export type Tab = 'collection' | 'wishlist';
export type ViewMode = 'grid' | 'list';
export type WishlistDisplayMode = 'cards' | 'kanban';

// Consoles physiques (§3.5) : suivi du matériel lui-même, distinct du catalogue de jeux. Une seule
// ligne possible par console (pas de suivi multi-région pour le matériel, §9) — le picker de tuiles
// exclut donc les consoles déjà possédées/recherchées, comme demandé par l'utilisateur pour les jeux.
@Component({
  selector: 'app-consoles',
  imports: [ConsoleFormModal, ConsoleWishlistFormModal, ConsoleWishlistDetailModal, ConfirmModal, WishlistKanban],
  templateUrl: './consoles.html',
  styleUrl: './consoles.scss',
})
export class Consoles implements OnInit {
  private readonly platformService = inject(PlatformService);
  private readonly consoleCollectionService = inject(ConsoleCollectionService);
  private readonly consoleWishlistService = inject(ConsoleWishlistService);
  private readonly consoleWishlistOfferService = inject(ConsoleWishlistOfferService);
  private readonly notificationService = inject(NotificationService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly tab = signal<Tab>('collection');
  protected readonly viewMode = signal<ViewMode>('grid');
  protected readonly wishlistDisplayMode = signal<WishlistDisplayMode>('cards');

  protected readonly allConsoles = signal<ConsoleOption[]>([]);
  protected readonly collectionItems = signal<ConsoleCollectionItem[]>([]);
  protected readonly wishlistItems = signal<ConsoleWishlistItem[]>([]);

  private readonly ownedConsoleIds = computed(() => new Set(this.collectionItems().map((i) => i.id_console)));
  private readonly wishlistedConsoleIds = computed(() => new Set(this.wishlistItems().map((i) => i.id_console)));

  protected readonly consolesToAddCollection = computed(() =>
    this.allConsoles().filter((c) => !this.ownedConsoleIds().has(c.id)),
  );
  protected readonly consolesToAddWishlist = computed(() =>
    this.allConsoles().filter((c) => !this.ownedConsoleIds().has(c.id) && !this.wishlistedConsoleIds().has(c.id)),
  );

  protected readonly addConsoleTarget = signal<ConsoleOption | null>(null);
  protected readonly addConsoleSubmitting = signal(false);

  protected readonly wishlistConsoleTarget = signal<ConsoleOption | null>(null);
  protected readonly wishlistConsoleSubmitting = signal(false);

  protected readonly buyTarget = signal<ConsoleWishlistItem | null>(null);
  protected readonly buySubmitting = signal(false);

  protected readonly editCollectionTarget = signal<ConsoleCollectionItem | null>(null);
  protected readonly editCollectionSubmitting = signal(false);

  protected readonly editWishlistTarget = signal<ConsoleWishlistItem | null>(null);
  protected readonly editWishlistSubmitting = signal(false);

  protected readonly deleteCollectionTarget = signal<ConsoleCollectionItem | null>(null);
  protected readonly deleteCollectionSubmitting = signal(false);

  protected readonly deleteWishlistTarget = signal<ConsoleWishlistItem | null>(null);
  protected readonly deleteWishlistSubmitting = signal(false);

  // Vue détaillée (clic sur la carte wishlist, retour utilisateur) : regroupe infos + offres +
  // actions, remplace l'ancienne rangée de boutons directement sur la carte (côté wishlist
  // uniquement — la carte Collection reste inchangée, jugée satisfaisante telle quelle).
  protected readonly detailTarget = signal<ConsoleWishlistItem | null>(null);
  protected readonly offers = signal<OfferItem[]>([]);
  protected readonly offersSubmitting = signal(false);

  // Vue Chasse (kanban) sur l'onglet Wishlist — même composant partagé que la Wishlist jeux
  // (WishlistKanban est agnostique jeux/consoles, cf. wishlist-kanban.ts).
  protected readonly kanbanCards = computed<KanbanCardData[]>(() =>
    this.wishlistItems().map((item) => ({
      id: item.id,
      title: item.console_name,
      subtitle: null,
      coverUrl: null,
      nb_priority: null,
      ll_status: item.ll_status,
    })),
  );

  private readonly coverOrigin = environment.apiOrigin;

  protected readonly consoleColor = consoleColor;

  protected consolePhotoUrl(slug: string): string {
    return consolePhotoUrl(slug, this.coverOrigin);
  }

  protected readonly completenessLabel = completenessLabel;
  protected readonly conditionLabel = conditionLabel;
  protected readonly videoStandardLabel = videoStandardLabel;
  protected readonly formatDate = toDateInputValue;

  ngOnInit(): void {
    forkJoin({
      consoles: this.platformService.list(),
      collection: this.consoleCollectionService.list(),
      wishlist: this.consoleWishlistService.list(),
    }).subscribe({
      next: ({ consoles, collection, wishlist }) => {
        this.allConsoles.set(consoles.data);
        this.collectionItems.set(collection.data);
        this.wishlistItems.set(wishlist.data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("Impossible de charger les consoles. Vérifie que l'API tourne (bun run start).");
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

  protected setWishlistDisplayMode(mode: WishlistDisplayMode): void {
    this.wishlistDisplayMode.set(mode);
  }

  protected openAddConsole(console: ConsoleOption): void {
    this.addConsoleTarget.set(console);
  }

  protected closeAddConsole(): void {
    this.addConsoleTarget.set(null);
  }

  protected submitAddConsole(value: ConsoleFormValue): void {
    const console = this.addConsoleTarget();
    if (!console) return;

    this.addConsoleSubmitting.set(true);
    this.consoleCollectionService.create({ id_console: console.id, ...value }).subscribe({
      next: (response) => {
        // La réponse de "create" est la ligne brute (RETURNING *, sans jointure console) — on
        // complète avec les infos déjà connues de la tuile cliquée.
        this.collectionItems.update((list) => [
          ...list,
          { ...response.data, console_slug: console.ll_slug, console_name: console.ll_name },
        ]);
        this.notificationService.success(`« ${console.ll_name} » ajoutée à la collection.`);
        this.addConsoleSubmitting.set(false);
        this.closeAddConsole();
      },
      error: () => {
        this.notificationService.error("Échec de l'ajout de la console.");
        this.addConsoleSubmitting.set(false);
      },
    });
  }

  protected openDeleteCollection(item: ConsoleCollectionItem): void {
    this.deleteCollectionTarget.set(item);
  }

  protected closeDeleteCollection(): void {
    this.deleteCollectionTarget.set(null);
  }

  protected confirmDeleteCollection(): void {
    const item = this.deleteCollectionTarget();
    if (!item) return;

    this.deleteCollectionSubmitting.set(true);
    this.consoleCollectionService.delete(item.id).subscribe({
      next: () => {
        this.collectionItems.update((list) => list.filter((i) => i.id !== item.id));
        this.notificationService.success(`« ${item.console_name} » supprimée de la collection.`);
        this.deleteCollectionSubmitting.set(false);
        this.closeDeleteCollection();
      },
      error: () => {
        this.notificationService.error('Échec de la suppression.');
        this.deleteCollectionSubmitting.set(false);
      },
    });
  }

  protected openAddWishlistConsole(console: ConsoleOption): void {
    this.wishlistConsoleTarget.set(console);
  }

  protected closeAddWishlistConsole(): void {
    this.wishlistConsoleTarget.set(null);
  }

  protected submitAddWishlistConsole(value: ConsoleWishlistFormValue): void {
    const console = this.wishlistConsoleTarget();
    if (!console) return;

    this.wishlistConsoleSubmitting.set(true);
    this.consoleWishlistService.create({ id_console: console.id, ...value }).subscribe({
      next: (response) => {
        this.wishlistItems.update((list) => [
          ...list,
          { ...response.data, console_slug: console.ll_slug, console_name: console.ll_name, nb_offers: 0 },
        ]);
        this.notificationService.success(`« ${console.ll_name} » ajoutée à la wishlist.`);
        this.wishlistConsoleSubmitting.set(false);
        this.closeAddWishlistConsole();
      },
      error: () => {
        this.notificationService.error("Échec de l'ajout à la wishlist.");
        this.wishlistConsoleSubmitting.set(false);
      },
    });
  }

  protected openDeleteWishlist(item: ConsoleWishlistItem): void {
    this.deleteWishlistTarget.set(item);
  }

  protected closeDeleteWishlist(): void {
    this.deleteWishlistTarget.set(null);
  }

  protected confirmDeleteWishlist(): void {
    const item = this.deleteWishlistTarget();
    if (!item) return;

    this.deleteWishlistSubmitting.set(true);
    this.consoleWishlistService.delete(item.id).subscribe({
      next: () => {
        this.wishlistItems.update((list) => list.filter((i) => i.id !== item.id));
        this.notificationService.success(`« ${item.console_name} » retirée de la wishlist.`);
        this.deleteWishlistSubmitting.set(false);
        this.closeDeleteWishlist();
      },
      error: () => {
        this.notificationService.error('Échec de la suppression.');
        this.deleteWishlistSubmitting.set(false);
      },
    });
  }

  protected openBuy(item: ConsoleWishlistItem): void {
    this.buyTarget.set(item);
  }

  protected closeBuy(): void {
    this.buyTarget.set(null);
  }

  protected submitBuy(value: ConsoleBuyPayload): void {
    const item = this.buyTarget();
    if (!item) return;

    this.buySubmitting.set(true);
    this.consoleWishlistService.buy(item.id, value).subscribe({
      next: (response) => {
        // La réponse de "buy" est la ligne brute ref_console_collection (pas de jointure console) —
        // on complète avec les infos déjà connues de la ligne wishlist qu'on vient de transformer.
        this.wishlistItems.update((list) => list.filter((i) => i.id !== item.id));
        this.collectionItems.update((list) => [
          ...list,
          { ...response.data, console_slug: item.console_slug, console_name: item.console_name },
        ]);
        this.notificationService.success(`« ${item.console_name} » ajoutée à la collection.`);
        this.buySubmitting.set(false);
        this.closeBuy();
      },
      error: () => {
        this.notificationService.error("Échec de l'achat.");
        this.buySubmitting.set(false);
      },
    });
  }

  protected asCollectionEditValue(item: ConsoleCollectionItem): ConsoleFormValue {
    return {
      ll_completeness: item.ll_completeness,
      ll_condition_overall: item.ll_condition_overall,
      ll_video_standard: item.ll_video_standard,
      flag_with_cables: item.flag_with_cables,
      flag_with_controller: item.flag_with_controller,
      nb_price_paid: item.nb_price_paid,
      ll_purchase_location: item.ll_purchase_location,
      ts_acquired: item.ts_acquired,
      nb_quantity: item.nb_quantity,
      ll_notes: item.ll_notes,
    };
  }

  protected openEditCollection(item: ConsoleCollectionItem): void {
    this.editCollectionTarget.set(item);
  }

  protected closeEditCollection(): void {
    this.editCollectionTarget.set(null);
  }

  protected submitEditCollection(value: ConsoleFormValue): void {
    const item = this.editCollectionTarget();
    if (!item) return;

    this.editCollectionSubmitting.set(true);
    this.consoleCollectionService.update(item.id, value).subscribe({
      next: (response) => {
        this.collectionItems.update((list) => list.map((i) => (i.id === item.id ? { ...i, ...response.data } : i)));
        this.notificationService.success(`« ${item.console_name} » mise à jour.`);
        this.editCollectionSubmitting.set(false);
        this.closeEditCollection();
      },
      error: () => {
        this.notificationService.error('Échec de la mise à jour.');
        this.editCollectionSubmitting.set(false);
      },
    });
  }

  protected asWishlistEditValue(item: ConsoleWishlistItem): ConsoleWishlistFormValue {
    return {
      ll_desired_video_standard: item.ll_desired_video_standard,
      ts_last_checked: item.ts_last_checked,
    };
  }

  protected openEditWishlist(item: ConsoleWishlistItem): void {
    this.editWishlistTarget.set(item);
  }

  protected closeEditWishlist(): void {
    this.editWishlistTarget.set(null);
  }

  protected submitEditWishlist(value: ConsoleWishlistFormValue): void {
    const item = this.editWishlistTarget();
    if (!item) return;

    this.editWishlistSubmitting.set(true);
    this.consoleWishlistService.update(item.id, value).subscribe({
      next: (response) => {
        this.wishlistItems.update((list) => list.map((i) => (i.id === item.id ? { ...i, ...response.data } : i)));
        this.notificationService.success(`« ${item.console_name} » mise à jour.`);
        this.editWishlistSubmitting.set(false);
        this.closeEditWishlist();
      },
      error: () => {
        this.notificationService.error('Échec de la mise à jour.');
        this.editWishlistSubmitting.set(false);
      },
    });
  }

  protected openDetail(item: ConsoleWishlistItem): void {
    this.detailTarget.set(item);
    this.offers.set([]);
    this.consoleWishlistOfferService.list(item.id).subscribe({
      next: (response) => this.offers.set(response.data),
      error: () => this.notificationService.error('Impossible de charger les offres.'),
    });
  }

  protected closeDetail(): void {
    this.detailTarget.set(null);
  }

  private findWishlistItem(id: string): ConsoleWishlistItem | undefined {
    return this.wishlistItems().find((i) => i.id === id);
  }

  protected onKanbanCardClicked(id: string): void {
    const item = this.findWishlistItem(id);
    if (item) this.openDetail(item);
  }

  // Même logique que côté jeux (wishlist.ts) : "Acheté" ouvre la modale d'achat existante au lieu
  // d'écrire un statut, voir migration 0009.
  protected onKanbanBuyRequested(id: string): void {
    const item = this.findWishlistItem(id);
    if (item) this.openBuy(item);
  }

  protected onKanbanStatusChanged(event: { id: string; ll_status: WishlistStatus }): void {
    const previous = this.findWishlistItem(event.id)?.ll_status;
    if (!previous) return;

    this.wishlistItems.update((list) => list.map((i) => (i.id === event.id ? { ...i, ll_status: event.ll_status } : i)));
    this.consoleWishlistService.update(event.id, { ll_status: event.ll_status }).subscribe({
      error: () => {
        this.wishlistItems.update((list) => list.map((i) => (i.id === event.id ? { ...i, ll_status: previous } : i)));
        this.notificationService.error('Échec de la mise à jour du statut.');
      },
    });
  }

  // Les actions Modifier/Acheter/Supprimer se lancent depuis la vue détail : on la referme d'abord
  // pour ne pas empiler les modales (Supprimer ouvre sa propre confirmation stylée, ConfirmModal).
  protected editFromDetail(): void {
    const item = this.detailTarget();
    this.closeDetail();
    if (item) this.openEditWishlist(item);
  }

  protected buyFromDetail(): void {
    const item = this.detailTarget();
    this.closeDetail();
    if (item) this.openBuy(item);
  }

  protected deleteFromDetail(): void {
    const item = this.detailTarget();
    this.closeDetail();
    if (item) this.openDeleteWishlist(item);
  }

  protected addOffer(value: OfferFormValue): void {
    const item = this.detailTarget();
    if (!item) return;

    this.offersSubmitting.set(true);
    this.consoleWishlistOfferService.create(item.id, value).subscribe({
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
    this.wishlistItems.update((list) => list.map((i) => (i.id === itemId ? { ...i, nb_offers: i.nb_offers + delta } : i)));
  }

  protected updateOffer(event: { id: string; value: OfferFormValue }): void {
    this.consoleWishlistOfferService.update(event.id, event.value).subscribe({
      next: (response) => {
        this.offers.update((list) => list.map((o) => (o.id === event.id ? response.data : o)));
      },
      error: () => this.notificationService.error("Échec de la mise à jour de l'offre."),
    });
  }

  protected deleteOffer(id: string): void {
    const item = this.detailTarget();
    this.consoleWishlistOfferService.delete(id).subscribe({
      next: () => {
        this.offers.update((list) => list.filter((o) => o.id !== id));
        if (item) this.updateOffersCount(item.id, -1);
      },
      error: () => this.notificationService.error("Échec de la suppression de l'offre."),
    });
  }
}
