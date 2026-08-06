import { Completeness, Condition, WishlistStatus } from "./common.model";

export interface WishlistItem {
	id: string;
	id_game: string;
	ts_last_checked: string | null;
	ll_desired_completeness: Completeness | null;
	ll_desired_condition: Condition | null;
	ll_region: string | null;
	nb_priority: number | null;
	flag_hard_to_play: boolean;
	// Mots-clés de recherche Vinted (séparés par des virgules), saisis manuellement — cf. migration
	// 0013. Lus par le bot d'alerte externe bot_alerte_vinted pour les jeux priorité 4/5.
	ll_search_keywords: string | null;
	// Bascule manuelle "actif dans la recherche" (migration 0014), indépendante de nb_priority.
	flag_search_active: boolean;
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
