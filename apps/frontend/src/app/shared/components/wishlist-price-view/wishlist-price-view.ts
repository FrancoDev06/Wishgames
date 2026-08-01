import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { WishlistItem } from '../../../core/models/wishlist.model';
import { resolveCoverUrl } from '../../../core/utils/cover-url.util';
import {
  completenessColor,
  completenessLabel,
  completenessLevel,
  conditionColor,
  conditionLabel,
  regionShortLabel,
} from '../../../core/constants/game-state.constants';
import { environment } from '../../../../environments/environments';

export type PriceSortOption = 'price-asc' | 'console' | 'priority';

// Un groupe = toutes les entrées wishlist du même jeu (id_game), une par édition régionale suivie
// (§9, retour utilisateur : suivre Europe/USA/Japon du même titre pour comparer les prix, ex.
// Adventure Island). `recommended` est l'édition à privilégier : la moins chère parmi celles non
// cochées "difficile à jouer" ; si toutes le sont (ou aucune offre nulle part), on retombe sur la
// moins chère tout court plutôt que de ne rien recommander.
export interface WishlistPriceGroup {
  id_game: string;
  title: string;
  console_name: string;
  coverUrl: string | null;
  items: WishlistItem[];
  recommended: WishlistItem;
}

function cheapestFirst(a: WishlistItem, b: WishlistItem): number {
  if (a.min_offer_price == null && b.min_offer_price == null) return 0;
  if (a.min_offer_price == null) return 1;
  if (b.min_offer_price == null) return -1;
  return a.min_offer_price - b.min_offer_price;
}

// Prix d'abord, complétude recherchée ensuite (retour utilisateur : un exemplaire complet est plus
// intéressant qu'un loose même à prix proche/égal — le tri "moins cher d'abord" seul ne suffit pas).
function cheapestThenMostComplete(a: WishlistItem, b: WishlistItem): number {
  return cheapestFirst(a, b) || completenessLevel(b.ll_desired_completeness) - completenessLevel(a.ll_desired_completeness);
}

function pickRecommended(items: WishlistItem[]): WishlistItem {
  const sorted = [...items].sort(cheapestThenMostComplete);
  return sorted.find((i) => !i.flag_hard_to_play) ?? sorted[0];
}

const SORT_COMPARATORS: Record<PriceSortOption, (a: WishlistPriceGroup, b: WishlistPriceGroup) => number> = {
  'price-asc': (a, b) => cheapestThenMostComplete(a.recommended, b.recommended),
  console: (a, b) => a.console_name.localeCompare(b.console_name) || a.title.localeCompare(b.title),
  priority: (a, b) => (b.recommended.nb_priority ?? -1) - (a.recommended.nb_priority ?? -1),
};

// Vue "Prix/Offres" façon PriceCharting (refonte Wishlist §0, mode C) : les entrées du même jeu
// (plusieurs éditions régionales suivies séparément, §9) sont regroupées pour pouvoir comparer
// leurs prix en un coup d'œil et repérer la moins chère — en évitant de recommander une édition
// cochée "difficile à jouer" (ex. import japonais illisible) quand une alternative existe.
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
  protected readonly regionShortLabel = regionShortLabel;
  protected readonly completenessColor = completenessColor;
  protected readonly completenessLabel = completenessLabel;
  protected readonly conditionColor = conditionColor;
  protected readonly conditionLabel = conditionLabel;

  protected readonly sortBy = signal<PriceSortOption>('price-asc');

  // Recalculé à chaque cycle de détection de changement (pas un computed() : [items] arrive via
  // @Input, pas un signal, donc rien ne déclencherait sa réévaluation autrement) — coût négligeable
  // pour une wishlist de cette taille.
  protected groupedSorted(): WishlistPriceGroup[] {
    const byGame = new Map<string, WishlistItem[]>();
    for (const item of this.items) {
      const group = byGame.get(item.id_game) ?? [];
      group.push(item);
      byGame.set(item.id_game, group);
    }

    const groups: WishlistPriceGroup[] = [...byGame.values()].map((groupItems) => {
      const recommended = pickRecommended(groupItems);
      return {
        id_game: groupItems[0].id_game,
        title: groupItems[0].title,
        console_name: groupItems[0].console_name,
        coverUrl: this.coverUrl(recommended),
        items: [...groupItems].sort(cheapestThenMostComplete),
        recommended,
      };
    });

    return groups.sort(SORT_COMPARATORS[this.sortBy()]);
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
