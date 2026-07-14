export interface CollectionItem {
  id: string;
  id_game: string;
  // Région de l'édition possédée — permet plusieurs lignes pour le même jeu (ex. Crash Bandicoot
  // PAL + USA + Japon), une par région suivie séparément.
  ll_region: string | null;
  nb_quantity: number;
  ll_completeness: string;
  ll_condition_overall: string;
  ll_condition_box: string | null;
  ll_condition_manual: string | null;
  ll_condition_media: string | null;
  ts_acquired: string | null;
  nb_price_paid: number | null;
  ll_purchase_location: string | null;
  ll_notes: string | null;
  ts_create: string;
  ts_update: string;
  title: string;
  console_slug: string;
  console_name: string;
  cover_front_url: string | null;
}
