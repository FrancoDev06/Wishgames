// Complète le catalogue avec les éditions régionales PriceCharting (source séparée, distincte de
// MobyGames/LaunchBox) : contrairement aux deux autres sources, ces fichiers CSV sont scindés par
// édition — un fichier par (plateforme, région) : ex. nes.csv (USA), pal-nes.csv (Europe),
// jp-nintendo-64.csv (Japon). C'est la seule source disponible sur cette machine qui distingue
// vraiment les régions jeu par jeu (MobyGames et le scraper LaunchBox n'ont pas cette granularité
// pour la plupart des jeux importés jusqu'ici).
// Deux actions possibles par ligne CSV, jamais de modification des jeux déjà en base :
//   - le jeu existe déjà au catalogue (titre identique ou très proche) mais pas dans cette région
//     -> on ajoute juste une jaquette FRONT régionale (ref_cover), la fiche jeu n'est pas touchée.
//   - le jeu n'existe dans aucune région du catalogue -> nouvelle fiche ref_game (source_id négatif
//     pour ne jamais entrer en collision avec les ids LaunchBox/MobyGames, positifs) + une jaquette
//     par région où il apparaît.
// Les jaquettes sont hotlinkées (URL storage.googleapis.com telle quelle, pas de copie locale) —
// même principe que import-launchbox-remote.ts, le frontend distingue déjà une URL absolue d'un
// chemin local (core/utils/cover-url.util.ts).
//
// Mode rapport par défaut (aucune écriture) : bun run scripts/import-pricecharting-regions.ts
// Application réelle en base : PC_APPLY=1 bun run scripts/import-pricecharting-regions.ts
// Restreindre à une console (debug) : PC_ONLY=nintendo-entertainment-system bun run ...

import { Pool, type PoolClient } from "pg";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const CSV_ROOT = process.env.PRICECHARTING_CSV_ROOT ?? "C:/Users/franc/Desktop/wishlist_retro/csv";
const REPORT_PATH = join(import.meta.dir, "pricecharting-import-report.csv");
const APPLY = process.env.PC_APPLY === "1";
const ONLY = process.env.PC_ONLY;

const FUZZY_MATCH_THRESHOLD = 0.85; // même seuil que suggest-moby-catalog-matches.ts (bande "déjà présent")

// Colonnes CSV qui ne sont pas des jeux (matériel, accessoires, démos non commerciales) — exclues.
const GENRE_BLOCKLIST = new Set(["Accessories", "Controllers", "Systems", "Demo & NFR"]);

// PriceCharting référence aussi les sorties homebrew / rééditions modernes sur matériel ancien
// (ex. NES 2019-2024 chez Retro-Bit/RetroUSB) — hors périmètre "collection rétro d'origine" de ce
// catalogue (décision utilisateur). Année de fin de vie commerciale approximative par console,
// avec une marge de quelques années pour les sorties tardives légitimes (surtout Japon) ; toute
// ligne datée au-delà est exclue. Les lignes sans date connue sont conservées (le risque de perdre
// un vrai jeu ancien mal daté est plus grand que celui de laisser passer un homebrew non daté, rare
// dans ce jeu de données où les fiches homebrew sont presque toujours bien datées).
const YEAR_CUTOFF: Record<string, number> = {
	"nintendo-entertainment-system": 1996,
	"nintendo-famicom-disk-system": 1995,
	"super-nintendo-entertainment-system": 2000,
	"nintendo-64": 2002,
	"nintendo-gamecube": 2007,
	"nintendo-wii": 2013,
	"nintendo-wii-u": 2017,
	"sega-master-system": 1996,
	"sega-genesis": 1997,
	"sega-cd": 1996,
	"sega-32x": 1996,
	"sega-saturn": 2000,
	"sega-dreamcast": 2008,
	"sega-game-gear": 1997,
	"sony-playstation": 2006,
	"sony-playstation-2": 2013,
	"sony-playstation-3": 2017,
	// sony-playstation-4 : toujours en production, pas de coupure pertinente.
	"nec-turbografx-16": 1995,
	"nec-turbografx-cd": 1999,
	"snk-neo-geo": 2004,
};

interface CsvSource {
	csvSlug: string;
	region: "North America" | "Europe" | "Japan";
}

// Un fichier CSV par (plateforme, édition) chez PriceCharting -> mappé sur la console ref_console
// existante + la région qu'il représente. Seules les consoles déjà au catalogue sont couvertes ici ;
// Game Boy et SuperGrafx n'ont pas d'équivalent dans ce jeu de CSV (aucun fichier gameboy*/supergrafx*
// présent), donc rien à en tirer pour ces deux-là. "famicom.csv" (cartouches Famicom, hors Disk
// System) est volontairement ignoré : pas de console dédiée en base et fusionner avec NES risquerait
// de mélanger des jeux qui ne sont pas strictement identiques au portage NES.
const CONSOLE_SOURCES: Record<string, CsvSource[]> = {
	"nintendo-entertainment-system": [
		{ csvSlug: "nes", region: "North America" },
		{ csvSlug: "pal-nes", region: "Europe" },
	],
	"nintendo-famicom-disk-system": [{ csvSlug: "famicom-disk-system", region: "Japan" }],
	"super-nintendo-entertainment-system": [
		{ csvSlug: "super-nintendo", region: "North America" },
		{ csvSlug: "pal-super-nintendo", region: "Europe" },
		{ csvSlug: "super-famicom", region: "Japan" },
	],
	"nintendo-64": [
		{ csvSlug: "nintendo-64", region: "North America" },
		{ csvSlug: "pal-nintendo-64", region: "Europe" },
		{ csvSlug: "jp-nintendo-64", region: "Japan" },
	],
	"nintendo-gamecube": [
		{ csvSlug: "gamecube", region: "North America" },
		{ csvSlug: "pal-gamecube", region: "Europe" },
	],
	"nintendo-wii": [{ csvSlug: "pal-wii", region: "Europe" }],
	"nintendo-wii-u": [{ csvSlug: "pal-wii-u", region: "Europe" }],
	"sega-master-system": [
		{ csvSlug: "sega-master-system", region: "North America" },
		{ csvSlug: "pal-sega-master-system", region: "Europe" },
	],
	"sega-genesis": [
		{ csvSlug: "sega-genesis", region: "North America" },
		{ csvSlug: "pal-sega-mega-drive", region: "Europe" },
		{ csvSlug: "jp-sega-mega-drive", region: "Japan" },
	],
	"sega-cd": [
		{ csvSlug: "sega-cd", region: "North America" },
		{ csvSlug: "pal-sega-mega-cd", region: "Europe" },
	],
	"sega-32x": [
		{ csvSlug: "sega-32x", region: "North America" },
		{ csvSlug: "pal-mega-drive-32x", region: "Europe" },
		{ csvSlug: "jp-super-32x", region: "Japan" },
	],
	"sega-saturn": [
		{ csvSlug: "sega-saturn", region: "North America" },
		{ csvSlug: "pal-sega-saturn", region: "Europe" },
		{ csvSlug: "jp-sega-saturn", region: "Japan" },
	],
	"sega-dreamcast": [
		{ csvSlug: "sega-dreamcast", region: "North America" },
		{ csvSlug: "pal-sega-dreamcast", region: "Europe" },
		{ csvSlug: "jp-sega-dreamcast", region: "Japan" },
	],
	"sega-game-gear": [
		{ csvSlug: "pal-sega-game-gear", region: "Europe" },
		{ csvSlug: "jp-sega-game-gear", region: "Japan" },
	],
	"sony-playstation": [
		{ csvSlug: "playstation", region: "North America" },
		{ csvSlug: "pal-playstation", region: "Europe" },
	],
	"sony-playstation-2": [
		{ csvSlug: "playstation-2", region: "North America" },
		{ csvSlug: "pal-playstation-2", region: "Europe" },
	],
	"sony-playstation-3": [
		{ csvSlug: "playstation-3", region: "North America" },
		{ csvSlug: "pal-playstation-3", region: "Europe" },
	],
	"sony-playstation-4": [
		{ csvSlug: "playstation-4", region: "North America" },
		{ csvSlug: "pal-playstation-4", region: "Europe" },
	],
	"nec-turbografx-16": [{ csvSlug: "jp-pc-engine", region: "Japan" }],
	"nec-turbografx-cd": [{ csvSlug: "jp-pc-engine-cd", region: "Japan" }],
	"snk-neo-geo": [
		{ csvSlug: "neo-geo-aes", region: "North America" },
		{ csvSlug: "neo-geo-cd", region: "North America" },
		{ csvSlug: "neo-geo-mvs", region: "North America" },
		{ csvSlug: "jp-neo-geo-aes", region: "Japan" },
		{ csvSlug: "jp-neo-geo-cd", region: "Japan" },
		{ csvSlug: "jp-neo-geo-mvs", region: "Japan" },
	],
};

interface CsvRow {
	console: string;
	title: string;
	url: string;
	genre: string;
	release_date: string;
	publisher: string;
	developer: string;
	pricecharting_id: string;
	description: string;
	image_cover: string;
}

function parseCsv(content: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = "";
	let inQuotes = false;
	const text = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (inQuotes) {
			if (c === '"') {
				if (text[i + 1] === '"') {
					field += '"';
					i++;
				} else inQuotes = false;
			} else field += c;
			continue;
		}
		if (c === '"') inQuotes = true;
		else if (c === ",") {
			row.push(field);
			field = "";
		} else if (c === "\r") continue;
		else if (c === "\n") {
			row.push(field);
			rows.push(row);
			row = [];
			field = "";
		} else field += c;
	}
	if (field.length > 0 || row.length > 0) {
		row.push(field);
		rows.push(row);
	}
	return rows;
}

function readCsvRows(csvSlug: string): CsvRow[] {
	const content = readFileSync(join(CSV_ROOT, `${csvSlug}.csv`), "utf-8");
	const table = parseCsv(content);
	const header = table[0];
	const idx = (name: string) => header.indexOf(name);
	const cols = {
		console: idx("console"),
		title: idx("title"),
		url: idx("url"),
		genre: idx("genre"),
		release_date: idx("release_date"),
		publisher: idx("publisher"),
		developer: idx("developer"),
		pricecharting_id: idx("pricecharting_id"),
		description: idx("description"),
		image_cover: idx("image_cover"),
	};
	const rows: CsvRow[] = [];
	for (let i = 1; i < table.length; i++) {
		const r = table[i];
		if (r.length < 2) continue;
		rows.push({
			console: r[cols.console] ?? "",
			title: r[cols.title] ?? "",
			url: r[cols.url] ?? "",
			genre: r[cols.genre] ?? "",
			release_date: r[cols.release_date] ?? "",
			publisher: r[cols.publisher] ?? "",
			developer: r[cols.developer] ?? "",
			pricecharting_id: r[cols.pricecharting_id] ?? "",
			description: r[cols.description] ?? "",
			image_cover: r[cols.image_cover] ?? "",
		});
	}
	return rows;
}

// Suffixes entre crochets qui ne désignent pas une variante de SKU du même jeu (ex. "[Greatest
// Hits]", "[Steelbook Edition]" — legitimes, juste une autre édition du même jeu, gérées par le
// dédoublonnage sur le titre nettoyé) mais un exemplaire non commercialisé au grand public : copies
// promo/presse, démos, reproductions non officielles. Toute la ligne est exclue, pas seulement le tag.
const NON_GAME_BRACKET = /not for resale|press kit|^promo\b|promo only|trade demo|^demo\b|demo disc|demo cd|homebrew|reproduction|kiosk/i;

// Le titre PriceCharting est suffixé par le libellé de plateforme collé sans espace (ex. "1942NES",
// "1942PAL NES") — le libellé exact est redonné par la colonne "console" de la même ligne.
function cleanTitle(row: CsvRow): string | null {
	let title = row.title.trim();
	if (row.console && title.endsWith(row.console)) {
		title = title.slice(0, title.length - row.console.length).trim();
	}
	const bracketMatch = title.match(/\[([^\]]*)\]\s*$/);
	if (bracketMatch && NON_GAME_BRACKET.test(bracketMatch[1])) return null;
	title = title.replace(/\s*\[[^\]]*\]\s*$/, "").trim(); // variantes de SKU, ex. "[5 Screw]"
	return title.length > 0 ? title : null;
}

function cleanField(value: string): string | null {
	const v = value.trim();
	return v.length > 0 && v.toLowerCase() !== "none" ? v : null;
}

function parseYear(releaseDate: string): number | null {
	const m = releaseDate.match(/\b(19\d{2}|20\d{2})\b/);
	return m ? parseInt(m[1], 10) : null;
}

function normalize(title: string): string {
	return title
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[™®©]/g, "")
		.replace(/[^a-z0-9]+/g, " ")
		.replace(/^(the|a|an) /, "")
		.trim()
		.replace(/\s+/g, " ");
}

function levenshtein(a: string, b: string): number {
	const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
	for (let i = 0; i <= a.length; i++) dp[i][0] = i;
	for (let j = 0; j <= b.length; j++) dp[0][j] = j;
	for (let i = 1; i <= a.length; i++) {
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
		}
	}
	return dp[a.length][b.length];
}

function similarity(a: string, b: string): number {
	const maxLen = Math.max(a.length, b.length);
	if (maxLen === 0) return 1;
	return 1 - levenshtein(a, b) / maxLen;
}

const NUMERAL_TOKEN = /^(\d+|i|ii|iii|iv|v|vi|vii|viii|ix|x)$/;

// Un score de similarité textuelle élevé ne suffit pas à garantir qu'il s'agit du même jeu : des
// suites numérotées ("Double Dragon II" / "Double Dragon III") ne diffèrent que d'un chiffre/chiffre
// romain et obtiennent un score >0.9 alors que ce sont deux jeux distincts. On extrait les jetons
// numériques du titre normalisé et on exige un ensemble identique des deux côtés avant d'accepter
// un rapprochement flou.
function numeralTokens(normalizedTitle: string): string[] {
	return normalizedTitle
		.split(" ")
		.filter((t) => NUMERAL_TOKEN.test(t))
		.sort();
}

function sameNumerals(a: string, b: string): boolean {
	const ta = numeralTokens(a);
	const tb = numeralTokens(b);
	return ta.length === tb.length && ta.every((v, i) => v === tb[i]);
}

interface CatalogGame {
	id: string;
	nbSourceId: number;
	title: string;
	regions: Set<string>;
}

interface PendingGame {
	pricechartingId: number;
	title: string;
	description: string | null;
	year: number | null;
	genre: string | null;
	developer: string | null;
	publisher: string | null;
	url: string | null;
	regions: Map<string, { imageUrl: string }>;
}

interface ReportRow {
	consoleSlug: string;
	region: string;
	action: string; // ADD_COVER_EXACT | ADD_COVER_FUZZY | NEW_GAME | NEW_GAME_MERGED_REGION
	title: string;
	matchedTitle: string;
	score: string;
}

async function processConsole(client: PoolClient, consoleSlug: string, sources: CsvSource[], report: ReportRow[]) {
	const consoleResult = await client.query<{ id: string }>(`SELECT id FROM ref_console WHERE ll_slug = $1`, [consoleSlug]);
	if (consoleResult.rows.length === 0) {
		console.log(`  [!] console ${consoleSlug} introuvable en base, ignorée`);
		return;
	}
	const idConsole = consoleResult.rows[0].id;

	const gamesResult = await client.query<{ id: string; nb_source_id: number; ll_title: string }>(
		`SELECT id, nb_source_id, ll_title FROM ref_game WHERE id_console = $1`,
		[idConsole]
	);
	const coversResult = await client.query<{ id_game: string; ll_region: string | null }>(
		`SELECT c.id_game, c.ll_region FROM ref_cover c JOIN ref_game g ON g.id = c.id_game WHERE g.id_console = $1 AND c.ll_cover_type = 'FRONT'`,
		[idConsole]
	);
	const regionsByGame = new Map<string, Set<string>>();
	for (const row of coversResult.rows) {
		if (!row.ll_region) continue;
		if (!regionsByGame.has(row.id_game)) regionsByGame.set(row.id_game, new Set());
		regionsByGame.get(row.id_game)!.add(row.ll_region);
	}

	const catalog = new Map<string, CatalogGame>();
	const catalogList: { normTitle: string; game: CatalogGame }[] = [];
	for (const row of gamesResult.rows) {
		const norm = normalize(row.ll_title);
		const game: CatalogGame = {
			id: row.id,
			nbSourceId: row.nb_source_id,
			title: row.ll_title,
			regions: regionsByGame.get(row.id) ?? new Set(),
		};
		if (!catalog.has(norm)) {
			catalog.set(norm, game);
			catalogList.push({ normTitle: norm, game });
		}
	}

	const pending = new Map<string, PendingGame>();
	const yearCutoff = YEAR_CUTOFF[consoleSlug];
	let filteredOut = 0;
	let filteredHomebrew = 0;
	let alreadyCovered = 0;
	let coversAdded = 0;
	let coversAddedFuzzy = 0;
	let newGames = 0;

	const addCoverToExisting = (game: CatalogGame, region: string, imageUrl: string, matchedTitle: string, rowTitle: string, fuzzy: boolean, score?: number) => {
		if (game.regions.has(region)) {
			alreadyCovered++;
			return;
		}
		game.regions.add(region);
		if (fuzzy) coversAddedFuzzy++;
		else coversAdded++;
		report.push({
			consoleSlug,
			region,
			action: fuzzy ? "ADD_COVER_FUZZY" : "ADD_COVER_EXACT",
			title: rowTitle,
			matchedTitle,
			score: score !== undefined ? score.toFixed(2) : "1.00",
		});
		if (APPLY) {
			pendingWrites.push({ type: "cover", idGame: game.id, region, imageUrl });
		}
	};

	for (const source of sources) {
		let rows: CsvRow[];
		try {
			rows = readCsvRows(source.csvSlug);
		} catch (error) {
			console.log(`  [!] ${source.csvSlug}.csv introuvable, ignoré (${(error as Error).message})`);
			continue;
		}

		const seenInThisFile = new Set<string>();
		for (const row of rows) {
			if (GENRE_BLOCKLIST.has(row.genre.trim())) {
				filteredOut++;
				continue;
			}
			const title = cleanTitle(row);
			if (!title) {
				filteredOut++;
				continue;
			}
			const norm = normalize(title);
			if (seenInThisFile.has(norm)) continue; // doublon SKU dans le même fichier (variantes cart/label)
			seenInThisFile.add(norm);

			const rowYear = parseYear(row.release_date);
			if (yearCutoff !== undefined && rowYear !== null && rowYear > yearCutoff) {
				filteredHomebrew++;
				continue;
			}

			const imageUrl = row.image_cover.trim();
			if (!imageUrl) {
				filteredOut++;
				continue;
			}

			// 1. correspondance exacte au catalogue existant
			const exact = catalog.get(norm);
			if (exact) {
				addCoverToExisting(exact, source.region, imageUrl, exact.title, title, false);
				continue;
			}

			// 2. déjà en attente de création dans ce run (vu dans un autre fichier région de cette console)
			const pendingExact = pending.get(norm);
			if (pendingExact) {
				if (!pendingExact.regions.has(source.region)) {
					pendingExact.regions.set(source.region, { imageUrl });
					report.push({
						consoleSlug,
						region: source.region,
						action: "NEW_GAME_MERGED_REGION",
						title,
						matchedTitle: pendingExact.title,
						score: "1.00",
					});
				}
				continue;
			}

			// 3. correspondance floue (formulation légèrement différente) au catalogue existant
			let best: { game: CatalogGame; score: number } | null = null;
			for (const { normTitle, game } of catalogList) {
				if (Math.abs(normTitle.length - norm.length) > 8) continue; // élagage grossier, évite O(n^2) inutile
				if (!sameNumerals(norm, normTitle)) continue; // évite "Double Dragon II" ~ "Double Dragon III"
				const score = similarity(norm, normTitle);
				if (!best || score > best.score) best = { game, score };
			}
			if (best && best.score >= FUZZY_MATCH_THRESHOLD) {
				addCoverToExisting(best.game, source.region, imageUrl, best.game.title, title, true, best.score);
				continue;
			}

			// 3bis. correspondance floue contre les jeux déjà mis en attente dans ce run
			let bestPending: { key: string; pending: PendingGame; score: number } | null = null;
			for (const [key, p] of pending) {
				if (Math.abs(key.length - norm.length) > 8) continue;
				if (!sameNumerals(norm, key)) continue;
				const score = similarity(norm, key);
				if (!bestPending || score > bestPending.score) bestPending = { key, pending: p, score };
			}
			if (bestPending && bestPending.score >= FUZZY_MATCH_THRESHOLD) {
				if (!bestPending.pending.regions.has(source.region)) {
					bestPending.pending.regions.set(source.region, { imageUrl });
					report.push({
						consoleSlug,
						region: source.region,
						action: "NEW_GAME_MERGED_REGION",
						title,
						matchedTitle: bestPending.pending.title,
						score: bestPending.score.toFixed(2),
					});
				}
				continue;
			}

			// 4. vraiment absent du catalogue -> nouvelle fiche
			const pcId = parseInt(row.pricecharting_id, 10);
			if (Number.isNaN(pcId)) {
				filteredOut++;
				continue;
			}
			newGames++;
			pending.set(norm, {
				pricechartingId: pcId,
				title,
				description: cleanField(row.description),
				year: parseYear(row.release_date),
				genre: cleanField(row.genre),
				developer: cleanField(row.developer),
				publisher: cleanField(row.publisher),
				url: cleanField(row.url),
				regions: new Map([[source.region, { imageUrl }]]),
			});
			report.push({ consoleSlug, region: source.region, action: "NEW_GAME", title, matchedTitle: "", score: "" });
		}
	}

	if (APPLY) {
		for (const [, p] of pending) {
			pendingWrites.push({ type: "game", idConsole, pending: p });
		}
	}

	console.log(
		`  ${consoleSlug} — filtres=${filteredOut} homebrew_exclu=${filteredHomebrew} deja_couvert=${alreadyCovered} regions_ajoutees(exact)=${coversAdded} regions_ajoutees(flou)=${coversAddedFuzzy} nouveaux_jeux=${newGames}`
	);
}

type PendingWrite =
	| { type: "cover"; idGame: string; region: string; imageUrl: string }
	| { type: "game"; idConsole: string; pending: PendingGame };

const pendingWrites: PendingWrite[] = [];

async function flushWrites(client: PoolClient) {
	let gamesCreated = 0;
	let coversCreated = 0;
	for (const write of pendingWrites) {
		if (write.type === "cover") {
			await client.query(
				`INSERT INTO ref_cover (id_game, ll_cover_type, ll_region, ll_image_url)
				 VALUES ($1, 'FRONT', $2, $3)
				 ON CONFLICT (id_game, ll_cover_type, ll_region) DO NOTHING`,
				[write.idGame, write.region, write.imageUrl]
			);
			coversCreated++;
		} else {
			const p = write.pending;
			const gameResult = await client.query<{ id: string }>(
				`INSERT INTO ref_game (id_console, nb_source_id, ll_title, ll_description, nb_release_year, ll_genres, ll_developers, ll_publishers, ll_source_url)
				 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
				 ON CONFLICT (id_console, nb_source_id) DO UPDATE SET ll_title = EXCLUDED.ll_title
				 RETURNING id`,
				[
					write.idConsole,
					-p.pricechartingId, // négatif : namespace dédié PriceCharting, jamais de collision avec LaunchBox/MobyGames (positifs)
					p.title,
					p.description,
					p.year,
					p.genre ? [p.genre] : [],
					p.developer ? [p.developer] : [],
					p.publisher ? [p.publisher] : [],
					p.url,
				]
			);
			const idGame = gameResult.rows[0].id;
			gamesCreated++;
			for (const [region, { imageUrl }] of p.regions) {
				await client.query(
					`INSERT INTO ref_cover (id_game, ll_cover_type, ll_region, ll_image_url)
					 VALUES ($1, 'FRONT', $2, $3)
					 ON CONFLICT (id_game, ll_cover_type, ll_region) DO NOTHING`,
					[idGame, region, imageUrl]
				);
				coversCreated++;
			}
		}
	}
	console.log(`\nEcriture en base terminee. jeux_crees=${gamesCreated} jaquettes_creees=${coversCreated}`);
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

	console.log(`Mode : ${APPLY ? "APPLICATION REELLE (ecriture en base)" : "RAPPORT (dry-run, aucune ecriture)"}`);
	if (ONLY) console.log(`Restreint a : ${ONLY}`);

	const report: ReportRow[] = [];
	const client = await pool.connect();
	try {
		if (APPLY) await client.query("BEGIN");

		for (const [consoleSlug, sources] of Object.entries(CONSOLE_SOURCES)) {
			if (ONLY && ONLY !== consoleSlug) continue;
			await processConsole(client, consoleSlug, sources, report);
		}

		if (APPLY) {
			await flushWrites(client);
			await client.query("COMMIT");
		}
	} catch (error) {
		if (APPLY) await client.query("ROLLBACK");
		console.error("Echec :", error);
		throw error;
	} finally {
		client.release();
		await pool.end();
	}

	const csvLines = ["console_slug,region,action,title,matched_title,score"];
	for (const r of report) {
		csvLines.push(
			[r.consoleSlug, r.region, r.action, r.title, r.matchedTitle, r.score].map((v) => `"${v.replace(/"/g, '""')}"`).join(",")
		);
	}
	writeFileSync(REPORT_PATH, csvLines.join("\n"), "utf-8");

	const byAction = new Map<string, number>();
	for (const r of report) byAction.set(r.action, (byAction.get(r.action) ?? 0) + 1);
	console.log(`\nTotal lignes de rapport : ${report.length}`);
	for (const [action, count] of byAction) console.log(`  ${action} : ${count}`);
	console.log(`Rapport detaille : ${REPORT_PATH}`);
	if (!APPLY) console.log(`\nAucune ecriture effectuee. Relancer avec PC_APPLY=1 pour appliquer.`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
