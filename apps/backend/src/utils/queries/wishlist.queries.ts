import DatabaseUtil from "@utils/database.util";
import { WishlistItem, WishlistItemWithGame } from "@models/wishlist.model";
import { CollectionItem } from "@models/collection.model";
import { WishlistStatus } from "@models/common.model";
import ActivityLogQueries from "@queries/activity-log.queries";

export interface WishlistCreatePayload {
	id_game: string;
	ts_last_checked?: string | null;
	ll_desired_completeness?: string | null;
	ll_desired_condition?: string | null;
	ll_desired_regions?: string[];
	nb_priority?: number | null;
}

// ll_status n'est jamais settable à la création (nouvel item = toujours SEARCHING via le défaut
// DB, cf. migration 0009) — seul update() peut le faire évoluer (vue Chasse / kanban).
export type WishlistUpdatePayload = Partial<Omit<WishlistCreatePayload, "id_game">> & { ll_status?: WishlistStatus };

export interface WishlistBuyPayload {
	// Région de l'édition effectivement achetée (§2bis) — optionnelle.
	ll_region?: string | null;
	nb_quantity?: number;
	ll_completeness: string;
	ll_condition_overall: string;
	ll_condition_box?: string | null;
	ll_condition_manual?: string | null;
	ll_condition_media?: string | null;
	ts_acquired?: string | null;
	nb_price_paid?: number | null;
	ll_purchase_location?: string | null;
	ll_notes?: string | null;
}

const SELECT_WITH_GAME = `
	SELECT wl.*, g.ll_title AS title, c.ll_slug AS console_slug, c.ll_name AS console_name,
	       cov.ll_image_url AS cover_front_url,
	       (SELECT COUNT(*)::int FROM ref_wishlist_offer wo WHERE wo.id_wishlist = wl.id) AS nb_offers,
	       (SELECT MIN(nb_price) FROM ref_wishlist_offer wo WHERE wo.id_wishlist = wl.id) AS min_offer_price
	FROM ref_wishlist wl
	JOIN ref_game g ON g.id = wl.id_game
	JOIN ref_console c ON c.id = g.id_console
	LEFT JOIN LATERAL (
		SELECT ll_image_url
		FROM ref_cover c2
		WHERE c2.id_game = g.id AND c2.ll_cover_type = 'FRONT'
		ORDER BY CASE c2.ll_region WHEN 'Europe' THEN 1 WHEN 'North America' THEN 2 WHEN 'Japan' THEN 3 ELSE 4 END
		LIMIT 1
	) cov ON true
`;

export default class WishlistQueries {
	static async list(consoleSlug?: string): Promise<WishlistItemWithGame[]> {
		const values: unknown[] = [];
		let where = "";
		if (consoleSlug) {
			values.push(consoleSlug);
			where = `WHERE c.ll_slug = $1`;
		}
		const result = await DatabaseUtil.query<WishlistItemWithGame>(
			`${SELECT_WITH_GAME} ${where} ORDER BY wl.nb_priority DESC NULLS LAST, wl.ts_create DESC`,
			values
		);
		return result.rows;
	}

	static async getById(id: string): Promise<WishlistItemWithGame | null> {
		const result = await DatabaseUtil.query<WishlistItemWithGame>(`${SELECT_WITH_GAME} WHERE wl.id = $1`, [id]);
		return result.rows[0] ?? null;
	}

	static async getRaw(id: string): Promise<WishlistItem | null> {
		const result = await DatabaseUtil.query<WishlistItem>(`SELECT * FROM ref_wishlist WHERE id = $1`, [id]);
		return result.rows[0] ?? null;
	}

	static async create(payload: WishlistCreatePayload): Promise<WishlistItem> {
		const result = await DatabaseUtil.query<WishlistItem>(
			`INSERT INTO ref_wishlist
			 (id_game, ts_last_checked, ll_desired_completeness, ll_desired_condition, ll_desired_regions, nb_priority)
			 VALUES ($1, $2, $3, $4, COALESCE($5, '{}'::text[]), $6)
			 RETURNING *`,
			[
				payload.id_game,
				payload.ts_last_checked ?? null,
				payload.ll_desired_completeness ?? null,
				payload.ll_desired_condition ?? null,
				payload.ll_desired_regions ?? null,
				payload.nb_priority ?? null,
			]
		);

		const withGame = await this.getById(result.rows[0].id);
		if (withGame) {
			await ActivityLogQueries.log({
				ll_kind: "wishlist_game",
				ll_action: "added",
				ll_title: withGame.title,
				ll_console_slug: withGame.console_slug,
				ll_console_name: withGame.console_name,
				ll_cover_url: withGame.cover_front_url,
			});
		}

		return result.rows[0];
	}

	static async update(id: string, payload: WishlistUpdatePayload): Promise<WishlistItem | null> {
		const fields = Object.keys(payload) as (keyof WishlistUpdatePayload)[];
		if (fields.length === 0) return this.getRaw(id);

		const setClauses = fields.map((field, i) => `${field} = $${i + 2}`);
		const values = fields.map((field) => payload[field]);

		const result = await DatabaseUtil.query<WishlistItem>(
			`UPDATE ref_wishlist SET ${setClauses.join(", ")} WHERE id = $1 RETURNING *`,
			[id, ...values]
		);

		const withGame = await this.getById(id);
		if (withGame) {
			await ActivityLogQueries.log({
				ll_kind: "wishlist_game",
				ll_action: "edited",
				ll_title: withGame.title,
				ll_console_slug: withGame.console_slug,
				ll_console_name: withGame.console_name,
				ll_cover_url: withGame.cover_front_url,
			});
		}

		return result.rows[0] ?? null;
	}

	static async delete(id: string): Promise<boolean> {
		const withGame = await this.getById(id);

		const result = await DatabaseUtil.query(`DELETE FROM ref_wishlist WHERE id = $1`, [id]);
		const deleted = (result.rowCount ?? 0) > 0;

		if (deleted && withGame) {
			await ActivityLogQueries.log({
				ll_kind: "wishlist_game",
				ll_action: "deleted",
				ll_title: withGame.title,
				ll_console_slug: withGame.console_slug,
				ll_console_name: withGame.console_name,
				ll_cover_url: withGame.cover_front_url,
			});
		}

		return deleted;
	}

	// Bouton "Acheter" (§3.2) : supprime la wishlist et crée l'entrée collection dans une même transaction.
	static async buy(id: string, payload: WishlistBuyPayload): Promise<CollectionItem | null> {
		const client = await DatabaseUtil.pool.connect();
		try {
			await client.query("BEGIN");

			const wishlistResult = await client.query<WishlistItem>(`SELECT * FROM ref_wishlist WHERE id = $1 FOR UPDATE`, [id]);
			const wishlistItem = wishlistResult.rows[0];
			if (!wishlistItem) {
				await client.query("ROLLBACK");
				return null;
			}

			await client.query(`DELETE FROM ref_wishlist WHERE id = $1`, [id]);

			const collectionResult = await client.query<CollectionItem>(
				`INSERT INTO ref_collection
				 (id_game, ll_region, nb_quantity, ll_completeness, ll_condition_overall, ll_condition_box, ll_condition_manual, ll_condition_media, ts_acquired, nb_price_paid, ll_purchase_location, ll_notes)
				 VALUES ($1, $2, COALESCE($3, 1), $4, $5, $6, $7, $8, $9, $10, $11, $12)
				 RETURNING *`,
				[
					wishlistItem.id_game,
					payload.ll_region ?? null,
					payload.nb_quantity ?? null,
					payload.ll_completeness,
					payload.ll_condition_overall,
					payload.ll_condition_box ?? null,
					payload.ll_condition_manual ?? null,
					payload.ll_condition_media ?? null,
					payload.ts_acquired ?? null,
					payload.nb_price_paid ?? null,
					payload.ll_purchase_location ?? null,
					payload.ll_notes ?? null,
				]
			);

			const gameInfo = await client.query<{ title: string; console_slug: string; console_name: string }>(
				`SELECT g.ll_title AS title, c.ll_slug AS console_slug, c.ll_name AS console_name
				 FROM ref_game g JOIN ref_console c ON c.id = g.id_console WHERE g.id = $1`,
				[wishlistItem.id_game]
			);
			const info = gameInfo.rows[0];
			if (info) {
				await ActivityLogQueries.log(
					{
						ll_kind: "collection_game",
						ll_action: "bought",
						ll_title: info.title,
						ll_console_slug: info.console_slug,
						ll_console_name: info.console_name,
						nb_price: collectionResult.rows[0].nb_price_paid ?? null,
					},
					client
				);
			}

			await client.query("COMMIT");
			return collectionResult.rows[0];
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	}
}
