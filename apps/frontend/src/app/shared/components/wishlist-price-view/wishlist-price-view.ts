import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { WishlistItem } from '../../../core/models/wishlist.model';
import { resolveCoverUrl } from '../../../core/utils/cover-url.util';
import { environment } from '../../../../environments/environments';

export type PriceSortOption = 'price-asc' | 'console' | 'priority';

const SORT_COMPARATORS: Record<PriceSortOption, (a: WishlistItem, b: WishlistItem) => number> = {
  // Prix le plus bas d'abord, "aucune offre" (null) toujours en dernier.
  'price-asc': (a, b) => {
    if (a.min_offer_price == null && b.min_offer_price == null) return 0;
    if (a.min_offer_price == null) return 1;
    if (b.min_offer_price == null) return -1;
    return a.min_offer_price - b.min_offer_price;
  },
  console: (a, b) => a.console_name.localeCompare(b.console_name) || a.title.localeCompare(b.title),
  priority: (a, b) => (b.nb_priority ?? -1) - (a.nb_priority ?? -1),
};

// Vue "Prix/Offres" façon PriceCharting (refonte Wishlist §0, mode C) : un item par ligne, prix le
// plus bas constaté parmi ses offres (min_offer_price, calculé côté backend pour éviter un appel
// N+1 par item) + nombre d'offres. Clic → délègue au parent (ouvre la modale de détail existante,
// même comportement que les modes Cartes/Chasse).
@Component({
  selector: 'app-wishlist-price-view',
  imports: [],
  templateUrl: './wishlist-price-view.html',
  styleUrl: './wishlist-price-view.scss',
})
export class WishlistPriceView {
  @Input() items: WishlistItem[] = [];
  @Output() itemClicked = new EventEmitter<string>();

  private readonly coverOrigin = environment.apiOrigin;

  protected readonly sortBy = signal<PriceSortOption>('price-asc');

  // Recalculé à chaque cycle de détection de changement (pas un computed() : [items] arrive via
  // @Input, pas un signal, donc rien ne déclencherait sa réévaluation autrement) — coût négligeable
  // pour une wishlist de cette taille.
  protected sortedItems(): WishlistItem[] {
    return [...this.items].sort(SORT_COMPARATORS[this.sortBy()]);
  }

  protected onSortChange(value: string): void {
    this.sortBy.set(value as PriceSortOption);
  }

  protected onRowClick(item: WishlistItem): void {
    this.itemClicked.emit(item.id);
  }

  protected coverUrl(item: WishlistItem): string | null {
    return resolveCoverUrl(item.cover_front_url, this.coverOrigin);
  }
}
