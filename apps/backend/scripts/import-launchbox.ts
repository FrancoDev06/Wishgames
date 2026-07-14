// Import ponctuel des données scrapées LaunchBox Games DB vers collect_play_db (§2 du cahier des charges).
// Usage : bun run scripts/import-launchbox.ts   (exécuté depuis apps/backend, .env chargé automatiquement par Bun)

import { Pool } from "pg";
import { readdirSync, readFileSync, mkdirSync, copyFileSync, existsSync } from "fs";
import { join, extname, dirname } from "path";

const SCRAPER_ROOT = process.env.LAUNCHBOX_SCRAPER_ROOT ?? "C:/Users/franc/Desktop/scrapper_launchbox";
const OUTPUT_DIR = join(SCRAPER_ROOT, "output");
const PUBLIC_COVERS_DIR = join(import.meta.dir, "..", "public", "covers");

// Priorité de médias LaunchBox par type de jaquette cible (§2bis). Pas d'équivalent LaunchBox pour MANUAL_FRONT/MANUAL_BACK — non importés.
const COVER_TYPE_SOURCES: Record<string, string[]> = {
	FRONT: ["Box - Front", "Box - Front - Reconstructed"],
	BACK: ["Box - Back", "Box - Back - Reconstructed"],
	SPINE: ["Box - Spine"],
	MEDIA: ["Disc", "Cart - Front"],
};

// Ordre de priorité région (§2bis : PAL/Europe → USA → Japon), repli sur la première image disponible sinon.
const REGION_PRIORITY = ["Europe", "North America", "Japan"];

interface LbMediaItem {
	url: string;
	filename: string;
	region: string | null;
	local_path: string;
}

interface LbGame {
	id: string;
	title: string;
	url: string;
	release_date: string | null;
	overview: string | null;
	developers: string[];
	publishers: string[];
	genres: string[];
	alternate_names: string[];
	community_rating: number | null;
	total_votes: number | null;
	media: Record<string, LbMediaItem[]>;
}

interface LbFile {
	platform: string;
	platform_slug: string;
	total_games: number;
	games: LbGame[];
}

// Retourne une image par région prioritaire disponible (Europe/USA/Japon, §2bis) au lieu d'une
// seule — permet de suivre en collection plusieurs éditions régionales du même jeu séparément.
// Repli sur la première image disponible seulement si aucune des 3 régions cibles n'existe.
function pickCovers(game: LbGame, targetType: string): { item: LbMediaItem; sourceKey: string }[] {
	for (const sourceKey of COVER_TYPE_SOURCES[targetType]) {
		const items = game.media[sourceKey];
		if (!items || items.length === 0) continue;

		const picks: { item: LbMediaItem; sourceKey: string }[] = [];
		for (const region of REGION_PRIORITY) {
			const match = items.find((i) => i.region === region);
			if (match) picks.push({ item: match, sourceKey });
		}
		if (picks.length > 0) return picks;
		return [{ item: items[0], sourceKey }];
	}
	return [];
}

function releaseYear(releaseDate: string | null): number | null {
	if (!releaseDate) return null;
	const year = parseInt(releaseDate.slice(0, 4), 10);
	return Number.isNaN(year) ? null : year;
}

async function main() {
	const pool = new Pool({
		host: process.env.DB_HOST,
		port: Number(process.env.DB_PORT ?? 5432),
		database: process.env.DB_NAME,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
	});

	const only = process.env.LAUNCHBOX_ONLY;
	const files = readdirSync(OUTPUT_DIR).filter((f) => f.endsWith(".json") && (!only || f === `${only}.json`));
	console.log(`${files.length} fichiers console trouvés dans ${OUTPUT_DIR}`);

	let totalGames = 0;
	let totalCovers = 0;
	let missingCoverFiles = 0;

	for (const [index, file] of files.entries()) {
		const data: LbFile = JSON.parse(readFileSync(join(OUTPUT_DIR, file), "utf-8"));
		const client = await pool.connect();

		try {
			await client.query("BEGIN");

			const consoleResult = await client.query<{ id: string }>(
				`INSERT INTO ref_console (ll_slug, ll_name, ll_source_file, ll_platform_names, nb_sort_order)
				 VALUES ($1, $2, $3, $4, $5)
				 ON CONFLICT (ll_slug) DO UPDATE SET ll_name = EXCLUDED.ll_name, ll_source_file = EXCLUDED.ll_source_file, ll_platform_names = EXCLUDED.ll_platform_names
				 RETURNING id`,
				[data.platform_slug, data.platform, file, [data.platform], index]
			);
			const idConsole = consoleResult.rows[0].id;

			console.log(`[${index + 1}/${files.length}] ${data.platform} — ${data.games.length} jeux`);

			for (const game of data.games) {
				const gameResult = await client.query<{ id: string }>(
					`INSERT INTO ref_game (
						id_console, nb_source_id, ll_title, ll_aka_titles, ll_description, nb_release_year,
						ll_genres, nb_rating, nb_rating_votes, ll_developers, ll_publishers, ll_source_url
					 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
					 ON CONFLICT (id_console, nb_source_id) DO UPDATE SET
						ll_title = EXCLUDED.ll_title, ll_aka_titles = EXCLUDED.ll_aka_titles, ll_description = EXCLUDED.ll_description,
						nb_release_year = EXCLUDED.nb_release_year, ll_genres = EXCLUDED.ll_genres, nb_rating = EXCLUDED.nb_rating,
						nb_rating_votes = EXCLUDED.nb_rating_votes, ll_developers = EXCLUDED.ll_developers,
						ll_publishers = EXCLUDED.ll_publishers, ll_source_url = EXCLUDED.ll_source_url
					 RETURNING id`,
					[
						idConsole,
						parseInt(game.id, 10),
						game.title,
						game.alternate_names ?? [],
						game.overview ?? null,
						releaseYear(game.release_date),
						game.genres ?? [],
						game.community_rating ?? null,
						game.total_votes ?? null,
						game.developers ?? [],
						game.publishers ?? [],
						game.url ?? null,
					]
				);
				const idGame = gameResult.rows[0].id;
				totalGames++;

				await client.query(`DELETE FROM ref_cover WHERE id_game = $1`, [idGame]);

				for (const targetType of Object.keys(COVER_TYPE_SOURCES)) {
					for (const picked of pickCovers(game, targetType)) {
						const srcPath = join(SCRAPER_ROOT, picked.item.local_path.replace(/\\/g, "/"));
						if (!existsSync(srcPath)) {
							missingCoverFiles++;
							continue;
						}

						const regionSlug = (picked.item.region ?? "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-");
						const ext = extname(picked.item.filename) || extname(srcPath);
						const destRelPath = `${data.platform_slug}/${game.id}/${targetType.toLowerCase()}-${regionSlug}${ext}`;
						const destPath = join(PUBLIC_COVERS_DIR, destRelPath);

						mkdirSync(dirname(destPath), { recursive: true });
						copyFileSync(srcPath, destPath);

						await client.query(
							`INSERT INTO ref_cover (id_game, ll_cover_type, ll_region, ll_image_url)
							 VALUES ($1, $2, $3, $4)`,
							[idGame, targetType, picked.item.region ?? null, `/covers/${destRelPath.replace(/\\/g, "/")}`]
						);
						totalCovers++;
					}
				}
			}

			await client.query("COMMIT");
		} catch (error) {
			await client.query("ROLLBACK");
			console.error(`Echec sur ${file} :`, error);
			throw error;
		} finally {
			client.release();
		}
	}

	console.log(`Termine. jeux=${totalGames} jaquettes=${totalCovers} fichiers-manquants=${missingCoverFiles}`);
	await pool.end();
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
