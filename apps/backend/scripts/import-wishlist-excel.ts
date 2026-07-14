// Import ponctuel de la wishlist Excel vers ref_wishlist (§2/§3.2 du cahier des charges).
// Usage : bun run scripts/import-wishlist-excel.ts   (exécuté depuis apps/backend, .env chargé automatiquement par Bun)
//
// Une ligne du fichier Excel = (jeu, région). On regroupe les lignes par jeu et on stocke les régions
// acceptées dans ref_wishlist.ll_desired_regions (décision utilisateur : une seule entrée wishlist par jeu,
// pour pouvoir comparer les offres entre régions et prendre la moins chère via ref_wishlist_offer).
// Rapprochement avec le catalogue par titre normalisé, exact (pas de matching flou) : les titres non
// trouvés sont listés dans un rapport, rien n'est inséré pour eux.

import { Pool } from "pg";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import * as XLSX from "xlsx";

const WISHLIST_XLSX = join(import.meta.dir, "..", "..", "..", "data", "Wish List Retro(1).xlsx");
const UNMATCHED_REPORT = join(import.meta.dir, "import-wishlist-unmatched.csv");

// Onglets Excel sans titre (vides au moment de l'import) volontairement ignorés : Nintendo 64, Wii, Playstation 2/3/4, Wii U, Switch.
export const SHEET_TO_CONSOLE_SLUGS: Record<string, string[]> = {
	"Pc Engine": ["nec-turbografx-16", "nec-turbografx-cd"],
	"Nintendo": ["nintendo-entertainment-system"],
	"Super Nintendo": ["super-nintendo-entertainment-system"],
	"Mega Drive": ["sega-genesis"],
	"Saturn": ["sega-saturn"],
	"Dreamcast": ["sega-dreamcast"],
	"Playstation 1": ["sony-playstation"],
};

interface ExcelRow {
	title: string;
	localTitle: string | null;
	region: string | null;
	priority: number | null;
}

interface WishlistGame {
	title: string;
	localTitle: string | null;
	regions: Set<string>;
	priority: number | null;
}

export function normalize(title: string): string {
	return title
		.normalize("NFKC")
		.replace(/[‘’]/g, "'")
		.replace(/[“”]/g, '"')
		.trim()
		.replace(/\s+/g, " ")
		.toLowerCase();
}

function readSheetRows(workbook: XLSX.WorkBook, sheetName: string): ExcelRow[] {
	const sheet = workbook.Sheets[sheetName];
	const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
	const header = rows[0] as string[];
	const colTitle = header.indexOf("Title");
	const colLocalTitle = header.indexOf("Titre local");
	const colRegion = header.indexOf("Region");
	const colPriority = header.indexOf("Pririoty");

	const result: ExcelRow[] = [];
	for (const row of rows.slice(1)) {
		const title = row[colTitle] as string | null;
		if (!title) continue;
		result.push({
			title,
			localTitle: (row[colLocalTitle] as string | null) ?? null,
			region: (row[colRegion] as string | null) ?? null,
			priority: colPriority >= 0 ? (row[colPriority] as number | null) : null,
		});
	}
	return result;
}

function groupByGame(rows: ExcelRow[]): WishlistGame[] {
	const groups = new Map<string, WishlistGame>();
	for (const row of rows) {
		const key = normalize(row.title);
		let group = groups.get(key);
		if (!group) {
			group = { title: row.title, localTitle: row.localTitle, regions: new Set(), priority: null };
			groups.set(key, group);
		}
		if (row.region) group.regions.add(row.region);
		if (row.priority != null) group.priority = Math.max(group.priority ?? 0, row.priority);
	}
	return [...groups.values()];
}

async function main() {
	const pool = new Pool({
		host: process.env.DB_HOST,
		port: Number(process.env.DB_PORT ?? 5432),
		database: process.env.DB_NAME,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
	});

	const workbook = XLSX.read(readFileSync(WISHLIST_XLSX));
	const client = await pool.connect();

	let totalGames = 0;
	let totalMatched = 0;
	const unmatched: { sheet: string; title: string; localTitle: string | null; regions: string }[] = [];

	try {
		for (const [sheetName, consoleSlugs] of Object.entries(SHEET_TO_CONSOLE_SLUGS)) {
			const games = groupByGame(readSheetRows(workbook, sheetName));
			console.log(`${sheetName}: ${games.length} jeux distincts (${consoleSlugs.join(", ")})`);
			totalGames += games.length;

			for (const game of games) {
				const candidates = [game.title, game.localTitle].filter((t): t is string => !!t).map(normalize);

				const match = await client.query<{ id: string }>(
					`SELECT g.id
					 FROM ref_game g
					 JOIN ref_console c ON c.id = g.id_console
					 WHERE c.ll_slug = ANY($1)
					   AND (
					     lower(trim(g.ll_title)) = ANY($2)
					     OR EXISTS (SELECT 1 FROM unnest(g.ll_aka_titles) aka WHERE lower(trim(aka)) = ANY($2))
					   )
					 LIMIT 1`,
					[consoleSlugs, candidates]
				);

				if (match.rowCount === 0) {
					unmatched.push({
						sheet: sheetName,
						title: game.title,
						localTitle: game.localTitle,
						regions: [...game.regions].join("/"),
					});
					continue;
				}

				const idGame = match.rows[0].id;
				await client.query(
					`INSERT INTO ref_wishlist (id_game, ll_desired_regions, nb_priority)
					 VALUES ($1, $2, $3)
					 ON CONFLICT (id_game) DO UPDATE SET ll_desired_regions = EXCLUDED.ll_desired_regions, nb_priority = EXCLUDED.nb_priority`,
					[idGame, [...game.regions], game.priority]
				);
				totalMatched++;
			}
		}
	} finally {
		client.release();
		await pool.end();
	}

	const csvLines = ["sheet,title,local_title,regions", ...unmatched.map((u) =>
		[u.sheet, u.title, u.localTitle ?? "", u.regions].map((v) => `"${v.replace(/"/g, '""')}"`).join(",")
	)];
	writeFileSync(UNMATCHED_REPORT, csvLines.join("\n"), "utf-8");

	console.log(`Termine. jeux=${totalGames} matches=${totalMatched} non-matches=${unmatched.length} (rapport: ${UNMATCHED_REPORT})`);
}

if (import.meta.main) {
	main().catch((error) => {
		console.error(error);
		process.exit(1);
	});
}
