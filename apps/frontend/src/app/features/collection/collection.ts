import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { environment } from '../../../environments/environments';
import { CollectionService } from '../../core/services/collection.service';
import { NotificationService } from '../../core/services/notification.service';
import { CollectionItem } from '../../core/models/collection.model';
import { completenessLabel, conditionLabel, regionLabel } from '../../core/constants/game-state.constants';
import { resolveCoverUrl } from '../../core/utils/cover-url.util';
import { CollectionFormModal, CollectionFormValue } from '../../shared/components/collection-form-modal/collection-form-modal';
import { ConfirmModal } from '../../shared/components/confirm-modal/confirm-modal';

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

@Component({
  selector: 'app-collection',
  imports: [DecimalPipe, CollectionFormModal, ConfirmModal],
  templateUrl: './collection.html',
  styleUrl: './collection.scss',
})
export class Collection implements OnInit {
  private readonly collectionService = inject(CollectionService);
  private readonly notificationService = inject(NotificationService);
  private readonly coverOrigin = environment.apiOrigin;

  protected readonly editTarget = signal<CollectionItem | null>(null);
  protected readonly editSubmitting = signal(false);

  protected readonly deleteTarget = signal<CollectionItem | null>(null);
  protected readonly deleteSubmitting = signal(false);

  protected readonly items = signal<CollectionItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly viewMode = signal<ViewMode>('grid');

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

  ngOnInit(): void {
    this.collectionService.list().subscribe({
      next: (response) => {
        this.items.set(response.data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("Impossible de charger la collection. Vérifie que l'API tourne (bun run start).");
        this.loading.set(false);
      },
    });
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

  protected completenessLabel(value: string): string {
    return completenessLabel(value);
  }

  protected conditionLabel(value: string): string {
    return conditionLabel(value);
  }

  protected regionLabel(value: string | null): string {
    return regionLabel(value);
  }

  protected totalSpent(): number {
    return this.items().reduce((sum, item) => sum + (item.nb_price_paid ?? 0), 0);
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
}
