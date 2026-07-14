import { WishlistStatus } from '../constants/wishlist-status.constants';

export interface WishlistItem {
  id: string;
  id_game: string;
  ts_last_checked: string | null;
  ll_desired_completeness: string | null;
  ll_desired_condition: string | null;
  ll_desired_regions: string[];
  nb_priority: number | null;
  ll_status: WishlistStatus;
  ts_create: string;
  ts_update: string;
  title: string;
  console_slug: string;
  console_name: string;
  cover_front_url: string | null;
  nb_offers: number;
  min_offer_price: number | null;
}
