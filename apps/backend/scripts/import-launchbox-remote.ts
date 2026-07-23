// Import ponctuel des données scrapées LaunchBox Games DB vers collect_play_db (§2 du cahier des charges),
// variante "hotlink" : les jaquettes ne sont PAS copiées localement (dossier `images` source absent/trop
// lourd à transférer sur cette machine) — on stocke directement l'URL distante LaunchBox (images.launchbox-app.com)
// dans ref_cover.ll_image_url. Le frontend distingue une URL absolue (http...) d'un chemin local `/covers/...`
// et ne préfixe pas l'origine API dans ce cas (voir core/utils/cover-url.util.ts).
// Usage : bun run scripts/import-launchbox-remote.ts   (exécuté depuis apps/backend, .env chargé automatiquement par Bun)

import { Pool } from "pg";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const SCRAPER_ROOT = process.env.LAUNCHBOX_SCRAPER_ROOT ?? "C:/Users/FrancoisPG/Desktop/Test";
const OUTPUT_DIR = join(SCRAPER_ROOT, "output");

// Priorité de médias LaunchBox par type de jaquette cible (§2bis). Pas d'équivalent LaunchBox pour MANUAL_FRONT/MANUAL_BACK — non importés.
const COVER_TYPE_SOURCES: Record<string, string[]> = {
	FRONT: ["Box - Front", "Box - Front - Reconstructed"],
	BACK: ["Box - Back", "Box - Back - Reconstructed"],
	SPINE: ["Box - Spine"],
	MEDIA: ["Disc", "Cart - Front"],
	BOX_3D: ["Box - 3D"],
};

interface LbMediaItem {
	url: string;
	filename: string;
	region: string | null;
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

interface Edition {
	region: string | null;
	front: LbMediaItem | null;
}

// Une édition = une région distincte trouvée sur la jaquette FRONT (toutes régions LaunchBox
// confondues — voir import-launchbox.ts pour le détail, même logique ici en variante hotlink).
function frontEditions(game: LbGame): Edition[] {
	const bySourceRegion = new Map<string, LbMediaItem>();
	let anyItem: LbMediaItem | null = null;

	for (const sourceKey of COVER_TYPE_SOURCES.FRONT) {
		const items = game.media[sourceKey];
		if (!items || items.length === 0) continue;
		if (!anyItem) anyItem = items.find((i) => !i.region) ?? items[0];
		for (const item of items) {
			if (item.region && !bySourceRegion.has(item.region)) bySourceRegion.set(item.region, item);
		}
	}

	if (bySourceRegion.size > 0) {
		return [...bySourceRegion.entries()].map(([region, front]) => ({ region, front }));
	}
	return [{ region: null, front: anyItem }];
}

// Jaquette d'un autre type (BACK/SPINE/MEDIA/BOX_3D) pour l'édition/région précise donnée —
// correspondance exacte sur la région, sinon rien plutôt que le mauvais visuel.
function pickForRegion(game: LbGame, targetType: string, region: string | null): LbMediaItem | null {
	for (const sourceKey of COVER_TYPE_SOURCES[targetType]) {
		const items = game.media[sourceKey];
		if (!items || items.length === 0) continue;
		if (region === null) return items.find((i) => !i.region) ?? items[0];
		const match = items.find((i) => i.region === region);
		if (match) return match;
	}
	return null;
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
		// Supabase (et la plupart des hébergeurs Postgres cloud) exigent SSL — même pilotage que DatabaseUtil.
		ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
	});

	const only = process.env.LAUNCHBOX_ONLY;
	const files = readdirSync(OUTPUT_DIR).filter((f) => f.endsWith(".json") && (!only || f === `${only}.json`));
	console.log(`${files.length} fichiers console trouvés dans ${OUTPUT_DIR}`);

	let totalGames = 0;
	let totalCovers = 0;

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

				const insertCover = async (targetType: string, region: string | null, item: LbMediaItem) => {
					await client.query(
						`INSERT INTO ref_cover (id_game, ll_cover_type, ll_region, ll_image_url)
						 VALUES ($1, $2, $3, $4)`,
						[idGame, targetType, region, item.url]
					);
					totalCovers++;
				};

				for (const edition of frontEditions(game)) {
					if (edition.front) await insertCover("FRONT", edition.region, edition.front);
					for (const targetType of ["BACK", "SPINE", "MEDIA", "BOX_3D"]) {
						const picked = pickForRegion(game, targetType, edition.region);
						if (picked) await insertCover(targetType, edition.region, picked);
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

	console.log(`Termine. jeux=${totalGames} jaquettes=${totalCovers} (hotlink LaunchBox CDN, pas de copie locale)`);
	await pool.end();
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
