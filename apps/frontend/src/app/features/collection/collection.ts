import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { environment } from '../../../environments/environments';
import { CollectionService } from '../../core/services/collection.service';
import { ConsoleCollectionService } from '../../core/services/console-collection.service';
import { PlatformService } from '../../core/services/platform.service';
import { NotificationService } from '../../core/services/notification.service';
import { CollectionItem } from '../../core/models/collection.model';
import { ConsoleCollectionItem } from '../../core/models/console-collection.model';
import { ConsoleOption } from '../../core/models/game.model';
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
import { toDateInputValue } from '../../core/utils/date.util';
import { resolveCoverUrl } from '../../core/utils/cover-url.util';
import { consolePhotoUrl } from '../../core/utils/console-photo.util';
import { CollectionFormModal, CollectionFormValue } from '../../shared/components/collection-form-modal/collection-form-modal';
import { ConsoleFormModal, ConsoleFormValue } from '../../shared/components/console-form-modal/console-form-modal';
import { ConfirmModal } from '../../shared/components/confirm-modal/confirm-modal';

export type Tab = 'jeux' | 'consoles';
export type ViewMode = 'grid' | 'list';
export type SortOption = 'title' | 'price-desc' | 'price-asc' | 'date-desc' | 'date-asc';

export interface ConsoleGroup {
  consoleName: string;
  items: CollectionItem[];
}

const SORT_COMPARATORS: Record<SortOption, (a: CollectionItem, b: CollectionItem) => number> = {
  title: (a, b) => a.title.localeCompare(b.title),
  'price-desc': (a, b) => (b.nb_price_paid ?? -1) - (a.nb_price_paid ?? -1),
  'price-asc': (a, b) => (a.nb_price_paid ?? Infinity) - (b.nb_price_paid ?? Infinity),
  'date-desc': (a, b) => (b.ts_acquired ?? b.ts_create).localeCompare(a.ts_acquired ?? a.ts_create),
  'date-asc': (a, b) => (a.ts_acquired ?? a.ts_create).localeCompare(b.ts_acquired ?? b.ts_create),
};

// Page "Ce que tu possèdes déjà" : onglet Jeux (déjà existant) + onglet Consoles (repris de
// l'ancienne page /consoles, §refonte design — fusion en 4 pages avec onglet Jeux/Consoles au lieu
// d'une page dédiée, cf. maquette "Éditorial aurora chromée").
@Component({
  selector: 'app-collection',
  imports: [DecimalPipe, CollectionFormModal, ConsoleFormModal, ConfirmModal],
  templateUrl: './collection.html',
  styleUrl: './collection.scss',
})
export class Collection implements OnInit {
  private readonly collectionService = inject(CollectionService);
  private readonly consoleCollectionService = inject(ConsoleCollectionService);
  private readonly platformService = inject(PlatformService);
  private readonly notificationService = inject(NotificationService);
  private readonly coverOrigin = environment.apiOrigin;

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly tab = signal<Tab>('jeux');
  protected readonly viewMode = signal<ViewMode>('grid');

  // ---------- Jeux ----------
  protected readonly editTarget = signal<CollectionItem | null>(null);
  protected readonly editSubmitting = signal(false);

  protected readonly deleteTarget = signal<CollectionItem | null>(null);
  protected readonly deleteSubmitting = signal(false);

  protected readonly items = signal<CollectionItem[]>([]);

  protected readonly searchText = signal('');
  protected readonly sortBy = signal<SortOption>('date-desc');

  // Recherche (titre) + tri appliqués à l'intérieur de chaque groupe console — l'arborescence
  // par console (§3.1) reste la structure de base, recherche/tri filtrent/ordonnent son contenu.
  protected readonly filteredSorted = computed<CollectionItem[]>(() => {
    const search = this.searchText().trim().toLowerCase();
    const comparator = SORT_COMPARATORS[this.sortBy()];
    const filtered = search ? this.items().filter((item) => item.title.toLowerCase().includes(search)) : this.items();
    return [...filtered].sort(comparator);
  });

  // Organisation par console (§3.1), même principe que la Wishlist.
  protected readonly groups = computed<ConsoleGroup[]>(() => {
    const byConsole = new Map<string, CollectionItem[]>();
    for (const item of this.filteredSorted()) {
      const group = byConsole.get(item.console_name) ?? [];
      group.push(item);
      byConsole.set(item.console_name, group);
    }
    return [...byConsole.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([consoleName, groupItems]) => ({ consoleName, items: groupItems }));
  });

  // ---------- Consoles ----------
  protected readonly allConsoles = signal<ConsoleOption[]>([]);
  protected readonly consoleItems = signal<ConsoleCollectionItem[]>([]);

  private readonly ownedConsoleIds = computed(() => new Set(this.consoleItems().map((i) => i.id_console)));
  protected readonly consolesToAdd = computed(() => this.allConsoles().filter((c) => !this.ownedConsoleIds().has(c.id)));

  protected readonly addConsoleTarget = signal<ConsoleOption | null>(null);
  protected readonly addConsoleSubmitting = signal(false);

  protected readonly editConsoleTarget = signal<ConsoleCollectionItem | null>(null);
  protected readonly editConsoleSubmitting = signal(false);

  protected readonly deleteConsoleTarget = signal<ConsoleCollectionItem | null>(null);
  protected readonly deleteConsoleSubmitting = signal(false);

  protected readonly consoleColor = consoleColor;
  protected readonly completenessLabel = completenessLabel;
  protected readonly completenessColor = completenessColor;
  protected readonly conditionLabel = conditionLabel;
  protected readonly conditionColor = conditionColor;
  protected readonly regionColor = regionColor;
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
    forkJoin({
      games: this.collectionService.list(),
      consoles: this.platformService.list(),
      consoleCollection: this.consoleCollectionService.list(),
    }).subscribe({
      next: ({ games, consoles, consoleCollection }) => {
        this.items.set(games.data);
        this.allConsoles.set(consoles.data);
        this.consoleItems.set(consoleCollection.data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("Impossible de charger la collection. Vérifie que l'API tourne (bun run start).");
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

  protected onSearchChange(value: string): void {
    this.searchText.set(value);
  }

  protected onSortChange(value: string): void {
    this.sortBy.set(value as SortOption);
  }

  protected coverUrl(item: CollectionItem): string | null {
    return resolveCoverUrl(item.cover_front_url, this.coverOrigin);
  }

  protected regionLabel(value: string | null): string {
    return regionLabel(value);
  }

  // Postgres renvoie les colonnes NUMERIC en string (driver pg) — nb_price_paid est donc une
  // string à l'exécution malgré son typage `number | null` ; Number(...) évite une concaténation
  // de chaînes silencieuse (0 + "65.00" + "40.00" -> "065.0040.00") qui faisait planter le pipe
  // `number` en aval et blanchissait toute la page (retour utilisateur : "rien ne s'affiche").
  protected totalSpent(): number {
    return this.items().reduce((sum, item) => sum + (Number(item.nb_price_paid) || 0), 0);
  }

  protected asEditValue(item: CollectionItem): CollectionFormValue {
    return {
      ll_region: item.ll_region,
      ll_completeness: item.ll_completeness,
      ll_condition_overall: item.ll_condition_overall,
      ll_condition_media: item.ll_condition_media,
      ll_condition_box: item.ll_condition_box,
      ll_condition_manual: item.ll_condition_manual,
      nb_price_paid: item.nb_price_paid,
      ll_purchase_location: item.ll_purchase_location,
      ts_acquired: item.ts_acquired,
      nb_quantity: item.nb_quantity,
    };
  }

  protected openEdit(item: CollectionItem): void {
    this.editTarget.set(item);
  }

  protected closeEdit(): void {
    this.editTarget.set(null);
  }

  protected submitEdit(value: CollectionFormValue): void {
    const item = this.editTarget();
    if (!item) return;

    this.editSubmitting.set(true);
    this.collectionService.update(item.id, value).subscribe({
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

  protected openDelete(item: CollectionItem): void {
    this.deleteTarget.set(item);
  }

  protected closeDelete(): void {
    this.deleteTarget.set(null);
  }

  protected confirmDelete(): void {
    const item = this.deleteTarget();
    if (!item) return;

    this.deleteSubmitting.set(true);
    this.collectionService.delete(item.id).subscribe({
      next: () => {
        this.items.update((list) => list.filter((i) => i.id !== item.id));
        this.notificationService.success(`« ${item.title} » supprimé de la collection.`);
        this.deleteSubmitting.set(false);
        this.closeDelete();
      },
      error: () => {
        this.notificationService.error('Échec de la suppression.');
        this.deleteSubmitting.set(false);
      },
    });
  }

  // ---------- Consoles : actions ----------
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
        this.consoleItems.update((list) => [
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

  protected asConsoleEditValue(item: ConsoleCollectionItem): ConsoleFormValue {
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

  protected openEditConsole(item: ConsoleCollectionItem): void {
    this.editConsoleTarget.set(item);
  }

  protected closeEditConsole(): void {
    this.editConsoleTarget.set(null);
  }

  protected submitEditConsole(value: ConsoleFormValue): void {
    const item = this.editConsoleTarget();
    if (!item) return;

    this.editConsoleSubmitting.set(true);
    this.consoleCollectionService.update(item.id, value).subscribe({
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

  protected openDeleteConsole(item: ConsoleCollectionItem): void {
    this.deleteConsoleTarget.set(item);
  }

  protected closeDeleteConsole(): void {
    this.deleteConsoleTarget.set(null);
  }

  protected confirmDeleteConsole(): void {
    const item = this.deleteConsoleTarget();
    if (!item) return;

    this.deleteConsoleSubmitting.set(true);
    this.consoleCollectionService.delete(item.id).subscribe({
      next: () => {
        this.consoleItems.update((list) => list.filter((i) => i.id !== item.id));
        this.notificationService.success(`« ${item.console_name} » supprimée de la collection.`);
        this.deleteConsoleSubmitting.set(false);
        this.closeDeleteConsole();
      },
      error: () => {
        this.notificationService.error('Échec de la suppression.');
        this.deleteConsoleSubmitting.set(false);
      },
    });
  }
}
