import DatabaseUtil from "@utils/database.util";
import { GameListItem, GameWithConsole } from "@models/game.model";
import { Cover } from "@models/cover.model";

export interface GameListFilters {
	consoleSlug?: string;
	status?: "collection" | "wishlist" | "none";
	search?: string;
	limit: number;
	offset: number;
}

export interface GameListResult {
	items: GameListItem[];
	total: number;
}

// Un jeu peut désormais avoir plusieurs jaquettes FRONT (une par région, §2bis) et plusieurs lignes
// de collection (une par région possédée) : EXISTS/LATERAL évitent de dupliquer les lignes de résultat
// qu'un simple LEFT JOIN provoquerait, et fixent une région par défaut pour la jaquette affichée en liste.
const DEFAULT_COVER_LATERAL = `
	LEFT JOIN LATERAL (
		SELECT ll_image_url
		FROM ref_cover c2
		WHERE c2.id_game = g.id AND c2.ll_cover_type = 'FRONT'
		ORDER BY CASE c2.ll_region WHEN 'Europe' THEN 1 WHEN 'North America' THEN 2 WHEN 'Japan' THEN 3 ELSE 4 END
		LIMIT 1
	) cov ON true
`;

export default class GameQueries {
	static async list(filters: GameListFilters): Promise<GameListResult> {
		const conditions: string[] = [];
		const values: unknown[] = [];

		if (filters.consoleSlug) {
			values.push(filters.consoleSlug);
			conditions.push(`c.ll_slug = $${values.length}`);
		}
		if (filters.search) {
			values.push(`%${filters.search}%`);
			conditions.push(`g.ll_title ILIKE $${values.length}`);
		}
		if (filters.status === "collection") conditions.push(`EXISTS (SELECT 1 FROM ref_collection col2 WHERE col2.id_game = g.id)`);
		if (filters.status === "wishlist") conditions.push(`EXISTS (SELECT 1 FROM ref_wishlist wl2 WHERE wl2.id_game = g.id)`);
		if (filters.status === "none")
			conditions.push(
				`NOT EXISTS (SELECT 1 FROM ref_collection col2 WHERE col2.id_game = g.id)
				 AND NOT EXISTS (SELECT 1 FROM ref_wishlist wl2 WHERE wl2.id_game = g.id)`
			);

		const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

		// Le compte n'a pas besoin de la jaquette : JOIN/WHERE seuls suffisent.
		const countFrom = `
			FROM ref_game g
			JOIN ref_console c ON c.id = g.id_console
			${where}
		`;
		const countResult = await DatabaseUtil.query<{ count: string }>(`SELECT COUNT(*)::text AS count ${countFrom}`, values);
		const total = Number(countResult.rows[0]?.count ?? 0);

		// La liste a besoin de la jaquette par défaut : le LATERAL doit précéder le WHERE (clause FROM complète).
		const listFrom = `
			FROM ref_game g
			JOIN ref_console c ON c.id = g.id_console
			${DEFAULT_COVER_LATERAL}
			${where}
		`;
		const listValues = [...values, filters.limit, filters.offset];
		const itemsResult = await DatabaseUtil.query<GameListItem>(
			`SELECT g.*, c.ll_slug AS console_slug, c.ll_name AS console_name,
			        cov.ll_image_url AS cover_front_url,
			        EXISTS (SELECT 1 FROM ref_collection col2 WHERE col2.id_game = g.id) AS in_collection,
			        EXISTS (SELECT 1 FROM ref_wishlist wl2 WHERE wl2.id_game = g.id) AS in_wishlist,
			        (SELECT COALESCE(array_agg(DISTINCT col3.ll_region) FILTER (WHERE col3.ll_region IS NOT NULL), '{}')
			           FROM ref_collection col3 WHERE col3.id_game = g.id) AS owned_regions,
			        (SELECT COALESCE(array_agg(DISTINCT c3.ll_region) FILTER (WHERE c3.ll_region IS NOT NULL), '{}')
			           FROM ref_cover c3 WHERE c3.id_game = g.id AND c3.ll_cover_type = 'FRONT') AS available_regions
			 ${listFrom}
			 ORDER BY g.ll_title
			 LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`,
			listValues
		);

		return { items: itemsResult.rows, total };
	}

	static async getById(id: string): Promise<GameWithConsole | null> {
		const result = await DatabaseUtil.query<GameWithConsole>(
			`SELECT g.*, c.ll_slug AS console_slug, c.ll_name AS console_name
			 FROM ref_game g
			 JOIN ref_console c ON c.id = g.id_console
			 WHERE g.id = $1`,
			[id]
		);
		return result.rows[0] ?? null;
	}

	// Retourne toutes les jaquettes du jeu, toutes régions confondues (une fiche catalogue, plusieurs
	// jaquettes par type désormais possibles) — sert à proposer les régions disponibles à l'achat.
	static async getCovers(idGame: string): Promise<Cover[]> {
		const result = await DatabaseUtil.query<Cover>(`SELECT * FROM ref_cover WHERE id_game = $1`, [idGame]);
		return result.rows;
	}
}
