import { Completeness, Condition, WishlistStatus } from "./common.model";

export interface WishlistItem {
	id: string;
	id_game: string;
	ts_last_checked: string | null;
	ll_desired_completeness: Completeness | null;
	ll_desired_condition: Condition | null;
	ll_region: string | null;
	nb_priority: number | null;
	ll_status: WishlistStatus;
	ts_create: string;
	ts_update: string;
}

export interface WishlistItemWithGame extends WishlistItem {
	title: string;
	console_slug: string;
	console_name: string;
	cover_front_url: string | null;
	nb_offers: number;
	min_offer_price: number | null;
}
