import DatabaseUtil from "@utils/database.util";
import { CollectionItemWithGame } from "@models/collection.model";
import { WishlistItemWithGame } from "@models/wishlist.model";

export interface ConsoleBreakdown {
	console_slug: string;
	console_name: string;
	nb_owned: number;
}

export interface DashboardStats {
	nb_collection_games: number;
	nb_wishlist_games: number;
	nb_collection_consoles: number;
	nb_wishlist_consoles: number;
	total_spent: number;
	total_games: number;
	by_console: ConsoleBreakdown[];
}

export default class DashboardQueries {
	static async getStats(): Promise<DashboardStats> {
		const [collectionCount, wishlistCount, consoleCollectionCount, consoleWishlistCount, totalGamesCount, spentResult, byConsoleResult] =
			await Promise.all([
				DatabaseUtil.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ref_collection`),
				DatabaseUtil.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ref_wishlist`),
				DatabaseUtil.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ref_console_collection`),
				DatabaseUtil.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ref_console_wishlist`),
				// Total du catalogue (§3.4 refonte) : sert à calculer la 3e tranche du donut "reste du
				// catalogue" côté frontend (total - collection - wishlist, un jeu n'étant jamais les deux).
				DatabaseUtil.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ref_game`),
				DatabaseUtil.query<{ total: string | null }>(
					`SELECT (
					   COALESCE((SELECT SUM(nb_price_paid) FROM ref_collection), 0) +
					   COALESCE((SELECT SUM(nb_price_paid) FROM ref_console_collection), 0)
					 )::text AS total`
				),
				DatabaseUtil.query<ConsoleBreakdown>(
					`SELECT c.ll_slug AS console_slug, c.ll_name AS console_name, COUNT(col.id)::int AS nb_owned
					 FROM ref_console c
					 LEFT JOIN ref_game g ON g.id_console = c.id
					 LEFT JOIN ref_collection col ON col.id_game = g.id
					 GROUP BY c.id
					 ORDER BY c.nb_sort_order, c.ll_name`
				),
			]);

		return {
			nb_collection_games: Number(collectionCount.rows[0]?.count ?? 0),
			nb_wishlist_games: Number(wishlistCount.rows[0]?.count ?? 0),
			nb_collection_consoles: Number(consoleCollectionCount.rows[0]?.count ?? 0),
			nb_wishlist_consoles: Number(consoleWishlistCount.rows[0]?.count ?? 0),
			total_spent: Number(spentResult.rows[0]?.total ?? 0),
			total_games: Number(totalGamesCount.rows[0]?.count ?? 0),
			by_console: byConsoleResult.rows,
		};
	}

	static async getRecentCollection(limit: number): Promise<CollectionItemWithGame[]> {
		const result = await DatabaseUtil.query<CollectionItemWithGame>(
			`SELECT col.*, g.ll_title AS title, c.ll_slug AS console_slug, c.ll_name AS console_name,
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
			 ORDER BY col.ts_create DESC
			 LIMIT $1`,
			[limit]
		);
		return result.rows;
	}

	static async getRecentWishlist(limit: number): Promise<WishlistItemWithGame[]> {
		const result = await DatabaseUtil.query<WishlistItemWithGame>(
			`SELECT wl.*, g.ll_title AS title, c.ll_slug AS console_slug, c.ll_name AS console_name,
			        cov.ll_image_url AS cover_front_url
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
			 ORDER BY wl.ts_create DESC
			 LIMIT $1`,
			[limit]
		);
		return result.rows;
	}
}
