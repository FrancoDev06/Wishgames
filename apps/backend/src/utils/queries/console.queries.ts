import DatabaseUtil from "@utils/database.util";
import { ConsoleWithGameCount, Console } from "@models/console.model";

export default class ConsoleQueries {
	static async list(): Promise<ConsoleWithGameCount[]> {
		const result = await DatabaseUtil.query<ConsoleWithGameCount>(
			`SELECT c.*, COUNT(g.id)::int AS nb_games
			 FROM ref_console c
			 LEFT JOIN ref_game g ON g.id_console = c.id
			 GROUP BY c.id
			 ORDER BY c.nb_sort_order, c.ll_name`
		);
		return result.rows;
	}

	static async getBySlug(slug: string): Promise<Console | null> {
		const result = await DatabaseUtil.query<Console>(`SELECT * FROM ref_console WHERE ll_slug = $1`, [slug]);
		return result.rows[0] ?? null;
	}
}
