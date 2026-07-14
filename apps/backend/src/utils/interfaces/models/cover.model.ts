export type CoverType = "FRONT" | "BACK" | "MANUAL_FRONT" | "MANUAL_BACK" | "MEDIA" | "SPINE";

export interface Cover {
	id: string;
	id_game: string;
	ll_cover_type: CoverType;
	ll_region: string | null;
	ll_image_url: string;
	ts_create: string;
	ts_update: string;
}
