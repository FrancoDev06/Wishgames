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

// Un jeu peut avoir plusieurs jaquettes FRONT, une par région (§2bis) : LEFT JOIN (pas LATERAL)
// pour obtenir une ligne de résultat par édition régionale plutôt qu'une seule ligne par jeu avec
// une jaquette "par défaut" choisie arbitrairement (retour utilisateur — on ne savait plus dans
// quelle région un jeu était disponible). Un jeu sans jaquette FRONT du tout garde une seule ligne
// (cov.* à NULL). FRONT reste la jaquette qui définit les lignes/régions ; le rendu 3D (BOX_3D,
// retour utilisateur — c'est ce qu'on veut voir sur les cartes) est superposé par-dessus quand il
// existe pour cette même région, avec repli sur le scan plat sinon.
const COVER_JOIN = `
	LEFT JOIN ref_cover cov ON cov.id_game = g.id AND cov.ll_cover_type = 'FRONT'
	LEFT JOIN ref_cover cov3d ON cov3d.id_game = g.id AND cov3d.ll_cover_type = 'BOX_3D' AND cov3d.ll_region IS NOT DISTINCT FROM cov.ll_region
`;

// Possession/recherche évaluées pour la région précise de CETTE ligne (cov.ll_region), pas pour le
// jeu toutes régions confondues. Quand la ligne n'a pas de région (pas de jaquette FRONT), on retombe
// sur "n'importe quelle ligne de collection/wishlist du jeu" faute d'information plus précise.
const IN_COLLECTION_EXPR = `
	CASE WHEN cov.ll_region IS NULL
		THEN EXISTS (SELECT 1 FROM ref_collection rc WHERE rc.id_game = g.id)
		ELSE EXISTS (SELECT 1 FROM ref_collection rc WHERE rc.id_game = g.id AND rc.ll_region = cov.ll_region)
	END
`;

// Recherche évaluée pour la région précise de CETTE ligne (cov.ll_region), même logique que
// IN_COLLECTION_EXPR — une entrée wishlist peut désormais cibler une édition régionale précise,
// plusieurs entrées possibles pour un même jeu (une par région suivie séparément, §2bis/§9).
const IN_WISHLIST_EXPR = `
	CASE WHEN cov.ll_region IS NULL
		THEN EXISTS (SELECT 1 FROM ref_wishlist rw WHERE rw.id_game = g.id)
		ELSE EXISTS (SELECT 1 FROM ref_wishlist rw WHERE rw.id_game = g.id AND rw.ll_region = cov.ll_region)
	END
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
		if (filters.status === "collection") conditions.push(IN_COLLECTION_EXPR);
		if (filters.status === "wishlist") conditions.push(IN_WISHLIST_EXPR);
		if (filters.status === "none") conditions.push(`NOT (${IN_COLLECTION_EXPR}) AND NOT (${IN_WISHLIST_EXPR})`);

		const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

		// Le compte porte sur les mêmes lignes (jeu x région) que la liste : le JOIN doit donc être
		// present ici aussi, sans quoi le total ne correspondrait plus aux lignes paginées.
		const from = `
			FROM ref_game g
			JOIN ref_console c ON c.id = g.id_console
			${COVER_JOIN}
			${where}
		`;
		const countResult = await DatabaseUtil.query<{ count: string }>(`SELECT COUNT(*)::text AS count ${from}`, values);
		const total = Number(countResult.rows[0]?.count ?? 0);

		const listValues = [...values, filters.limit, filters.offset];
		const itemsResult = await DatabaseUtil.query<GameListItem>(
			`SELECT g.*, c.ll_slug AS console_slug, c.ll_name AS console_name,
			        cov.ll_region AS region,
			        COALESCE(cov3d.ll_image_url, cov.ll_image_url) AS cover_front_url,
			        ${IN_COLLECTION_EXPR} AS in_collection,
			        ${IN_WISHLIST_EXPR} AS in_wishlist
			 ${from}
			 ORDER BY g.ll_title, CASE cov.ll_region WHEN 'Europe' THEN 1 WHEN 'North America' THEN 2 WHEN 'Japan' THEN 3 ELSE 4 END
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
