// Aide à la revue "jeux potentiellement manquants côté catalogue LaunchBox" (retour utilisateur :
// comparer le catalogue actuel à retro_collection/scraper/data, jeu de données MobyGames scrapé en
// parallèle). Pour chaque plateforme partagée entre les deux sources, un jeu MobyGames sans
// correspondance exacte de titre dans le catalogue LaunchBox n'est pas forcément un vrai manque —
// souvent une simple variante de formatage (ponctuation, romanisation) déjà présente sous un autre
// libellé. Ce script calcule, comme suggest-wishlist-matches.ts pour la wishlist, le meilleur score
// de similarité contre les titres déjà en base et classe en 3 bandes (mêmes seuils que la
// réconciliation wishlist du 2026-07-13) :
//   - score >= 0.85 : très probablement déjà présent sous un libellé légèrement différent (pas un vrai manque)
//   - 0.55 <= score < 0.85 : à examiner à l'œil
//   - score < 0.55 : très probablement un vrai jeu manquant
// Ne modifie rien en base : produit un CSV de suggestions à valider avant tout import (§9 cahier des charges).
// Usage : bun run scripts/suggest-moby-catalog-matches.ts   (exécuté depuis apps/backend, .env chargé automatiquement par Bun)

import { Pool } from "pg";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const MOBY_ROOT = process.env.MOBY_SCRAPER_ROOT ?? "C:/Users/franc/Desktop/retro_collection/scraper/data";
const PLATFORM_GAMES_DIR = join(MOBY_ROOT, "platform-games");
const REPORT_PATH = join(import.meta.dir, "moby-catalog-match-suggestions.csv");
const MAX_SUGGESTIONS = 3;
const HIGH_CONFIDENCE = 0.85;
const REVIEW_THRESHOLD = 0.55;

// Plateformes communes aux deux sources — PS3/PS4 volontairement exclues : l'écart MobyGames/LaunchBox
// y est anormalement énorme (probablement rééditions numériques/doublons régionaux côté MobyGames,
// pas encore élucidé) et mériterait une investigation séparée avant toute revue de ce type.
const SHARED_PLATFORMS: { consoleSlug: string; mobySlug: string }[] = [
	{ consoleSlug: "nec-turbografx-16", mobySlug: "turbo-grafx" },
	{ consoleSlug: "nec-turbografx-cd", mobySlug: "turbografx-cd" },
	{ consoleSlug: "nintendo-64", mobySlug: "n64" },
	{ consoleSlug: "nintendo-entertainment-system", mobySlug: "nes" },
	{ consoleSlug: "nintendo-gamecube", mobySlug: "gamecube" },
	{ consoleSlug: "sega-32x", mobySlug: "sega-32x" },
	{ consoleSlug: "sega-cd", mobySlug: "sega-cd" },
	{ consoleSlug: "sega-dreamcast", mobySlug: "dreamcast" },
	{ consoleSlug: "sega-genesis", mobySlug: "genesis" },
	{ consoleSlug: "sega-master-system", mobySlug: "sega-master-system" },
	{ consoleSlug: "sega-saturn", mobySlug: "sega-saturn" },
	{ consoleSlug: "sony-playstation-2", mobySlug: "ps2" },
	{ consoleSlug: "sony-playstation", mobySlug: "playstation" },
	{ consoleSlug: "super-nintendo-entertainment-system", mobySlug: "snes" },
];

interface MobyListItem {
	mobyId: number;
	title: string;
	year: number | null;
}

interface Candidate {
	title: string; // libellé original (affiché en suggestion)
	normalized: string; // pour comparaison
}

// Même normalisation que le comparatif effectué en amont (minuscules, ponctuation retirée, article
// "the/a/an" ignoré en tête) — permet de retrouver un exact-match malgré un simple écart de casse/ponctuation.
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

function bestMatch(target: string, candidates: Candidate[]): { title: string; score: number }[] {
	const scored = candidates.map((c) => ({ title: c.title, score: similarity(target, c.normalized) }));
	scored.sort((a, b) => b.score - a.score);
	return scored.slice(0, MAX_SUGGESTIONS);
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
	const client = await pool.connect();

	const outputRows: string[] = [
		"console_slug,moby_id,moby_title,moby_year,band,elsewhere,suggestion_1,score_1,suggestion_2,score_2,suggestion_3,score_3",
	];

	let totalCandidates = 0;
	let highConfidence = 0;
	let toReview = 0;
	let likelyMissing = 0;
	let elsewhereFlagged = 0;

	// Index global (toutes consoles confondues) pour détecter les candidats qui existent déjà
	// ailleurs dans le catalogue sous un autre nom de console — signal utile pour repérer les
	// jeux mal classés à la source (ex. un jeu NES listé par erreur sous TurboGrafx par MobyGames)
	// sans se fier uniquement à la similarité de titre au sein d'une seule console.
	const globalResult = await client.query<{ title: string; console_name: string }>(
		`SELECT g.ll_title AS title, c.ll_name AS console_name FROM ref_game g JOIN ref_console c ON c.id = g.id_console`
	);
	const globalExactIndex = new Map<string, Set<string>>();
	for (const row of globalResult.rows) {
		const n = normalize(row.title);
		if (!globalExactIndex.has(n)) globalExactIndex.set(n, new Set());
		globalExactIndex.get(n)!.add(row.console_name);
	}

	try {
		for (const platform of SHARED_PLATFORMS) {
			const catalogResult = await client.query<{ title: string; aka_titles: string[] | null }>(
				`SELECT g.ll_title AS title, g.ll_aka_titles AS aka_titles
				 FROM ref_game g
				 JOIN ref_console c ON c.id = g.id_console
				 WHERE c.ll_slug = $1`,
				[platform.consoleSlug]
			);

			const candidates: Candidate[] = [];
			const exactTitles = new Set<string>();
			for (const row of catalogResult.rows) {
				candidates.push({ title: row.title, normalized: normalize(row.title) });
				exactTitles.add(normalize(row.title));
				for (const aka of row.aka_titles ?? []) {
					candidates.push({ title: `${row.title} (aka ${aka})`, normalized: normalize(aka) });
					exactTitles.add(normalize(aka));
				}
			}

			const mobyList: MobyListItem[] = JSON.parse(readFileSync(join(PLATFORM_GAMES_DIR, `${platform.mobySlug}.json`), "utf-8"));

			let platformCandidates = 0;
			for (const item of mobyList) {
				const normalizedTitle = normalize(item.title);
				if (exactTitles.has(normalizedTitle)) continue; // déjà présent, pas un candidat

				totalCandidates++;
				platformCandidates++;

				// Signal fort et prioritaire sur le score de similarité intra-console : ce titre existe déjà
				// tel quel ailleurs dans le catalogue, sous une autre console — très probablement un jeu mal
				// classé à la source par MobyGames (retour utilisateur : "Nintendo World Cup" listé sous
				// TurboGrafx alors qu'il est NES) plutôt qu'un vrai manque sur CETTE console précise.
				const elsewhere = globalExactIndex.get(normalizedTitle);
				let band: string;
				let suggestions: { title: string; score: number }[] = [];
				let elsewhereLabel = "";

				if (elsewhere && elsewhere.size > 0) {
					band = "autre_console";
					elsewhereFlagged++;
					elsewhereLabel = [...elsewhere].join(" / ");
				} else {
					suggestions = bestMatch(normalizedTitle, candidates);
					const topScore = suggestions[0]?.score ?? 0;
					band = topScore >= HIGH_CONFIDENCE ? "deja_present" : topScore >= REVIEW_THRESHOLD ? "a_examiner" : "probable_manque";
					if (band === "deja_present") highConfidence++;
					else if (band === "a_examiner") toReview++;
					else likelyMissing++;
				}

				const cells = [
					platform.consoleSlug,
					String(item.mobyId),
					item.title,
					item.year != null ? String(item.year) : "",
					band,
					elsewhereLabel,
				];
				for (let i = 0; i < MAX_SUGGESTIONS; i++) {
					cells.push(suggestions[i]?.title ?? "");
					cells.push(suggestions[i] ? suggestions[i].score.toFixed(2) : "");
				}
				outputRows.push(cells.map((v) => `"${(v ?? "").replace(/"/g, '""')}"`).join(","));
			}

			console.log(`${platform.consoleSlug} — ${platformCandidates} candidats (sur ${mobyList.length} jeux MobyGames listés)`);
		}
	} finally {
		client.release();
		await pool.end();
	}

	writeFileSync(REPORT_PATH, outputRows.join("\n"), "utf-8");

	console.log(
		`\nTermine. candidats=${totalCandidates} autre_console=${elsewhereFlagged} deja_present(>=${HIGH_CONFIDENCE})=${highConfidence} a_examiner=${toReview} probable_manque(<${REVIEW_THRESHOLD})=${likelyMissing}`
	);
	console.log(`Rapport : ${REPORT_PATH}`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
