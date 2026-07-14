import DatabaseUtil from "@utils/database.util";
import { ConsoleWishlistOffer } from "@models/console-wishlist-offer.model";

export interface ConsoleWishlistOfferPayload {
	nb_price?: number | null;
	ll_source_label?: string | null;
	ll_source_url?: string | null;
	ll_notes?: string | null;
	ll_completeness?: string | null;
	ll_condition_overall?: string | null;
}

// Offres multiples pour une console recherchée (§3.5), symétrique à WishlistOfferQueries côté jeux.
export default class ConsoleWishlistOfferQueries {
	static async list(idConsoleWishlist: string): Promise<ConsoleWishlistOffer[]> {
		const result = await DatabaseUtil.query<ConsoleWishlistOffer>(
			`SELECT * FROM ref_console_wishlist_offer WHERE id_console_wishlist = $1 ORDER BY nb_price ASC NULLS LAST, ts_create DESC`,
			[idConsoleWishlist]
		);
		return result.rows;
	}

	static async getById(id: string): Promise<ConsoleWishlistOffer | null> {
		const result = await DatabaseUtil.query<ConsoleWishlistOffer>(`SELECT * FROM ref_console_wishlist_offer WHERE id = $1`, [id]);
		return result.rows[0] ?? null;
	}

	static async create(idConsoleWishlist: string, payload: ConsoleWishlistOfferPayload): Promise<ConsoleWishlistOffer> {
		const result = await DatabaseUtil.query<ConsoleWishlistOffer>(
			`INSERT INTO ref_console_wishlist_offer
			 (id_console_wishlist, nb_price, ll_source_label, ll_source_url, ll_notes, ll_completeness, ll_condition_overall)
			 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
			[
				idConsoleWishlist,
				payload.nb_price ?? null,
				payload.ll_source_label ?? null,
				payload.ll_source_url ?? null,
				payload.ll_notes ?? null,
				payload.ll_completeness ?? null,
				payload.ll_condition_overall ?? null,
			]
		);
		return result.rows[0];
	}

	static async update(id: string, payload: ConsoleWishlistOfferPayload): Promise<ConsoleWishlistOffer | null> {
		const fields = Object.keys(payload) as (keyof ConsoleWishlistOfferPayload)[];
		if (fields.length === 0) return this.getById(id);

		const setClauses = fields.map((field, i) => `${field} = $${i + 2}`);
		const values = fields.map((field) => payload[field]);

		const result = await DatabaseUtil.query<ConsoleWishlistOffer>(
			`UPDATE ref_console_wishlist_offer SET ${setClauses.join(", ")} WHERE id = $1 RETURNING *`,
			[id, ...values]
		);
		return result.rows[0] ?? null;
	}

	static async delete(id: string): Promise<boolean> {
		const result = await DatabaseUtil.query(`DELETE FROM ref_console_wishlist_offer WHERE id = $1`, [id]);
		return (result.rowCount ?? 0) > 0;
	}
}
