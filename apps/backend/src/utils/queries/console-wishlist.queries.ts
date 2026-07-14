import DatabaseUtil from "@utils/database.util";
import { ConsoleWishlistItem, ConsoleWishlistItemWithConsole } from "@models/console-wishlist.model";
import { ConsoleCollectionItem } from "@models/console-collection.model";
import { ConsoleCollectionCreatePayload } from "@queries/console-collection.queries";
import { WishlistStatus } from "@models/common.model";
import ActivityLogQueries from "@queries/activity-log.queries";

export interface ConsoleWishlistCreatePayload {
	id_console: string;
	ll_desired_video_standard?: string | null;
	ts_last_checked?: string | null;
}

// ll_status n'est jamais settable à la création (défaut DB SEARCHING, cf. migration 0009) — voir
// wishlist.queries.ts pour le même choix côté jeux.
export type ConsoleWishlistUpdatePayload = Partial<Omit<ConsoleWishlistCreatePayload, "id_console">> & { ll_status?: WishlistStatus };

export type ConsoleWishlistBuyPayload = Omit<ConsoleCollectionCreatePayload, "id_console">;

const SELECT_WITH_CONSOLE = `
	SELECT cw.*, c.ll_slug AS console_slug, c.ll_name AS console_name,
	       (SELECT COUNT(*)::int FROM ref_console_wishlist_offer cwo WHERE cwo.id_console_wishlist = cw.id) AS nb_offers
	FROM ref_console_wishlist cw
	JOIN ref_console c ON c.id = cw.id_console
`;

export default class ConsoleWishlistQueries {
	static async list(): Promise<ConsoleWishlistItemWithConsole[]> {
		const result = await DatabaseUtil.query<ConsoleWishlistItemWithConsole>(
			`${SELECT_WITH_CONSOLE} ORDER BY c.nb_sort_order, c.ll_name`
		);
		return result.rows;
	}

	static async getById(id: string): Promise<ConsoleWishlistItemWithConsole | null> {
		const result = await DatabaseUtil.query<ConsoleWishlistItemWithConsole>(`${SELECT_WITH_CONSOLE} WHERE cw.id = $1`, [id]);
		return result.rows[0] ?? null;
	}

	static async getRaw(id: string): Promise<ConsoleWishlistItem | null> {
		const result = await DatabaseUtil.query<ConsoleWishlistItem>(`SELECT * FROM ref_console_wishlist WHERE id = $1`, [id]);
		return result.rows[0] ?? null;
	}

	static async create(payload: ConsoleWishlistCreatePayload): Promise<ConsoleWishlistItem> {
		const result = await DatabaseUtil.query<ConsoleWishlistItem>(
			`INSERT INTO ref_console_wishlist (id_console, ll_desired_video_standard, ts_last_checked)
			 VALUES ($1, $2, $3) RETURNING *`,
			[payload.id_console, payload.ll_desired_video_standard ?? null, payload.ts_last_checked ?? null]
		);

		const withConsole = await this.getById(result.rows[0].id);
		if (withConsole) {
			await ActivityLogQueries.log({
				ll_kind: "wishlist_console",
				ll_action: "added",
				ll_title: withConsole.console_name,
				ll_console_slug: withConsole.console_slug,
				ll_console_name: withConsole.console_name,
			});
		}

		return result.rows[0];
	}

	static async update(id: string, payload: ConsoleWishlistUpdatePayload): Promise<ConsoleWishlistItem | null> {
		const fields = Object.keys(payload) as (keyof ConsoleWishlistUpdatePayload)[];
		if (fields.length === 0) return this.getRaw(id);

		const setClauses = fields.map((field, i) => `${field} = $${i + 2}`);
		const values = fields.map((field) => payload[field]);

		const result = await DatabaseUtil.query<ConsoleWishlistItem>(
			`UPDATE ref_console_wishlist SET ${setClauses.join(", ")} WHERE id = $1 RETURNING *`,
			[id, ...values]
		);

		const withConsole = await this.getById(id);
		if (withConsole) {
			await ActivityLogQueries.log({
				ll_kind: "wishlist_console",
				ll_action: "edited",
				ll_title: withConsole.console_name,
				ll_console_slug: withConsole.console_slug,
				ll_console_name: withConsole.console_name,
			});
		}

		return result.rows[0] ?? null;
	}

	static async delete(id: string): Promise<boolean> {
		const withConsole = await this.getById(id);

		const result = await DatabaseUtil.query(`DELETE FROM ref_console_wishlist WHERE id = $1`, [id]);
		const deleted = (result.rowCount ?? 0) > 0;

		if (deleted && withConsole) {
			await ActivityLogQueries.log({
				ll_kind: "wishlist_console",
				ll_action: "deleted",
				ll_title: withConsole.console_name,
				ll_console_slug: withConsole.console_slug,
				ll_console_name: withConsole.console_name,
			});
		}

		return deleted;
	}

	static async buy(id: string, payload: ConsoleWishlistBuyPayload): Promise<ConsoleCollectionItem | null> {
		const client = await DatabaseUtil.pool.connect();
		try {
			await client.query("BEGIN");

			const wishlistResult = await client.query<ConsoleWishlistItem>(
				`SELECT * FROM ref_console_wishlist WHERE id = $1 FOR UPDATE`,
				[id]
			);
			const wishlistItem = wishlistResult.rows[0];
			if (!wishlistItem) {
				await client.query("ROLLBACK");
				return null;
			}

			await client.query(`DELETE FROM ref_console_wishlist WHERE id = $1`, [id]);

			const collectionResult = await client.query<ConsoleCollectionItem>(
				`INSERT INTO ref_console_collection
				 (id_console, nb_quantity, ll_completeness, ll_condition_overall, ll_video_standard, flag_with_cables, flag_with_controller, ts_acquired, nb_price_paid, ll_purchase_location, ll_notes)
				 VALUES ($1, COALESCE($2, 1), $3, $4, $5, COALESCE($6, false), COALESCE($7, false), $8, $9, $10, $11)
				 RETURNING *`,
				[
					wishlistItem.id_console,
					payload.nb_quantity ?? null,
					payload.ll_completeness,
					payload.ll_condition_overall,
					payload.ll_video_standard ?? null,
					payload.flag_with_cables ?? null,
					payload.flag_with_controller ?? null,
					payload.ts_acquired ?? null,
					payload.nb_price_paid ?? null,
					payload.ll_purchase_location ?? null,
					payload.ll_notes ?? null,
				]
			);

			const consoleInfo = await client.query<{ console_slug: string; console_name: string }>(
				`SELECT ll_slug AS console_slug, ll_name AS console_name FROM ref_console WHERE id = $1`,
				[wishlistItem.id_console]
			);
			const info = consoleInfo.rows[0];
			if (info) {
				await ActivityLogQueries.log(
					{
						ll_kind: "collection_console",
						ll_action: "bought",
						ll_title: info.console_name,
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
