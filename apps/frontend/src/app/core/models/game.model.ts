export interface GameListItem {
  id: string;
  id_console: string;
  nb_source_id: number;
  ll_title: string;
  ll_aka_titles: string[];
  ll_description: string | null;
  nb_release_year: number | null;
  ll_genres: string[];
  nb_rating: number | null;
  nb_rating_votes: number | null;
  ll_developers: string[];
  ll_publishers: string[];
  ll_source_url: string | null;
  console_slug: string;
  console_name: string;
  // Une ligne = une édition régionale (une jaquette), pas un jeu — un même titre disponible en
  // plusieurs régions donne plusieurs GameListItem, chacun avec sa propre jaquette et son propre
  // statut collection/wishlist. null pour un jeu sans jaquette FRONT du tout.
  region: string | null;
  cover_front_url: string | null;
  in_collection: boolean;
  in_wishlist: boolean;
}

export interface ConsoleOption {
  id: string;
  ll_slug: string;
  ll_name: string;
  nb_games: number;
}
