import DatabaseUtil from "@utils/database.util";
import { Notification, NotificationType } from "@models/notification.model";

export default class NotificationQueries {
	// Historique 30 jours glissants (§4 du cahier des charges) — pas de purge planifiée nécessaire,
	// le filtre à la lecture suffit pour un volume de notifications aussi faible.
	static async listRecent(): Promise<Notification[]> {
		const result = await DatabaseUtil.query<Notification>(
			`SELECT * FROM ref_notification WHERE ts_create > now() - interval '30 days' ORDER BY ts_create DESC`
		);
		return result.rows;
	}

	static async create(type: NotificationType, message: string): Promise<Notification> {
		const result = await DatabaseUtil.query<Notification>(
			`INSERT INTO ref_notification (ll_type, ll_message) VALUES ($1, $2) RETURNING *`,
			[type, message]
		);
		return result.rows[0];
	}

	static async delete(id: string): Promise<boolean> {
		const result = await DatabaseUtil.query(`DELETE FROM ref_notification WHERE id = $1`, [id]);
		return (result.rowCount ?? 0) > 0;
	}
}
