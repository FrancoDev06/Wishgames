import DatabaseUtil from "@utils/database.util";
import { WishlistOffer } from "@models/wishlist-offer.model";

export interface WishlistOfferPayload {
	nb_price?: number | null;
	ll_source_label?: string | null;
	ll_source_url?: string | null;
	ll_notes?: string | null;
	ll_completeness?: string | null;
	ll_condition_media?: string | null;
	ll_condition_box?: string | null;
	ll_condition_manual?: string | null;
}

export default class WishlistOfferQueries {
	static async list(idWishlist: string): Promise<WishlistOffer[]> {
		const result = await DatabaseUtil.query<WishlistOffer>(
			`SELECT * FROM ref_wishlist_offer WHERE id_wishlist = $1 ORDER BY nb_price ASC NULLS LAST, ts_create DESC`,
			[idWishlist]
		);
		return result.rows;
	}

	static async getById(id: string): Promise<WishlistOffer | null> {
		const result = await DatabaseUtil.query<WishlistOffer>(`SELECT * FROM ref_wishlist_offer WHERE id = $1`, [id]);
		return result.rows[0] ?? null;
	}

	static async create(idWishlist: string, payload: WishlistOfferPayload): Promise<WishlistOffer> {
		const result = await DatabaseUtil.query<WishlistOffer>(
			`INSERT INTO ref_wishlist_offer
			 (id_wishlist, nb_price, ll_source_label, ll_source_url, ll_notes, ll_completeness, ll_condition_media, ll_condition_box, ll_condition_manual)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
			[
				idWishlist,
				payload.nb_price ?? null,
				payload.ll_source_label ?? null,
				payload.ll_source_url ?? null,
				payload.ll_notes ?? null,
				payload.ll_completeness ?? null,
				payload.ll_condition_media ?? null,
				payload.ll_condition_box ?? null,
				payload.ll_condition_manual ?? null,
			]
		);
		return result.rows[0];
	}

	static async update(id: string, payload: WishlistOfferPayload): Promise<WishlistOffer | null> {
		const fields = Object.keys(payload) as (keyof WishlistOfferPayload)[];
		if (fields.length === 0) return this.getById(id);

		const setClauses = fields.map((field, i) => `${field} = $${i + 2}`);
		const values = fields.map((field) => payload[field]);

		const result = await DatabaseUtil.query<WishlistOffer>(
			`UPDATE ref_wishlist_offer SET ${setClauses.join(", ")} WHERE id = $1 RETURNING *`,
			[id, ...values]
		);
		return result.rows[0] ?? null;
	}

	static async delete(id: string): Promise<boolean> {
		const result = await DatabaseUtil.query(`DELETE FROM ref_wishlist_offer WHERE id = $1`, [id]);
		return (result.rowCount ?? 0) > 0;
	}
}
