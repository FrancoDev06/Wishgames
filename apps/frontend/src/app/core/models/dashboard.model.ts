import { CollectionItem } from './collection.model';
import { WishlistItem } from './wishlist.model';

export interface ConsoleBreakdown {
  console_slug: string;
  console_name: string;
  nb_owned: number;
}

export interface DashboardData {
  nb_collection_games: number;
  nb_wishlist_games: number;
  nb_collection_consoles: number;
  nb_wishlist_consoles: number;
  total_spent: number;
  total_games: number;
  by_console: ConsoleBreakdown[];
  recent_collection: CollectionItem[];
  recent_wishlist: WishlistItem[];
}

export type ActivityKind = 'collection_game' | 'wishlist_game' | 'collection_console' | 'wishlist_console';
export type ActivityAction = 'added' | 'edited' | 'bought' | 'deleted';

export interface ActivityLogEntry {
  id: string;
  ll_kind: ActivityKind;
  ll_action: ActivityAction;
  ll_title: string;
  ll_console_slug: string;
  ll_console_name: string;
  ll_cover_url: string | null;
  nb_price: number | null;
  ts_create: string;
}

export interface ActivityLogPage {
  rows: ActivityLogEntry[];
  total: number;
}
