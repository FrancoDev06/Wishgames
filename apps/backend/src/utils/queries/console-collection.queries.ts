import DatabaseUtil from "@utils/database.util";
import { ConsoleCollectionItem, ConsoleCollectionItemWithConsole } from "@models/console-collection.model";
import ActivityLogQueries from "@queries/activity-log.queries";

export interface ConsoleCollectionCreatePayload {
	id_console: string;
	nb_quantity?: number;
	ll_completeness: string;
	ll_condition_overall: string;
	ll_video_standard?: string | null;
	flag_with_cables?: boolean;
	flag_with_controller?: boolean;
	ts_acquired?: string | null;
	nb_price_paid?: number | null;
	ll_purchase_location?: string | null;
	ll_notes?: string | null;
}

export type ConsoleCollectionUpdatePayload = Partial<Omit<ConsoleCollectionCreatePayload, "id_console">>;

const SELECT_WITH_CONSOLE = `
	SELECT cc.*, c.ll_slug AS console_slug, c.ll_name AS console_name
	FROM ref_console_collection cc
	JOIN ref_console c ON c.id = cc.id_console
`;

export default class ConsoleCollectionQueries {
	static async list(): Promise<ConsoleCollectionItemWithConsole[]> {
		const result = await DatabaseUtil.query<ConsoleCollectionItemWithConsole>(
			`${SELECT_WITH_CONSOLE} ORDER BY c.nb_sort_order, c.ll_name`
		);
		return result.rows;
	}

	static async getById(id: string): Promise<ConsoleCollectionItemWithConsole | null> {
		const result = await DatabaseUtil.query<ConsoleCollectionItemWithConsole>(`${SELECT_WITH_CONSOLE} WHERE cc.id = $1`, [id]);
		return result.rows[0] ?? null;
	}

	static async getRaw(id: string): Promise<ConsoleCollectionItem | null> {
		const result = await DatabaseUtil.query<ConsoleCollectionItem>(`SELECT * FROM ref_console_collection WHERE id = $1`, [id]);
		return result.rows[0] ?? null;
	}

	static async create(payload: ConsoleCollectionCreatePayload): Promise<ConsoleCollectionItem> {
		const result = await DatabaseUtil.query<ConsoleCollectionItem>(
			`INSERT INTO ref_console_collection
			 (id_console, nb_quantity, ll_completeness, ll_condition_overall, ll_video_standard, flag_with_cables, flag_with_controller, ts_acquired, nb_price_paid, ll_purchase_location, ll_notes)
			 VALUES ($1, COALESCE($2, 1), $3, $4, $5, COALESCE($6, false), COALESCE($7, false), $8, $9, $10, $11)
			 RETURNING *`,
			[
				payload.id_console,
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

		const withConsole = await this.getById(result.rows[0].id);
		if (withConsole) {
			await ActivityLogQueries.log({
				ll_kind: "collection_console",
				ll_action: "added",
				ll_title: withConsole.console_name,
				ll_console_slug: withConsole.console_slug,
				ll_console_name: withConsole.console_name,
				nb_price: withConsole.nb_price_paid,
			});
		}

		return result.rows[0];
	}

	static async update(id: string, payload: ConsoleCollectionUpdatePayload): Promise<ConsoleCollectionItem | null> {
		const fields = Object.keys(payload) as (keyof ConsoleCollectionUpdatePayload)[];
		if (fields.length === 0) return this.getRaw(id);

		const setClauses = fields.map((field, i) => `${field} = $${i + 2}`);
		const values = fields.map((field) => payload[field]);

		const result = await DatabaseUtil.query<ConsoleCollectionItem>(
			`UPDATE ref_console_collection SET ${setClauses.join(", ")} WHERE id = $1 RETURNING *`,
			[id, ...values]
		);

		const withConsole = await this.getById(id);
		if (withConsole) {
			await ActivityLogQueries.log({
				ll_kind: "collection_console",
				ll_action: "edited",
				ll_title: withConsole.console_name,
				ll_console_slug: withConsole.console_slug,
				ll_console_name: withConsole.console_name,
				nb_price: withConsole.nb_price_paid,
			});
		}

		return result.rows[0] ?? null;
	}

	static async delete(id: string): Promise<boolean> {
		const withConsole = await this.getById(id);

		const result = await DatabaseUtil.query(`DELETE FROM ref_console_collection WHERE id = $1`, [id]);
		const deleted = (result.rowCount ?? 0) > 0;

		if (deleted && withConsole) {
			await ActivityLogQueries.log({
				ll_kind: "collection_console",
				ll_action: "deleted",
				ll_title: withConsole.console_name,
				ll_console_slug: withConsole.console_slug,
				ll_console_name: withConsole.console_name,
				nb_price: withConsole.nb_price_paid,
			});
		}

		return deleted;
	}
}
