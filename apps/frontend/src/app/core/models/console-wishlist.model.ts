import { WishlistStatus } from '../constants/wishlist-status.constants';

export interface ConsoleWishlistItem {
  id: string;
  id_console: string;
  ll_desired_video_standard: string | null;
  ts_last_checked: string | null;
  ll_status: WishlistStatus;
  ts_create: string;
  ts_update: string;
  console_slug: string;
  console_name: string;
  nb_offers: number;
}
