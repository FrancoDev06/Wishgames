import { VideoStandard, WishlistStatus } from "./common.model";

export interface ConsoleWishlistItem {
	id: string;
	id_console: string;
	ll_desired_video_standard: VideoStandard | null;
	ts_last_checked: string | null;
	ll_status: WishlistStatus;
	ts_create: string;
	ts_update: string;
}

export interface ConsoleWishlistItemWithConsole extends ConsoleWishlistItem {
	console_slug: string;
	console_name: string;
	nb_offers: number;
}
