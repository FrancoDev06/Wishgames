import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { environment } from '../../../environments/environments';
import { GameService, GameStatusFilter } from '../../core/services/game.service';
import { PlatformService } from '../../core/services/platform.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { CollectionService } from '../../core/services/collection.service';
import { NotificationService } from '../../core/services/notification.service';
import { GameListItem, ConsoleOption } from '../../core/models/game.model';
import { CollectionFormModal, CollectionFormValue } from '../../shared/components/collection-form-modal/collection-form-modal';
import { WishlistFormModal, WishlistFormValue } from '../../shared/components/wishlist-form-modal/wishlist-form-modal';
import { GameDetailModal } from '../../shared/components/game-detail-modal/game-detail-modal';
import { consoleColor } from '../../core/constants/console-colors.constant';
import { resolveCoverUrl } from '../../core/utils/cover-url.util';
import { consolePhotoUrl } from '../../core/utils/console-photo.util';
import { regionShortLabel } from '../../core/constants/game-state.constants';

export type ViewMode = 'grid' | 'list';
export type StatusOption = GameStatusFilter | 'all';

const PAGE_SIZE = 60;

@Component({
  selector: 'app-catalogue',
  imports: [CollectionFormModal, WishlistFormModal, GameDetailModal],
  templateUrl: './catalogue.html',
  styleUrl: './catalogue.scss',
})
export class Catalogue implements OnInit, AfterViewInit, OnDestroy {
  private readonly gameService = inject(GameService);
  private readonly platformService = inject(PlatformService);
  private readonly wishlistService = inject(WishlistService);
  private readonly collectionService = inject(CollectionService);
  private readonly notificationService = inject(NotificationService);
  private readonly coverOrigin = environment.apiOrigin;

  @ViewChild('sentinel') private sentinelRef?: ElementRef<HTMLDivElement>;
  private observer?: IntersectionObserver;
  private readonly searchInput$ = new Subject<string>();
  private offset = 0;

  protected readonly games = signal<GameListItem[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly loadingMore = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly viewMode = signal<ViewMode>('grid');

  protected readonly consoles = signal<ConsoleOption[]>([]);
  protected readonly consoleFilter = signal('');
  protected readonly statusFilter = signal<StatusOption>('all');
  protected readonly searchText = signal('');

  protected readonly hasMore = computed(() => this.games().length < this.total());

  // Vue "par console" (tuiles) tant qu'aucun filtre n'a été activé — c'est l'écran d'accueil du
  // catalogue ; dès qu'une console/recherche/statut est choisi, on bascule sur la liste plate.
  protected readonly showConsolePicker = computed(
    () => !this.consoleFilter() && !this.searchText() && this.statusFilter() === 'all',
  );

  protected readonly selectedConsoleName = computed(() => {
    const slug = this.consoleFilter();
    return this.consoles().find((c) => c.ll_slug === slug)?.ll_name ?? '';
  });

  protected readonly addTarget = signal<GameListItem | null>(null);
  protected readonly addSubmitting = signal(false);

  protected readonly wishlistTarget = signal<GameListItem | null>(null);
  protected readonly wishlistSubmitting = signal(false);

  protected readonly detailTarget = signal<GameListItem | null>(null);

  protected readonly consoleColor = consoleColor;

  protected consolePhotoUrl(slug: string): string {
    return consolePhotoUrl(slug, this.coverOrigin);
  }

  ngOnInit(): void {
    this.platformService.list().subscribe({
      next: (response) => this.consoles.set(response.data),
      error: () => undefined, // le filtre console reste vide, pas bloquant pour le catalogue
    });

    this.searchInput$.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => this.fetchPage(true));

    this.fetchPage(true);
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && this.hasMore() && !this.loading() && !this.loadingMore()) {
          this.fetchPage(false);
        }
      },
      { rootMargin: '600px' },
    );
    if (this.sentinelRef) this.observer.observe(this.sentinelRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private fetchPage(reset: boolean): void {
    if (reset) {
      this.offset = 0;
      this.games.set([]);
      this.loading.set(true);
      this.error.set(null);
    } else {
      this.loadingMore.set(true);
    }

    const status = this.statusFilter();

    this.gameService
      .list({
        console: this.consoleFilter() || undefined,
        status: status === 'all' ? undefined : status,
        search: this.searchText() || undefined,
        limit: PAGE_SIZE,
        offset: this.offset,
      })
      .subscribe({
        next: (response) => {
          this.games.update((list) => (reset ? response.data : [...list, ...response.data]));
          this.total.set(response.additional.total);
          this.offset += response.data.length;
          this.loading.set(false);
          this.loadingMore.set(false);
        },
        error: () => {
          this.error.set("Impossible de charger le catalogue. Vérifie que l'API tourne (bun run start).");
          this.loading.set(false);
          this.loadingMore.set(false);
        },
      });
  }

  protected onSearchChange(value: string): void {
    this.searchText.set(value);
    this.searchInput$.next(value);
  }

  protected setStatusFilter(status: StatusOption): void {
    this.statusFilter.set(status);
    this.fetchPage(true);
  }

  protected onConsoleFilterChange(slug: string): void {
    this.consoleFilter.set(slug);
    this.fetchPage(true);
  }

  protected selectConsole(slug: string): void {
    this.consoleFilter.set(slug);
    this.fetchPage(true);
  }

  protected backToConsoles(): void {
    this.consoleFilter.set('');
    this.statusFilter.set('all');
    this.searchText.set('');
    this.fetchPage(true);
  }

  protected setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  protected coverUrl(game: GameListItem): string | null {
    return resolveCoverUrl(game.cover_front_url, this.coverOrigin);
  }

  // Une carte = une édition régionale précise (§2bis, retour utilisateur : "sur quelle région les
  // jeux sont-ils disponibles ?") — le libellé de région se lit directement sur game.region.
  protected regionLabel(game: GameListItem): string | null {
    return game.region ? regionShortLabel(game.region) : null;
  }

  protected openDetail(game: GameListItem): void {
    this.detailTarget.set(game);
  }

  protected closeDetail(): void {
    this.detailTarget.set(null);
  }

  // Ouvertes depuis la modale de détail : on referme le détail pour ne pas empiler deux modales.
  protected onDetailAddToCollection(): void {
    const game = this.detailTarget();
    if (!game) return;
    this.closeDetail();
    this.openAddToCollection(game);
  }

  protected onDetailAddToWishlist(): void {
    const game = this.detailTarget();
    if (!game) return;
    this.closeDetail();
    this.openAddToWishlist(game);
  }

  protected openAddToWishlist(game: GameListItem): void {
    this.wishlistTarget.set(game);
  }

  protected closeAddToWishlist(): void {
    this.wishlistTarget.set(null);
  }

  protected submitAddToWishlist(value: WishlistFormValue): void {
    const game = this.wishlistTarget();
    if (!game) return;

    this.wishlistSubmitting.set(true);
    this.wishlistService.create({ id_game: game.id, ...value }).subscribe({
      next: () => {
        // Une entrée wishlist vaut pour toutes les régions cochées (ou toutes les éditions si
        // aucune région précisée) : ne marquer "en wishlist" que les cartes concernées, pas
        // toutes les éditions du jeu (une ligne par édition régionale désormais, §2bis).
        this.games.update((list) =>
          list.map((g) =>
            g.id === game.id && (value.ll_desired_regions.length === 0 || (g.region && value.ll_desired_regions.includes(g.region)))
              ? { ...g, in_wishlist: true }
              : g,
          ),
        );
        this.notificationService.success(`« ${game.ll_title} » ajouté à la wishlist.`);
        this.wishlistSubmitting.set(false);
        this.closeAddToWishlist();
      },
      error: () => {
        this.notificationService.error("Échec de l'ajout à la wishlist.");
        this.wishlistSubmitting.set(false);
      },
    });
  }

  protected openAddToCollection(game: GameListItem): void {
    this.addTarget.set(game);
  }

  protected closeAddToCollection(): void {
    this.addTarget.set(null);
  }

  protected submitAddToCollection(value: CollectionFormValue): void {
    const game = this.addTarget();
    if (!game) return;

    this.addSubmitting.set(true);
    this.collectionService.create({ id_game: game.id, ...value }).subscribe({
      next: () => {
        // Une ligne de collection cible une édition régionale précise : ne marquer "en collection"
        // que la carte correspondant à cette région (une ligne par édition régionale, §2bis).
        this.games.update((list) =>
          list.map((g) => (g.id === game.id && g.region === game.region ? { ...g, in_collection: true } : g)),
        );
        this.notificationService.success(`« ${game.ll_title} » ajouté à la collection.`);
        this.addSubmitting.set(false);
        this.closeAddToCollection();
      },
      error: () => {
        this.notificationService.error("Échec de l'ajout à la collection.");
        this.addSubmitting.set(false);
      },
    });
  }
}
