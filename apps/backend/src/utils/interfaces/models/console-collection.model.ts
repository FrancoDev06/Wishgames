import { Completeness, Condition, VideoStandard } from "./common.model";

export interface ConsoleCollectionItem {
	id: string;
	id_console: string;
	nb_quantity: number;
	ll_completeness: Completeness;
	ll_condition_overall: Condition;
	ll_video_standard: VideoStandard | null;
	flag_with_cables: boolean;
	flag_with_controller: boolean;
	ts_acquired: string | null;
	nb_price_paid: number | null;
	ll_purchase_location: string | null;
	ll_notes: string | null;
	ts_create: string;
	ts_update: string;
}

export interface ConsoleCollectionItemWithConsole extends ConsoleCollectionItem {
	console_slug: string;
	console_name: string;
}
