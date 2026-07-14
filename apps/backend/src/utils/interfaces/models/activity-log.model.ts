export type ActivityKind = "collection_game" | "wishlist_game" | "collection_console" | "wishlist_console";
export type ActivityAction = "added" | "edited" | "bought" | "deleted";

export interface ActivityLogEntry {
	id: string;
	ll_kind: ActivityKind;
	ll_action: ActivityAction;
	ll_title: string;
	ll_console_slug: string;
	ll_console_name: string;
	ll_cover_url: string | null;
	nb_price: number | null;
	ts_create: string;
}
