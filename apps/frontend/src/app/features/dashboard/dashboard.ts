import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environments';
import { DashboardService } from '../../core/services/dashboard.service';
import { ActivityKind, ActivityLogEntry, ConsoleBreakdown, DashboardData } from '../../core/models/dashboard.model';
import { resolveCoverUrl } from '../../core/utils/cover-url.util';
import { timeAgo, dayBucket, DAY_BUCKET_LABEL, DayBucket } from '../../core/utils/date.util';
import { animateCount } from '../../core/utils/animate-count.util';
import { consoleColor } from '../../core/constants/console-colors.constant';
import { ACTIVITY_ACTION_ICON, ACTIVITY_KIND_OPTIONS } from '../../core/constants/activity-icons.constant';
import { DonutChart, DonutSlice } from '../../shared/components/donut-chart/donut-chart';

interface DisplayedStats {
  collectionGames: number;
  wishlistGames: number;
  collectionConsoles: number;
  wishlistConsoles: number;
  totalSpent: number;
}

interface ActivityGroup {
  bucket: DayBucket;
  label: string;
  entries: ActivityLogEntry[];
}

const ACTIVITY_PAGE_SIZE = 15;

// Écran d'accueil (§3.4) : statistiques instantanées (count-up), donut Collection/Wishlist/reste du
// catalogue, répartition par console (barres, une seule teinte — magnitude nominale, cf. skill
// dataviz : la couleur par console n'apporterait rien que le nom de console en légende ne montre
// déjà), flux d'activité paginé/filtrable/groupé par jour (ref_activity_log, §3.4 refonte), accès
// rapides.
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DonutChart, DecimalPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly router = inject(Router);
  private readonly coverOrigin = environment.apiOrigin;

  protected readonly data = signal<DashboardData | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly consoleColor = consoleColor;
  protected readonly timeAgo = timeAgo;
  protected readonly activityKindOptions = ACTIVITY_KIND_OPTIONS;
  protected readonly activityActionIcon = ACTIVITY_ACTION_ICON;

  protected readonly displayedStats = signal<DisplayedStats>({
    collectionGames: 0,
    wishlistGames: 0,
    collectionConsoles: 0,
    wishlistConsoles: 0,
    totalSpent: 0,
  });

  // Triée par nombre de jeux possédés décroissant : la console la mieux fournie en tête. Les
  // consoles sans aucun jeu possédé sont écartées (chart plus lisible qu'une longue liste à 0).
  protected readonly byConsole = computed<ConsoleBreakdown[]>(() => {
    const rows = (this.data()?.by_console ?? []).filter((row) => row.nb_owned > 0);
    return [...rows].sort((a, b) => b.nb_owned - a.nb_owned || a.console_name.localeCompare(b.console_name));
  });

  protected readonly maxOwned = computed(() => Math.max(1, ...this.byConsole().map((row) => row.nb_owned)));

  // Donut Collection / Wishlist / reste du catalogue (retour utilisateur, refonte §3.4) — ne
  // remplace PAS la barre par console ci-dessus (17 tranches y serait illisible, cf. skill dataviz),
  // c'est une répartition à 3 catégories distincte, qui s'y prête.
  protected readonly catalogueSplit = computed<DonutSlice[]>(() => {
    const d = this.data();
    if (!d) return [];
    const rest = Math.max(0, d.total_games - d.nb_collection_games - d.nb_wishlist_games);
    return [
      { label: 'Collection', value: d.nb_collection_games, colorVar: '--color-primary' },
      { label: 'Wishlist', value: d.nb_wishlist_games, colorVar: '--color-secondary' },
      { label: 'Reste du catalogue', value: rest, colorVar: '--color-border-strong' },
    ];
  });

  // ---------- Activité récente (ref_activity_log, paginée/filtrable) ----------
  protected readonly activityEntries = signal<ActivityLogEntry[]>([]);
  protected readonly activityTotal = signal(0);
  protected readonly activityKind = signal<ActivityKind | 'all'>('all');
  protected readonly activityLoadingMore = signal(false);

  protected readonly hasMoreActivity = computed(() => this.activityEntries().length < this.activityTotal());

  protected readonly groupedActivity = computed<ActivityGroup[]>(() => {
    const groups: ActivityGroup[] = [];
    for (const entry of this.activityEntries()) {
      const bucket = dayBucket(entry.ts_create);
      let group = groups.find((g) => g.bucket === bucket);
      if (!group) {
        group = { bucket, label: DAY_BUCKET_LABEL[bucket], entries: [] };
        groups.push(group);
      }
      group.entries.push(entry);
    }
    return groups;
  });

  ngOnInit(): void {
    this.fetch();
    this.loadActivity(true);
  }

  private fetch(): void {
    this.loading.set(true);
    this.error.set(null);
    this.dashboardService.get().subscribe({
      next: (response) => {
        this.data.set(response.data);
        this.loading.set(false);
        this.startCountUp(response.data);
      },
      error: () => {
        this.error.set("Impossible de charger le dashboard. Vérifie que l'API tourne (bun run start).");
        this.loading.set(false);
      },
    });
  }

  private startCountUp(d: DashboardData): void {
    const targets: DisplayedStats = {
      collectionGames: d.nb_collection_games,
      wishlistGames: d.nb_wishlist_games,
      collectionConsoles: d.nb_collection_consoles,
      wishlistConsoles: d.nb_wishlist_consoles,
      totalSpent: d.total_spent,
    };
    (Object.keys(targets) as (keyof DisplayedStats)[]).forEach((key) => {
      animateCount(0, targets[key], 700, (value) => {
        this.displayedStats.update((current) => ({ ...current, [key]: value }));
      });
    });
  }

  protected loadActivity(reset: boolean): void {
    this.activityLoadingMore.set(true);
    const offset = reset ? 0 : this.activityEntries().length;
    const kind = this.activityKind();

    this.dashboardService.getActivity(kind, ACTIVITY_PAGE_SIZE, offset).subscribe({
      next: (response) => {
        this.activityEntries.update((current) => (reset ? response.data.rows : [...current, ...response.data.rows]));
        this.activityTotal.set(response.data.total);
        this.activityLoadingMore.set(false);
      },
      error: () => {
        this.activityLoadingMore.set(false);
      },
    });
  }

  protected onActivityFilterChange(kind: ActivityKind | 'all'): void {
    this.activityKind.set(kind);
    this.loadActivity(true);
  }

  protected loadMoreActivity(): void {
    this.loadActivity(false);
  }

  // Le clic redirige vers la vue Collection/Wishlist filtrée par console — pas vers une fiche
  // précise, qui peut ne plus exister pour une entrée "deleted" (aucun ID de ligne source conservé).
  protected goToActivityTarget(entry: ActivityLogEntry): void {
    const target = entry.ll_kind.startsWith('collection') ? '/collection' : '/wishlist';
    this.router.navigate([target], { queryParams: { console: entry.ll_console_slug } });
  }

  protected barWidth(row: ConsoleBreakdown): number {
    return Math.round((row.nb_owned / this.maxOwned()) * 100);
  }

  protected coverUrl(entry: ActivityLogEntry): string | null {
    return resolveCoverUrl(entry.ll_cover_url, this.coverOrigin);
  }

  protected formatPrice(value: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(value);
  }
}
