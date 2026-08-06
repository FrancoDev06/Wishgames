import DatabaseUtil from "@utils/database.util";
import QueryBuilderUtil from "@utils/query-builder.util";
import { CollectionItem, CollectionItemWithGame } from "@models/collection.model";
import { gameCoverJoin } from "@queries/_shared/game-cover.sql";
import { logIfPresent } from "@queries/_shared/log-if-present.util";

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

const UPDATABLE_FIELDS: (keyof CollectionUpdatePayload)[] = [
	"ll_region",
	"nb_quantity",
	"ll_completeness",
	"ll_condition_overall",
	"ll_condition_box",
	"ll_condition_manual",
	"ll_condition_media",
	"ts_acquired",
	"nb_price_paid",
	"ll_purchase_location",
	"ll_notes",
];

// La jaquette affichée pour une ligne de collection correspond à sa propre région quand elle est
// connue (col.ll_region) ; sinon on retombe sur la priorité Europe -> USA -> Japon habituelle
// (§2bis) — même logique que WishlistQueries.SELECT_WITH_GAME (fragment partagé, voir
// _shared/game-cover.sql.ts). Avant ce correctif, Collection/Wishlist ne regardaient jamais BOX_3D
// et retombaient toujours sur le scan plat même quand un rendu 3D existait pour la région exacte.
const SELECT_WITH_GAME = `
	SELECT col.*, g.ll_title AS title, c.ll_slug AS console_slug, c.ll_name AS console_name,
	       cov.ll_image_url AS cover_front_url
	FROM ref_collection col
	JOIN ref_game g ON g.id = col.id_game
	JOIN ref_console c ON c.id = g.id_console
	${gameCoverJoin("col")}
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
		await logIfPresent(withGame, (g) => ({
			ll_kind: "collection_game",
			ll_action: "added",
			ll_title: g.title,
			ll_console_slug: g.console_slug,
			ll_console_name: g.console_name,
			ll_cover_url: g.cover_front_url,
			nb_price: g.nb_price_paid,
		}));

		return result.rows[0];
	}

	static async update(id: string, payload: CollectionUpdatePayload): Promise<CollectionItem | null> {
		const { clause, values } = QueryBuilderUtil.buildSetClause(payload, UPDATABLE_FIELDS);
		if (!clause) return this.getRaw(id);

		const result = await DatabaseUtil.query<CollectionItem>(
			`UPDATE ref_collection SET ${clause} WHERE id = $1 RETURNING *`,
			[id, ...values]
		);

		const withGame = await this.getById(id);
		await logIfPresent(withGame, (g) => ({
			ll_kind: "collection_game",
			ll_action: "edited",
			ll_title: g.title,
			ll_console_slug: g.console_slug,
			ll_console_name: g.console_name,
			ll_cover_url: g.cover_front_url,
			nb_price: g.nb_price_paid,
		}));

		return result.rows[0] ?? null;
	}

	static async delete(id: string): Promise<boolean> {
		const withGame = await this.getById(id);

		const result = await DatabaseUtil.query(`DELETE FROM ref_collection WHERE id = $1`, [id]);
		const deleted = (result.rowCount ?? 0) > 0;

		if (deleted) {
			await logIfPresent(withGame, (g) => ({
				ll_kind: "collection_game",
				ll_action: "deleted",
				ll_title: g.title,
				ll_console_slug: g.console_slug,
				ll_console_name: g.console_name,
				ll_cover_url: g.cover_front_url,
				nb_price: g.nb_price_paid,
			}));
		}

		return deleted;
	}
}
