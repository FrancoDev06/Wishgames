export type NotificationType = "SUCCESS" | "ERROR";

export interface Notification {
	id: string;
	ll_type: NotificationType;
	ll_message: string;
	ts_create: string;
}
