export interface Game {
	id: string;
	id_console: string;
	nb_source_id: number;
	ll_title: string;
	ll_aka_titles: string[];
	ll_description: string | null;
	nb_release_year: number | null;
	ll_genres: string[];
	ll_gameplay: string[];
	ll_perspective: string[];
	ll_visual: string[];
	ll_setting: string[];
	nb_rating: number | null;
	nb_rating_votes: number | null;
	ll_developers: string[];
	ll_publishers: string[];
	ll_source_url: string | null;
	ts_create: string;
	ts_update: string;
}

export interface GameWithConsole extends Game {
	console_slug: string;
	console_name: string;
}

export interface GameListItem extends GameWithConsole {
	cover_front_url: string | null;
	in_collection: boolean;
	in_wishlist: boolean;
	// Régions déjà possédées en collection pour ce jeu, et régions disponibles au catalogue
	// (jaquettes FRONT) — permet au frontend de proposer l'ajout d'une région supplémentaire
	// tant qu'il en reste (§9, suivi multi-région).
	owned_regions: string[];
	available_regions: string[];
}
