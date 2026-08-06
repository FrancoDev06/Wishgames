import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, distinctUntilChanged, forkJoin } from 'rxjs';
import { environment } from '../../../environments/environments';
import { GameService, GameStatusFilter } from '../../core/services/game.service';
import { PlatformService } from '../../core/services/platform.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { CollectionService } from '../../core/services/collection.service';
import { ConsoleCollectionService } from '../../core/services/console-collection.service';
import { ConsoleWishlistService } from '../../core/services/console-wishlist.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { NotificationService } from '../../core/services/notification.service';
import { GameListItem, ConsoleOption } from '../../core/models/game.model';
import { CollectionFormModal, CollectionFormValue } from '../../shared/components/collection-form-modal/collection-form-modal';
import { GameDetailModal } from '../../shared/components/game-detail-modal/game-detail-modal';
import { ConsoleFormModal, ConsoleFormValue } from '../../shared/components/console-form-modal/console-form-modal';
import { consoleColor } from '../../core/constants/console-colors.constant';
import { resolveCoverUrl } from '../../core/utils/cover-url.util';
import { consolePhotoUrl } from '../../core/utils/console-photo.util';
import { hidePhoto } from '../../core/utils/photo-visibility.util';
import { httpErrorDetail } from '../../core/utils/http-error.util';
import { regionShortLabel } from '../../core/constants/game-state.constants';

export type Tab = 'jeux' | 'consoles';
export type ViewMode = 'grid' | 'list';
export type StatusOption = GameStatusFilter | 'all';
export type ConsoleStatusOption = 'all' | 'owned' | 'not-owned';

const PAGE_SIZE = 60;

// Index alphabétique (§3.3) affiché à droite de la liste de jeux — "#" couvre les titres qui ne
// commencent pas par une lettre (chiffres, symboles), qui trient avant "A" côté backend.
const ALPHABET_INDEX = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

@Component({
  selector: 'app-catalogue',
  imports: [CollectionFormModal, GameDetailModal, ConsoleFormModal],
  templateUrl: './catalogue.html',
  styleUrl: './catalogue.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Catalogue implements OnInit, AfterViewInit, OnDestroy {
  private readonly gameService = inject(GameService);
  private readonly platformService = inject(PlatformService);
  private readonly wishlistService = inject(WishlistService);
  private readonly collectionService = inject(CollectionService);
  private readonly consoleCollectionService = inject(ConsoleCollectionService);
  private readonly consoleWishlistService = inject(ConsoleWishlistService);
  private readonly dashboardService = inject(DashboardService);
  private readonly notificationService = inject(NotificationService);
  private readonly coverOrigin = environment.apiOrigin;
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tab = signal<Tab>('jeux');

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
  protected readonly alphabetIndex = ALPHABET_INDEX;

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

  protected readonly detailTarget = signal<GameListItem | null>(null);

  protected readonly consoleColor = consoleColor;
  protected readonly hidePhoto = hidePhoto;

  protected consolePhotoUrl(slug: string): string {
    return consolePhotoUrl(slug, this.coverOrigin);
  }

  // Nombre de jeux possédés par console (DashboardService.by_console) — sert à afficher, sur les
  // tuiles du picker "par console" du tab Jeux, un badge possédé + une fraction "X/Y jeux" plutôt
  // que le simple total au catalogue, cf. maquette (Catalogue owned badge + fraction).
  private readonly ownedGamesByConsole = signal<Map<string, number>>(new Map());

  protected ownedGamesFor(slug: string): number {
    return this.ownedGamesByConsole().get(slug) ?? 0;
  }

  // ---------- Onglet Consoles : référence complète (PlatformService), pas de drill-down (une
  // seule ligne par console, pas d'édition régionale pour le matériel, §9) ----------
  protected readonly consolesLoading = signal(true);
  protected readonly consoleSearchText = signal('');
  protected readonly consoleStatusFilter = signal<ConsoleStatusOption>('all');

  private readonly ownedConsoleIds = signal<Set<string>>(new Set());
  private readonly wishlistedConsoleIds = signal<Set<string>>(new Set());

  protected readonly filteredConsoles = computed(() => {
    const search = this.consoleSearchText().trim().toLowerCase();
    const status = this.consoleStatusFilter();
    const owned = this.ownedConsoleIds();

    return this.consoles()
      .filter((c) => (search ? c.ll_name.toLowerCase().includes(search) : true))
      .filter((c) => {
        if (status === 'owned') return owned.has(c.id);
        if (status === 'not-owned') return !owned.has(c.id);
        return true;
      });
  });

  protected readonly addConsoleTarget = signal<ConsoleOption | null>(null);
  protected readonly addConsoleSubmitting = signal(false);

  protected isConsoleOwned(console: ConsoleOption): boolean {
    return this.ownedConsoleIds().has(console.id);
  }

  protected isConsoleWishlisted(console: ConsoleOption): boolean {
    return this.wishlistedConsoleIds().has(console.id);
  }

  protected setTab(tab: Tab): void {
    this.tab.set(tab);
  }

  protected setConsoleSearchText(value: string): void {
    this.consoleSearchText.set(value);
  }

  protected setConsoleStatusFilter(status: ConsoleStatusOption): void {
    this.consoleStatusFilter.set(status);
  }

  protected openAddConsoleToCollection(console: ConsoleOption): void {
    this.addConsoleTarget.set(console);
  }

  protected closeAddConsoleToCollection(): void {
    this.addConsoleTarget.set(null);
  }

  protected submitAddConsoleToCollection(value: ConsoleFormValue): void {
    const console = this.addConsoleTarget();
    if (!console) return;

    this.addConsoleSubmitting.set(true);
    this.consoleCollectionService.create({ id_console: console.id, ...value }).subscribe({
      next: () => {
        this.ownedConsoleIds.update((set) => new Set(set).add(console.id));
        this.notificationService.success(`« ${console.ll_name} » ajoutée à la collection.`);
        this.addConsoleSubmitting.set(false);
        this.closeAddConsoleToCollection();
      },
      error: (err: HttpErrorResponse) => {
        this.notificationService.error(`Échec de l'ajout de la console. (${httpErrorDetail(err)})`);
        this.addConsoleSubmitting.set(false);
      },
    });
  }

  // Ajout instantané (retour utilisateur : la wishlist ne demande aucune info obligatoire — seul
  // id_console est requis, le standard vidéo désiré/dernière vérification sont des critères de
  // recherche qu'on préfère renseigner plus tard en éditant l'entrée, plutôt que de perdre du
  // temps à chaque ajout avec une modale).
  protected addConsoleToWishlist(console: ConsoleOption): void {
    const today = new Date().toISOString().slice(0, 10);
    this.consoleWishlistService.create({ id_console: console.id, ll_desired_video_standard: null, ts_last_checked: today }).subscribe({
      next: () => {
        this.wishlistedConsoleIds.update((set) => new Set(set).add(console.id));
        this.notificationService.success(`« ${console.ll_name} » ajoutée à la wishlist.`);
      },
      error: (err: HttpErrorResponse) => {
        this.notificationService.error(`Échec de l'ajout à la wishlist. (${httpErrorDetail(err)})`);
      },
    });
  }

  ngOnInit(): void {
    forkJoin({
      consoles: this.platformService.list(),
      collection: this.consoleCollectionService.list(),
      wishlist: this.consoleWishlistService.list(),
    }).subscribe({
      next: ({ consoles, collection, wishlist }) => {
        this.consoles.set(consoles.data);
        this.ownedConsoleIds.set(new Set(collection.data.map((i) => i.id_console)));
        this.wishlistedConsoleIds.set(new Set(wishlist.data.map((i) => i.id_console)));
        this.consolesLoading.set(false);
      },
      error: () => {
        this.consolesLoading.set(false); // le filtre console reste vide, pas bloquant pour l'onglet Jeux
      },
    });

    this.dashboardService.get().subscribe({
      next: (response) => {
        this.ownedGamesByConsole.set(new Map(response.data.by_console.map((row) => [row.console_slug, row.nb_owned])));
      },
      error: () => undefined, // pas bloquant : les tuiles retombent sur le total au catalogue seul
    });

    this.searchInput$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.fetchPage(true));

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

  private fetchPage(reset: boolean, jumpTo?: string): void {
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
        jumpTo,
      })
      .subscribe({
        next: (response) => {
          this.games.update((list) => (reset ? response.data : [...list, ...response.data]));
          this.total.set(response.additional.total);
          // Avec jumpTo, l'offset réellement utilisé (calculé côté backend) diffère de celui envoyé
          // dans la requête — on repart de la valeur renvoyée pour que le scroll infini continue au
          // bon endroit.
          this.offset = response.additional.offset + response.data.length;
          this.loading.set(false);
          this.loadingMore.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(
            `Impossible de charger le catalogue. Vérifie que l'API tourne (bun run start). (${httpErrorDetail(err)})`,
          );
          this.loading.set(false);
          this.loadingMore.set(false);
        },
      });
  }

  // Index alphabétique (§3.3) : évite d'avoir à re-scroller toute la liste d'une console pour
  // atteindre une lettre déjà dépassée après un retour accidentel en haut de page.
  protected jumpToLetter(letter: string): void {
    this.fetchPage(true, letter);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    this.addToWishlist(game);
  }

  // Ajout instantané (retour utilisateur : cliquer devait suffire, la wishlist ne demande aucune
  // info obligatoire — seul id_game est requis, tout le reste (région désirée, complétude, état,
  // priorité, offres) est un critère de recherche qu'on préfère renseigner plus tard en éditant
  // l'entrée depuis l'écran Wishlist, plutôt que de perdre du temps avec une modale à chaque ajout).
  // ts_last_checked est mis à la date du jour par défaut pour ne pas avoir à la ressaisir non plus.
  protected addToWishlist(game: GameListItem): void {
    const today = new Date().toISOString().slice(0, 10);
    this.wishlistService.create({ id_game: game.id, ll_region: game.region, ts_last_checked: today }).subscribe({
      next: () => {
        // Une entrée wishlist cible une édition régionale précise : ne marquer "en wishlist"
        // que la carte correspondant à cette région (une ligne par édition régionale, §2bis).
        this.games.update((list) =>
          list.map((g) => (g.id === game.id && g.region === game.region ? { ...g, in_wishlist: true } : g)),
        );
        this.notificationService.success(`« ${game.ll_title} » ajouté à la wishlist.`);
      },
      error: (err: HttpErrorResponse) => {
        this.notificationService.error(`Échec de l'ajout à la wishlist. (${httpErrorDetail(err)})`);
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
      error: (err: HttpErrorResponse) => {
        this.notificationService.error(`Échec de l'ajout à la collection. (${httpErrorDetail(err)})`);
        this.addSubmitting.set(false);
      },
    });
  }
}
