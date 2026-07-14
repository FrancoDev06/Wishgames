import DatabaseUtil from "@utils/database.util";
import { CollectionItem, CollectionItemWithGame } from "@models/collection.model";
import ActivityLogQueries from "@queries/activity-log.queries";

export interface CollectionCreatePayload {
	id_game: string;
	// Région de l'édition possédée (§2bis) — optionnelle, permet plusieurs lignes pour le même jeu.
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

export type CollectionUpdatePayload = Partial<Omit<CollectionCreatePayload, "id_game">>;

// La jaquette affichée pour une ligne de collection correspond à sa propre région quand elle est
// connue (col.ll_region) ; sinon on retombe sur la priorité Europe -> USA -> Japon habituelle (§2bis).
const SELECT_WITH_GAME = `
	SELECT col.*, g.ll_title AS title, c.ll_slug AS console_slug, c.ll_name AS console_name,
	       cov.ll_image_url AS cover_front_url
	FROM ref_collection col
	JOIN ref_game g ON g.id = col.id_game
	JOIN ref_console c ON c.id = g.id_console
	LEFT JOIN LATERAL (
		SELECT ll_image_url
		FROM ref_cover c2
		WHERE c2.id_game = g.id AND c2.ll_cover_type = 'FRONT'
		ORDER BY
			CASE WHEN c2.ll_region = col.ll_region THEN 0 ELSE 1 END,
			CASE c2.ll_region WHEN 'Europe' THEN 1 WHEN 'North America' THEN 2 WHEN 'Japan' THEN 3 ELSE 4 END
		LIMIT 1
	) cov ON true
`;

export default class CollectionQueries {
	static async list(consoleSlug?: string): Promise<CollectionItemWithGame[]> {
		const values: unknown[] = [];
		let where = "";
		if (consoleSlug) {
			values.push(consoleSlug);
			where = `WHERE c.ll_slug = $1`;
		}
		const result = await DatabaseUtil.query<CollectionItemWithGame>(
			`${SELECT_WITH_GAME} ${where} ORDER BY col.ts_create DESC`,
			values
		);
		return result.rows;
	}

	static async getById(id: string): Promise<CollectionItemWithGame | null> {
		const result = await DatabaseUtil.query<CollectionItemWithGame>(`${SELECT_WITH_GAME} WHERE col.id = $1`, [id]);
		return result.rows[0] ?? null;
	}

	static async getRaw(id: string): Promise<CollectionItem | null> {
		const result = await DatabaseUtil.query<CollectionItem>(`SELECT * FROM ref_collection WHERE id = $1`, [id]);
		return result.rows[0] ?? null;
	}

	static async create(payload: CollectionCreatePayload): Promise<CollectionItem> {
		const result = await DatabaseUtil.query<CollectionItem>(
			`INSERT INTO ref_collection
			 (id_game, ll_region, nb_quantity, ll_completeness, ll_condition_overall, ll_condition_box, ll_condition_manual, ll_condition_media, ts_acquired, nb_price_paid, ll_purchase_location, ll_notes)
			 VALUES ($1, $2, COALESCE($3, 1), $4, $5, $6, $7, $8, $9, $10, $11, $12)
			 RETURNING *`,
			[
				payload.id_game,
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

		const withGame = await this.getById(result.rows[0].id);
		if (withGame) {
			await ActivityLogQueries.log({
				ll_kind: "collection_game",
				ll_action: "added",
				ll_title: withGame.title,
				ll_console_slug: withGame.console_slug,
				ll_console_name: withGame.console_name,
				ll_cover_url: withGame.cover_front_url,
				nb_price: withGame.nb_price_paid,
			});
		}

		return result.rows[0];
	}

	static async update(id: string, payload: CollectionUpdatePayload): Promise<CollectionItem | null> {
		const fields = Object.keys(payload) as (keyof CollectionUpdatePayload)[];
		if (fields.length === 0) return this.getRaw(id);

		const setClauses = fields.map((field, i) => `${field} = $${i + 2}`);
		const values = fields.map((field) => payload[field]);

		const result = await DatabaseUtil.query<CollectionItem>(
			`UPDATE ref_collection SET ${setClauses.join(", ")} WHERE id = $1 RETURNING *`,
			[id, ...values]
		);

		const withGame = await this.getById(id);
		if (withGame) {
			await ActivityLogQueries.log({
				ll_kind: "collection_game",
				ll_action: "edited",
				ll_title: withGame.title,
				ll_console_slug: withGame.console_slug,
				ll_console_name: withGame.console_name,
				ll_cover_url: withGame.cover_front_url,
				nb_price: withGame.nb_price_paid,
			});
		}

		return result.rows[0] ?? null;
	}

	static async delete(id: string): Promise<boolean> {
		const withGame = await this.getById(id);

		const result = await DatabaseUtil.query(`DELETE FROM ref_collection WHERE id = $1`, [id]);
		const deleted = (result.rowCount ?? 0) > 0;

		if (deleted && withGame) {
			await ActivityLogQueries.log({
				ll_kind: "collection_game",
				ll_action: "deleted",
				ll_title: withGame.title,
				ll_console_slug: withGame.console_slug,
				ll_console_name: withGame.console_name,
				ll_cover_url: withGame.cover_front_url,
				nb_price: withGame.nb_price_paid,
			});
		}

		return deleted;
	}
}
