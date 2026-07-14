export interface Console {
	id: string;
	ll_slug: string;
	ll_name: string;
	ll_source_file: string;
	ll_platform_names: string[];
	nb_sort_order: number;
	ts_create: string;
	ts_update: string;
}

export interface ConsoleWithGameCount extends Console {
	nb_games: number;
}
