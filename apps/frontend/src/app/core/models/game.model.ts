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
  cover_front_url: string | null;
  in_collection: boolean;
  in_wishlist: boolean;
  owned_regions: string[];
  available_regions: string[];
}

export interface ConsoleOption {
  id: string;
  ll_slug: string;
  ll_name: string;
  nb_games: number;
}
