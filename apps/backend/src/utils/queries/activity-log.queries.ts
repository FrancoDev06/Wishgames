import { Pool, PoolClient } from "pg";
import DatabaseUtil from "@utils/database.util";
import { ActivityLogEntry, ActivityKind, ActivityAction } from "@models/activity-log.model";

export interface ActivityLogInput {
	ll_kind: ActivityKind;
	ll_action: ActivityAction;
	ll_title: string;
	ll_console_slug: string;
	ll_console_name: string;
	ll_cover_url?: string | null;
	nb_price?: number | null;
}

export interface ActivityLogListResult {
	rows: ActivityLogEntry[];
	total: number;
}

export default class ActivityLogQueries {
	// `runner` accepte le client d'une transaction en cours (ex. WishlistQueries.buy) pour que
	// l'écriture du log reste atomique avec la mutation qu'elle documente ; par défaut le pool.
	static async log(input: ActivityLogInput, runner: Pool | PoolClient = DatabaseUtil.pool): Promise<void> {
		await runner.query(
			`INSERT INTO ref_activity_log (ll_kind, ll_action, ll_title, ll_console_slug, ll_console_name, ll_cover_url, nb_price)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			[
				input.ll_kind,
				input.ll_action,
				input.ll_title,
				input.ll_console_slug,
				input.ll_console_name,
				input.ll_cover_url ?? null,
				input.nb_price ?? null,
			]
		);
	}

	static async list(opts: { kind?: ActivityKind; limit: number; offset: number }): Promise<ActivityLogListResult> {
		const values: unknown[] = [];
		let where = "";
		if (opts.kind) {
			values.push(opts.kind);
			where = `WHERE ll_kind = $${values.length}`;
		}
		values.push(opts.limit);
		const limitParam = `$${values.length}`;
		values.push(opts.offset);
		const offsetParam = `$${values.length}`;

		// count(*) OVER() : le total (pour la pagination) en une seule requête, pas de COUNT séparé.
		const result = await DatabaseUtil.query<ActivityLogEntry & { total_count: string }>(
			`SELECT *, count(*) OVER()::text AS total_count
			 FROM ref_activity_log
			 ${where}
			 ORDER BY ts_create DESC
			 LIMIT ${limitParam} OFFSET ${offsetParam}`,
			values
		);

		return {
			rows: result.rows.map(({ total_count, ...row }) => row),
			total: Number(result.rows[0]?.total_count ?? 0),
		};
	}
}
