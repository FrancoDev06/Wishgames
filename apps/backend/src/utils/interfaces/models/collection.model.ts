import { Completeness, Condition } from "./common.model";

export interface CollectionItem {
	id: string;
	id_game: string;
	// Région de l'édition possédée (§2bis) — permet plusieurs lignes pour le même jeu,
	// une par région suivie séparément (ex. Crash Bandicoot PAL + USA + Japon).
	ll_region: string | null;
	nb_quantity: number;
	ll_completeness: Completeness;
	ll_condition_overall: Condition;
	ll_condition_box: Condition | null;
	ll_condition_manual: Condition | null;
	ll_condition_media: Condition | null;
	ts_acquired: string | null;
	nb_price_paid: number | null;
	ll_purchase_location: string | null;
	ll_notes: string | null;
	ts_create: string;
	ts_update: string;
}

export interface CollectionItemWithGame extends CollectionItem {
	title: string;
	console_slug: string;
	console_name: string;
	cover_front_url: string | null;
}
