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
import { consoleColor } from '../../core/constants/console-colors.constant';
import { resolveCoverUrl } from '../../core/utils/cover-url.util';
import { consolePhotoUrl } from '../../core/utils/console-photo.util';
import { regionShortLabel } from '../../core/constants/game-state.constants';

export type ViewMode = 'grid' | 'list';
export type StatusOption = GameStatusFilter | 'all';

const PAGE_SIZE = 60;

@Component({
  selector: 'app-catalogue',
  imports: [CollectionFormModal, WishlistFormModal],
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

  // Suivi multi-région (§9) : tant qu'il reste au moins une région du catalogue non encore
  // possédée, le bouton "+ Collection" reste proposé à côté du badge "En collection" — masqué
  // seulement une fois toutes les éditions disponibles possédées (ou d'office pour un jeu à
  // édition unique déjà possédée).
  protected hasMoreRegions(game: GameListItem): boolean {
    return game.owned_regions.length < Math.max(game.available_regions.length, 1);
  }

  protected ownedRegionsLabel(game: GameListItem): string {
    return game.owned_regions.map(regionShortLabel).join(', ');
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
        this.games.update((list) => list.map((g) => (g.id === game.id ? { ...g, in_wishlist: true } : g)));
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
        this.games.update((list) =>
          list.map((g) =>
            g.id === game.id
              ? {
                  ...g,
                  in_collection: true,
                  owned_regions: value.ll_region ? [...g.owned_regions, value.ll_region] : g.owned_regions,
                }
              : g,
          ),
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
