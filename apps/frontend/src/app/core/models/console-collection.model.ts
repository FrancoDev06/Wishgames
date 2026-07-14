export interface ConsoleCollectionItem {
  id: string;
  id_console: string;
  nb_quantity: number;
  ll_completeness: string;
  ll_condition_overall: string;
  ll_video_standard: string | null;
  flag_with_cables: boolean;
  flag_with_controller: boolean;
  ts_acquired: string | null;
  nb_price_paid: number | null;
  ll_purchase_location: string | null;
  ll_notes: string | null;
  ts_create: string;
  ts_update: string;
  console_slug: string;
  console_name: string;
}
