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
	// Une ligne = une édition régionale (une jaquette FRONT), pas un jeu — un même titre disponible
	// en Europe/USA/Japon donne plusieurs lignes, chacune avec sa propre jaquette (retour utilisateur,
	// §2bis) ; region est null pour un jeu sans jaquette FRONT du tout (une seule ligne dans ce cas).
	region: string | null;
	cover_front_url: string | null;
	// Possession/recherche évaluées pour CETTE édition régionale précise (pas le jeu en général).
	in_collection: boolean;
	in_wishlist: boolean;
}
