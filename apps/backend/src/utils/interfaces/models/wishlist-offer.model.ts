export interface WishlistOffer {
	id: string;
	id_wishlist: string;
	nb_price: number | null;
	ll_source_label: string | null;
	ll_source_url: string | null;
	// Annotation libre sur cette offre précise (ex. "complet en boîte", état constaté) — distincte
	// des critères de recherche globaux du jeu (§3.2).
	ll_notes: string | null;
	// Complétude/état constatés sur cette offre précise (ex. Vinted : "complet boîte et jeu bon état
	// et notice très bon état") — distincts des critères de recherche globaux du jeu (§3.2).
	ll_completeness: string | null;
	ll_condition_media: string | null;
	ll_condition_box: string | null;
	ll_condition_manual: string | null;
	ts_create: string;
	ts_update: string;
}
