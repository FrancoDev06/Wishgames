// Import du catalogue reconstruit (build-master-list-v2.ts) vers Supabase.
// Decision utilisateur (session 2026-07-27) : on vide TOUT (catalogue + collection/wishlist
// personnelles, sauvegarde prealable faite via backup-supabase.ts) et on repart des 12 consoles
// couvertes par mobygames-api + LaunchBox. Images hotlinkees (CDN MobyGames + LaunchBox), pas de
// copie locale.
//
// Usage : bun run scripts/import-master-catalog.ts

import { readFileSync } from "fs";
import { join } from "path";
import { Client } from "pg";

const MASTER_DIR = join(import.meta.dir, "master-lists-v2");

interface ConsoleSpec {
	slug: string;
	name: string;
}

const CONSOLES: ConsoleSpec[] = [
	{ slug: "sega-dreamcast", name: "Sega Dreamcast" },
	{ slug: "nintendo-gamecube", name: "Nintendo GameCube" },
	{ slug: "sega-genesis", name: "Sega Genesis" },
	{ slug: "nintendo-entertainment-system", name: "Nintendo Entertainment System" },
	{ slug: "nintendo-64", name: "Nintendo 64" },
	{ slug: "sony-playstation", name: "Sony Playstation" },
	{ slug: "sega-master-system", name: "Sega Master System" },
	{ slug: "sega-saturn", name: "Sega Saturn" },
	{ slug: "super-nintendo-entertainment-system", name: "Super Nintendo Entertainment System" },
	{ slug: "nec-turbografx-cd", name: "NEC TurboGrafx-CD" },
	{ slug: "nec-turbografx-16", name: "NEC TurboGrafx-16" },
	{ slug: "nec-supergrafx", name: "NEC SuperGrafx" },
];

interface MergedGame {
	nb_source_id: number;
	title: string;
	aka_titles: string[];
	description: string | null;
	release_year: number | null;
	genres: string[];
	gameplay: string[];
	perspective: string[];
	visual: string[];
	setting: string[];
	rating: number | null;
	rating_votes: number | null;
	developers: string[];
	publishers: string[];
	source_url: string | null;
	sources: string[];
	covers: { type: string; region: string; url: string; source: string }[];
}

function chunk<T>(arr: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
	return out;
}

async function main() {
	if (!process.env.SUPABASE_DB_HOST || !process.env.SUPABASE_DB_USER || !process.env.SUPABASE_DB_PASSWORD) {
		throw new Error("SUPABASE_DB_HOST / SUPABASE_DB_USER / SUPABASE_DB_PASSWORD manquants — voir .env.example");
	}

	const client = new Client({
		host: process.env.SUPABASE_DB_HOST,
		port: Number(process.env.SUPABASE_DB_PORT ?? 5432),
		database: process.env.SUPABASE_DB_NAME ?? "postgres",
		user: process.env.SUPABASE_DB_USER,
		password: process.env.SUPABASE_DB_PASSWORD,
		ssl: { rejectUnauthorized: false },
	});
	await client.connect();

	console.log("Vidage complet de la base (catalogue + collection/wishlist)...");
	await client.query(`
		TRUNCATE
			ref_wishlist_offer, ref_console_wishlist_offer,
			ref_collection, ref_wishlist,
			ref_console_collection, ref_console_wishlist,
			ref_activity_log, ref_notification,
			ref_cover, ref_game, ref_console
		CASCADE
	`);
	console.log("Base videe.\n");

	let sortOrder = 0;
	let grandTotalGames = 0;
	let grandTotalCovers = 0;

	for (const spec of CONSOLES) {
		const filePath = join(MASTER_DIR, `${spec.slug}.json`);
		const games: MergedGame[] = JSON.parse(readFileSync(filePath, "utf-8"));

		const consoleRes = await client.query(
			`INSERT INTO ref_console (ll_slug, ll_name, ll_source_file, ll_platform_names, nb_sort_order)
			 VALUES ($1, $2, $3, $4, $5) RETURNING id`,
			[spec.slug, spec.name, `${spec.slug}.json (mobygames-api + launchbox)`, [spec.name], sortOrder++]
		);
		const consoleId: string = consoleRes.rows[0].id;

		// ---- Jeux, par lots ----
		const gameIdByKey = new Map<string, string>(); // nb_source_id -> uuid
		for (const batch of chunk(games, 300)) {
			const values2: string[] = [];
			const params2: unknown[] = [];
			batch.forEach((g, i) => {
				const base = i * 16;
				values2.push(
					`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14}, $${base + 15}, $${base + 16})`
				);
				const lbOnly = g.sources.length === 1 && g.sources[0] === "LaunchBox";
				const rating = g.rating != null ? (lbOnly ? g.rating * 2 : g.rating) : null;
				params2.push(
					consoleId,
					g.nb_source_id,
					g.title,
					g.aka_titles,
					g.description,
					g.release_year,
					g.genres,
					g.gameplay,
					g.perspective,
					g.visual,
					g.setting,
					rating,
					g.rating_votes,
					g.developers,
					g.publishers,
					g.source_url
				);
			});

			const insertSql = `
				INSERT INTO ref_game (
					id_console, nb_source_id, ll_title, ll_aka_titles, ll_description, nb_release_year,
					ll_genres, ll_gameplay, ll_perspective, ll_visual, ll_setting,
					nb_rating, nb_rating_votes, ll_developers, ll_publishers, ll_source_url
				) VALUES ${values2.join(",")}
				RETURNING id, nb_source_id
			`;
			const res = await client.query(insertSql, params2);
			for (const row of res.rows) {
				gameIdByKey.set(String(row.nb_source_id), row.id);
			}
		}

		// ---- Jaquettes, par lots ----
		const coverRows: { gameId: string; type: string; region: string; url: string }[] = [];
		for (const g of games) {
			const gameId = gameIdByKey.get(String(g.nb_source_id));
			if (!gameId) continue;
			for (const c of g.covers) {
				coverRows.push({ gameId, type: c.type, region: c.region, url: c.url });
			}
		}

		let coverCount = 0;
		for (const batch of chunk(coverRows, 500)) {
			const values: string[] = [];
			const params: unknown[] = [];
			batch.forEach((c, i) => {
				const base = i * 4;
				values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`);
				params.push(c.gameId, c.type, c.region, c.url);
			});
			await client.query(
				`INSERT INTO ref_cover (id_game, ll_cover_type, ll_region, ll_image_url)
				 VALUES ${values.join(",")}
				 ON CONFLICT (id_game, ll_cover_type, ll_region) DO NOTHING`,
				params
			);
			coverCount += batch.length;
		}

		console.log(`${spec.name}: ${games.length} jeux, ${coverCount} jaquettes`);
		grandTotalGames += games.length;
		grandTotalCovers += coverCount;
	}

	console.log(`\nTOTAL : ${grandTotalGames} jeux, ${grandTotalCovers} jaquettes sur ${CONSOLES.length} consoles`);

	await client.end();
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
