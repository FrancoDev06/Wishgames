// Import des 6 plateformes absentes du catalogue LaunchBox (Wii, Wii U, Game Boy, Game Gear, Neo Geo,
// SuperGrafx), scrapées depuis MobyGames dans un projet séparé (retro_collection/scraper). Même
// structure que import-launchbox.ts (transaction par plateforme, upsert idempotent) mais format
// source différent : une fiche par jeu (game-details/<mobyId>.json) sans jaquette par région ni
// rendu 3D — une seule jaquette FRONT par jeu, région inconnue (NULL).
// Usage : bun run scripts/import-moby-platforms.ts   (exécuté depuis apps/backend, .env chargé automatiquement par Bun)

import { Pool } from "pg";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join, extname, dirname } from "path";

const MOBY_ROOT = process.env.MOBY_SCRAPER_ROOT ?? "C:/Users/franc/Desktop/retro_collection/scraper/data";
const PLATFORM_GAMES_DIR = join(MOBY_ROOT, "platform-games");
const GAME_DETAILS_DIR = join(MOBY_ROOT, "game-details");
const PUBLIC_COVERS_DIR = join(import.meta.dir, "..", "public", "covers");

interface MobyPlatform {
	slug: string; // fichier platform-games/<slug>.json
	consoleSlug: string; // slug ref_console cible (nouveau, absent du catalogue LaunchBox)
	consoleName: string;
}

// Les 6 plateformes MobyGames absentes du catalogue LaunchBox actuel (§ comparatif catalogue).
const PLATFORMS: MobyPlatform[] = [
	{ slug: "wii", consoleSlug: "nintendo-wii", consoleName: "Nintendo Wii" },
	{ slug: "wii-u", consoleSlug: "nintendo-wii-u", consoleName: "Nintendo Wii U" },
	{ slug: "gameboy", consoleSlug: "nintendo-game-boy", consoleName: "Nintendo Game Boy" },
	{ slug: "game-gear", consoleSlug: "sega-game-gear", consoleName: "Sega Game Gear" },
	{ slug: "neo-geo", consoleSlug: "snk-neo-geo", consoleName: "SNK Neo Geo" },
	{ slug: "supergrafx", consoleSlug: "nec-supergrafx", consoleName: "NEC SuperGrafx" },
];

interface MobyListItem {
	mobyId: number;
	title: string;
	url?: string | null;
	year: number | null;
	coverUrl: string | null;
}

interface MobyDetail {
	title: string;
	year?: number | null;
	overview?: string | null;
	description?: string | null;
	url?: string | null;
	coverUrl?: string | null;
	developers?: string[];
	publishers?: string[];
	genres?: {
		genre?: string[];
		gameplay?: string[];
		perspective?: string[];
		visual?: string[];
		setting?: string[];
	};
	scores?: {
		mobyScore?: number | null;
		playersCount?: number | null;
	};
}

async function downloadCover(url: string, destPath: string): Promise<boolean> {
	try {
		const res = await fetch(url);
		if (!res.ok) return false;
		const buf = Buffer.from(await res.arrayBuffer());
		mkdirSync(dirname(destPath), { recursive: true });
		writeFileSync(destPath, buf);
		return true;
	} catch {
		return false;
	}
}

async function main() {
	const pool = new Pool({
		host: process.env.DB_HOST,
		port: Number(process.env.DB_PORT ?? 5432),
		database: process.env.DB_NAME,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
	});

	const only = process.env.MOBY_ONLY;

	const sortClient = await pool.connect();
	const sortResult = await sortClient.query<{ max: number }>(`SELECT COALESCE(MAX(nb_sort_order), -1) AS max FROM ref_console`);
	let nextSortOrder = Number(sortResult.rows[0].max) + 1;
	sortClient.release();

	let totalGames = 0;
	let totalCovers = 0;
	let missingDetail = 0;
	let missingCoverDownload = 0;

	for (const platform of PLATFORMS) {
		if (only && only !== platform.slug) continue;

		const list: MobyListItem[] = JSON.parse(readFileSync(join(PLATFORM_GAMES_DIR, `${platform.slug}.json`), "utf-8"));
		console.log(`${platform.consoleName} — ${list.length} jeux listés`);

		const client = await pool.connect();
		try {
			await client.query("BEGIN");

			const consoleResult = await client.query<{ id: string }>(
				`INSERT INTO ref_console (ll_slug, ll_name, ll_source_file, ll_platform_names, nb_sort_order)
				 VALUES ($1, $2, $3, $4, $5)
				 ON CONFLICT (ll_slug) DO UPDATE SET ll_name = EXCLUDED.ll_name, ll_source_file = EXCLUDED.ll_source_file, ll_platform_names = EXCLUDED.ll_platform_names
				 RETURNING id`,
				[platform.consoleSlug, platform.consoleName, `${platform.slug}.json`, [platform.consoleName], nextSortOrder++]
			);
			const idConsole = consoleResult.rows[0].id;

			for (const item of list) {
				let detail: MobyDetail | null = null;
				const detailPath = join(GAME_DETAILS_DIR, `${item.mobyId}.json`);
				if (existsSync(detailPath)) {
					detail = JSON.parse(readFileSync(detailPath, "utf-8"));
				} else {
					missingDetail++;
				}

				const genres = detail?.genres ?? {};
				const mobyScore = detail?.scores?.mobyScore;
				// MobyGames note sur 10, nb_rating est documenté et affiché en /5 (community_rating LaunchBox) —
				// diviser par 2 pour rester cohérent avec l'affichage existant (game-detail-modal.html).
				const rating = typeof mobyScore === "number" ? Math.round((mobyScore / 2) * 100) / 100 : null;

				const gameResult = await client.query<{ id: string }>(
					`INSERT INTO ref_game (
						id_console, nb_source_id, ll_title, ll_description, nb_release_year,
						ll_genres, ll_gameplay, ll_perspective, ll_visual, ll_setting,
						nb_rating, nb_rating_votes, ll_developers, ll_publishers, ll_source_url
					 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
					 ON CONFLICT (id_console, nb_source_id) DO UPDATE SET
						ll_title = EXCLUDED.ll_title, ll_description = EXCLUDED.ll_description,
						nb_release_year = EXCLUDED.nb_release_year, ll_genres = EXCLUDED.ll_genres,
						ll_gameplay = EXCLUDED.ll_gameplay, ll_perspective = EXCLUDED.ll_perspective,
						ll_visual = EXCLUDED.ll_visual, ll_setting = EXCLUDED.ll_setting,
						nb_rating = EXCLUDED.nb_rating, nb_rating_votes = EXCLUDED.nb_rating_votes,
						ll_developers = EXCLUDED.ll_developers, ll_publishers = EXCLUDED.ll_publishers,
						ll_source_url = EXCLUDED.ll_source_url
					 RETURNING id`,
					[
						idConsole,
						item.mobyId,
						detail?.title ?? item.title,
						detail?.overview ?? detail?.description ?? null,
						detail?.year ?? item.year ?? null,
						genres.genre ?? [],
						genres.gameplay ?? [],
						genres.perspective ?? [],
						genres.visual ?? [],
						genres.setting ?? [],
						rating,
						detail?.scores?.playersCount ?? null,
						detail?.developers ?? [],
						detail?.publishers ?? [],
						detail?.url ?? item.url ?? null,
					]
				);
				const idGame = gameResult.rows[0].id;
				totalGames++;

				await client.query(`DELETE FROM ref_cover WHERE id_game = $1`, [idGame]);

				const coverUrl = detail?.coverUrl ?? item.coverUrl;
				if (coverUrl) {
					let ext = ".jpg";
					try {
						ext = extname(new URL(coverUrl).pathname) || ".jpg";
					} catch {
						/* URL invalide, garde .jpg par defaut */
					}
					const destRelPath = `${platform.consoleSlug}/${item.mobyId}/front-unknown${ext}`;
					const destPath = join(PUBLIC_COVERS_DIR, destRelPath);

					const alreadyOnDisk = existsSync(destPath);
					const ok = alreadyOnDisk || (await downloadCover(coverUrl, destPath));
					if (ok) {
						await client.query(
							`INSERT INTO ref_cover (id_game, ll_cover_type, ll_region, ll_image_url) VALUES ($1, 'FRONT', NULL, $2)`,
							[idGame, `/covers/${destRelPath.replace(/\\/g, "/")}`]
						);
						totalCovers++;
					} else {
						missingCoverDownload++;
					}
				}
			}

			await client.query("COMMIT");
		} catch (error) {
			await client.query("ROLLBACK");
			console.error(`Echec sur ${platform.slug} :`, error);
			throw error;
		} finally {
			client.release();
		}
	}

	console.log(
		`Termine. jeux=${totalGames} jaquettes=${totalCovers} details-manquants=${missingDetail} covers-echouees=${missingCoverDownload}`
	);
	await pool.end();
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
