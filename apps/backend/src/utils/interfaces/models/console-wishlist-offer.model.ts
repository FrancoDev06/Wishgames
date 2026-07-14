export interface ConsoleWishlistOffer {
	id: string;
	id_console_wishlist: string;
	nb_price: number | null;
	ll_source_label: string | null;
	ll_source_url: string | null;
	ll_notes: string | null;
	// Complétude/état constatés sur cette offre précise, symétrique à WishlistOffer côté jeux (§3.5).
	ll_completeness: string | null;
	ll_condition_overall: string | null;
	ts_create: string;
	ts_update: string;
}
