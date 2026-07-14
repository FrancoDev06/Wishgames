// Aide à la revue manuelle de apps/backend/scripts/import-wishlist-unmatched.csv (§2ter du cahier des charges).
// Usage : bun run scripts/suggest-wishlist-matches.ts   (exécuté depuis apps/backend, .env chargé automatiquement par Bun)
//
// Pour chaque ligne non rapprochée par import-wishlist-excel.ts (matching exact), cherche les jeux du
// catalogue les plus proches par similarité de texte (distance de Levenshtein), sur la ou les consoles
// mappées pour l'onglet d'origine. Ne modifie rien en base ni dans l'Excel : produit un rapport CSV
// de suggestions à valider à l'œil, beaucoup plus rapide qu'une recherche manuelle jeu par jeu.
// Le matching automatique de l'import reste strict (décision explicite de l'utilisateur) — ce script
// est un outil d'aide à la relecture humaine, pas un import.

import { Pool } from "pg";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { SHEET_TO_CONSOLE_SLUGS, normalize } from "./import-wishlist-excel";

const UNMATCHED_REPORT = join(import.meta.dir, "import-wishlist-unmatched.csv");
const SUGGESTIONS_REPORT = join(import.meta.dir, "wishlist-match-suggestions.csv");
const MAX_SUGGESTIONS = 3;

interface UnmatchedRow {
	sheet: string;
	title: string;
	localTitle: string;
	regions: string;
}

interface Candidate {
	id: string;
	title: string;
}

interface Suggestion {
	title: string;
	score: number;
}

// Parseur CSV complet (pas ligne par ligne) : un champ entre guillemets peut contenir des
// retours à la ligne littéraux (ex. certains titres Excel source ont un saut de ligne dans la cellule).
function parseCsv(content: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let cur = "";
	let inQuotes = false;
	for (let i = 0; i < content.length; i++) {
		const c = content[i];
		if (inQuotes) {
			if (c === '"') {
				if (content[i + 1] === '"') {
					cur += '"';
					i++;
				} else {
					inQuotes = false;
				}
			} else {
				cur += c;
			}
		} else {
			if (c === '"') inQuotes = true;
			else if (c === ",") {
				row.push(cur);
				cur = "";
			} else if (c === "\r") {
				// ignoré, géré via \n
			} else if (c === "\n") {
				row.push(cur);
				cur = "";
				rows.push(row);
				row = [];
			} else {
				cur += c;
			}
		}
	}
	if (cur.length > 0 || row.length > 0) {
		row.push(cur);
		rows.push(row);
	}
	return rows.filter((r) => r.length > 1 || r[0] !== "");
}

function readUnmatchedCsv(): UnmatchedRow[] {
	const content = readFileSync(UNMATCHED_REPORT, "utf-8");
	const rows = parseCsv(content);
	return rows.slice(1).map(([sheet, title, localTitle, regions]) => ({ sheet, title, localTitle, regions }));
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

function bestSuggestionsFor(rawTitles: string[], candidates: Candidate[]): Suggestion[] {
	const normalizedInputs = rawTitles.filter((t) => !!t).map(normalize);
	const byGame = new Map<string, number>();
	for (const candidate of candidates) {
		let best = 0;
		for (const input of normalizedInputs) {
			const score = similarity(input, candidate.title);
			if (score > best) best = score;
		}
		const prev = byGame.get(candidate.title) ?? 0;
		if (best > prev) byGame.set(candidate.title, best);
	}
	return [...byGame.entries()]
		.map(([title, score]) => ({ title, score }))
		.sort((a, b) => b.score - a.score)
		.slice(0, MAX_SUGGESTIONS);
}

async function main() {
	const pool = new Pool({
		host: process.env.DB_HOST,
		port: Number(process.env.DB_PORT ?? 5432),
		database: process.env.DB_NAME,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
	});

	const client = await pool.connect();
	const unmatched = readUnmatchedCsv();
	const candidatesBySlugs = new Map<string, Candidate[]>();

	async function candidatesFor(consoleSlugs: string[]): Promise<Candidate[]> {
		const key = consoleSlugs.join(",");
		const cached = candidatesBySlugs.get(key);
		if (cached) return cached;

		const result = await client.query<{ title: string; aka_titles: string[] | null }>(
			`SELECT g.ll_title AS title, g.ll_aka_titles AS aka_titles
			 FROM ref_game g
			 JOIN ref_console c ON c.id = g.id_console
			 WHERE c.ll_slug = ANY($1)`,
			[consoleSlugs]
		);

		const candidates: Candidate[] = [];
		for (const row of result.rows) {
			candidates.push({ id: row.title, title: normalize(row.title) });
			for (const aka of row.aka_titles ?? []) {
				candidates.push({ id: row.title, title: normalize(aka) });
			}
		}
		candidatesBySlugs.set(key, candidates);
		return candidates;
	}

	const outputRows: string[] = [
		"sheet,title,local_title,regions,suggestion_1,score_1,suggestion_2,score_2,suggestion_3,score_3",
	];

	let highConfidence = 0;
	let noSuggestion = 0;

	try {
		for (const row of unmatched) {
			const consoleSlugs = SHEET_TO_CONSOLE_SLUGS[row.sheet];
			if (!consoleSlugs) {
				console.warn(`Onglet inconnu, ignoré : ${row.sheet}`);
				continue;
			}
			const candidates = await candidatesFor(consoleSlugs);
			const suggestions = bestSuggestionsFor([row.title, row.localTitle], candidates);

			if (suggestions.length === 0) noSuggestion++;
			else if (suggestions[0].score >= 0.85) highConfidence++;

			const cells = [row.sheet, row.title, row.localTitle, row.regions];
			for (let i = 0; i < MAX_SUGGESTIONS; i++) {
				cells.push(suggestions[i]?.title ?? "");
				cells.push(suggestions[i] ? suggestions[i].score.toFixed(2) : "");
			}
			outputRows.push(cells.map((v) => `"${(v ?? "").replace(/"/g, '""')}"`).join(","));
		}
	} finally {
		client.release();
		await pool.end();
	}

	writeFileSync(SUGGESTIONS_REPORT, outputRows.join("\n"), "utf-8");

	console.log(`Termine. lignes=${unmatched.length} suggestions>=0.85=${highConfidence} sans_suggestion=${noSuggestion}`);
	console.log(`Rapport : ${SUGGESTIONS_REPORT}`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
