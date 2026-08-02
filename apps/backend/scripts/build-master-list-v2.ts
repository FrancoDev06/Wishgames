// Reconstruction du catalogue : croise MobyGames (API payante, mobygames-api/data, avec vraies
// regions countries[] par edition + cover_groups par pays) et LaunchBox (Wish/output) pour les
// consoles couvertes par les deux, plus NEC SuperGrafx (MobyGames seul, nouvelle console).
// Perimetre decide avec l'utilisateur (session 2026-07-27) : les 15 plateformes scrapees par
// mobygames-api MOINS Atari 5200/7800/Atari ST (hors scope), PLUS SuperGrafx. Les autres consoles
// deja au catalogue (PS2, PS3, Wii, Wii U, Game Boy, Game Gear, Neo Geo, Sega CD, 32X, Famicom
// Disk System) sont exclues de cette passe (sauvegardees, a reprendre plus tard).
// Images retenues : FRONT/BACK/SPINE/MEDIA (boite + cartouche/CD), pas de screenshots (hors scope
// pour l'instant, decision utilisateur).
//
// Usage : bun run scripts/build-master-list-v2.ts

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const MOBY_DIR = "C:/Users/franc/Desktop/mobygames-api/data";
const LB_DIR = "C:/Users/franc/Desktop/Wish/output";
const OUT_DIR = join(import.meta.dir, "master-lists-v2");
mkdirSync(OUT_DIR, { recursive: true });

interface ConsoleSpec {
	slug: string;
	name: string;
	mobyPlatformId: number;
	lbFile?: string;
}

const CONSOLES: ConsoleSpec[] = [
	{ slug: "sega-dreamcast", name: "Sega Dreamcast", mobyPlatformId: 8, lbFile: "sega-dreamcast.json" },
	{ slug: "nintendo-gamecube", name: "Nintendo GameCube", mobyPlatformId: 14, lbFile: "nintendo-gamecube.json" },
	{ slug: "sega-genesis", name: "Sega Genesis", mobyPlatformId: 16, lbFile: "sega-genesis.json" },
	{ slug: "nintendo-entertainment-system", name: "Nintendo Entertainment System", mobyPlatformId: 22, lbFile: "nintendo-entertainment-system.json" },
	{ slug: "nintendo-64", name: "Nintendo 64", mobyPlatformId: 9, lbFile: "nintendo-64.json" },
	{ slug: "sony-playstation", name: "Sony Playstation", mobyPlatformId: 6, lbFile: "sony-playstation.json" },
	{ slug: "sega-master-system", name: "Sega Master System", mobyPlatformId: 26, lbFile: "sega-master-system.json" },
	{ slug: "sega-saturn", name: "Sega Saturn", mobyPlatformId: 23, lbFile: "sega-saturn.json" },
	{ slug: "super-nintendo-entertainment-system", name: "Super Nintendo Entertainment System", mobyPlatformId: 15, lbFile: "super-nintendo-entertainment-system.json" },
	{ slug: "nec-turbografx-cd", name: "NEC TurboGrafx-CD", mobyPlatformId: 45, lbFile: "nec-turbografx-cd.json" },
	{ slug: "nec-turbografx-16", name: "NEC TurboGrafx-16", mobyPlatformId: 40, lbFile: "nec-turbografx-16.json" },
	{ slug: "nec-supergrafx", name: "NEC SuperGrafx", mobyPlatformId: 127 },
];

const FUZZY_MATCH_THRESHOLD = 0.85;

// ---- Normalisation / matching (meme logique que build-master-list.ts) ----
function normalize(title: string): string {
	return title
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
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
function numeralTokens(t: string): string[] {
	return t.split(" ").filter((x) => NUMERAL_TOKEN.test(x)).sort();
}
function sameNumerals(a: string, b: string): boolean {
	const ta = numeralTokens(a);
	const tb = numeralTokens(b);
	return ta.length === tb.length && ta.every((v, i) => v === tb[i]);
}

// ---- Region bucketing ----
const EUROPE_COUNTRIES = new Set([
	"United Kingdom", "Germany", "France", "Spain", "Italy", "The Netherlands", "Belgium",
	"Austria", "Switzerland", "Sweden", "Norway", "Denmark", "Finland", "Poland", "Portugal",
	"Greece", "Ireland", "Iceland", "Luxembourg", "Czechia", "Slovakia", "Russia",
	"Australia", "New Zealand",
]);
const NORTH_AMERICA_COUNTRIES = new Set(["United States", "Canada"]);

function bucketRegionFromCountries(countries: string[]): string {
	if (countries.some((c) => c === "Japan")) return "Japan";
	if (countries.some((c) => NORTH_AMERICA_COUNTRIES.has(c))) return "North America";
	if (countries.some((c) => EUROPE_COUNTRIES.has(c))) return "Europe";
	return "Other";
}
function bucketRegionFromLb(region: string | null): string {
	if (!region) return "Other";
	if (region === "Japan" || region === "North America" || region === "Europe") return region;
	return bucketRegionFromCountries([region]) !== "Other" ? bucketRegionFromCountries([region]) : "Other";
}

// ---- Type mapping ----
const MOBY_SCAN_OF_MAP: Record<string, string> = {
	"Front Cover": "FRONT",
	"Back Cover": "BACK",
	"Media": "MEDIA",
	"Spine/Sides": "SPINE",
};
const LB_MEDIA_MAP: Record<string, string> = {
	"Box - Front": "FRONT",
	"Box - Back": "BACK",
	"Box - Spine": "SPINE",
	"Disc": "MEDIA",
	"Cart - Front": "MEDIA",
	"Box - 3D": "BOX_3D",
};

interface CoverEntry {
	url: string;
	source: "MobyGames" | "LaunchBox";
}
type CoverMap = Map<string, CoverEntry>; // key "TYPE|REGION"

interface NormalizedGame {
	sourceId: number; // moby game_id ou -launchbox_id
	title: string;
	normTitle: string;
	altTitles: string[];
	description: string | null;
	year: number | null;
	genres: string[];
	gameplay: string[];
	perspective: string[];
	visual: string[];
	setting: string[];
	rating: number | null;
	ratingVotes: number | null;
	developers: string[];
	publishers: string[];
	sourceUrl: string | null;
	covers: CoverMap;
	sourceTag: "MobyGames" | "LaunchBox";
}

// ---- Chargement MobyGames (payant) ----
function loadMobyConsole(platformId: number): NormalizedGame[] {
	const idsPath = join(MOBY_DIR, "platform-game-ids", `${platformId}.json`);
	if (!existsSync(idsPath)) return [];
	const gameIds: number[] = JSON.parse(readFileSync(idsPath, "utf-8"));

	const games: NormalizedGame[] = [];
	for (const gameId of gameIds) {
		const detailsPath = join(MOBY_DIR, "games", `${gameId}.json`);
		if (!existsSync(detailsPath)) continue;
		const details = JSON.parse(readFileSync(detailsPath, "utf-8"));

		const platEntry = (details.platforms || []).find((p: any) => p.platform_id === platformId);
		let year: number | null = null;
		if (platEntry?.first_release_date) {
			const y = parseInt(String(platEntry.first_release_date).slice(0, 4), 10);
			if (!Number.isNaN(y)) year = y;
		}

		const genres: string[] = [], gameplay: string[] = [], perspective: string[] = [], visual: string[] = [], setting: string[] = [];
		for (const g of details.genres || []) {
			if (g.genre_category === "Basic Genres") genres.push(g.genre_name);
			else if (g.genre_category === "Gameplay") gameplay.push(g.genre_name);
			else if (g.genre_category === "Perspective") perspective.push(g.genre_name);
			else if (g.genre_category === "Art Style" || g.genre_category === "Visual Presentation") visual.push(g.genre_name);
			else if (g.genre_category === "Setting") setting.push(g.genre_name);
		}

		const developers = new Set<string>();
		const publishers = new Set<string>();
		const releasePath = join(MOBY_DIR, "releases", `${gameId}_${platformId}.json`);
		if (existsSync(releasePath)) {
			const rel = JSON.parse(readFileSync(releasePath, "utf-8"));
			for (const r of rel.releases || []) {
				for (const c of r.companies || []) {
					if (/develop/i.test(c.role)) developers.add(c.company_name);
					if (/publish/i.test(c.role)) publishers.add(c.company_name);
				}
			}
		}

		const covers: CoverMap = new Map();
		const coversPath = join(MOBY_DIR, "covers", `${gameId}_${platformId}.json`);
		if (existsSync(coversPath)) {
			const cov = JSON.parse(readFileSync(coversPath, "utf-8"));
			for (const group of cov.cover_groups || []) {
				const region = bucketRegionFromCountries(group.countries || []);
				for (const c of group.covers || []) {
					const type = MOBY_SCAN_OF_MAP[c.scan_of];
					if (!type) continue;
					const key = `${type}|${region}`;
					if (!covers.has(key)) covers.set(key, { url: c.image, source: "MobyGames" });
				}
			}
		}

		const title = details.title as string;
		games.push({
			sourceId: gameId,
			title,
			normTitle: normalize(title),
			altTitles: (details.alternate_titles || []).map((t: any) => t.title),
			description: details.description || null,
			year,
			genres, gameplay, perspective, visual, setting,
			rating: details.moby_score ?? null,
			ratingVotes: details.num_votes ?? null,
			developers: [...developers],
			publishers: [...publishers],
			sourceUrl: details.moby_url || null,
			covers,
			sourceTag: "MobyGames",
		});
	}
	return games;
}

// ---- Chargement LaunchBox ----
function loadLaunchBoxConsole(file: string): NormalizedGame[] {
	const path = join(LB_DIR, file);
	if (!existsSync(path)) return [];
	const data = JSON.parse(readFileSync(path, "utf-8"));

	const games: NormalizedGame[] = [];
	for (const g of data.games || []) {
		const year = g.release_date ? parseInt(String(g.release_date).slice(0, 4), 10) : null;

		const covers: CoverMap = new Map();
		for (const [mediaType, mapped] of Object.entries(LB_MEDIA_MAP)) {
			const items = g.media?.[mediaType];
			if (!items) continue;
			for (const item of items) {
				const region = bucketRegionFromLb(item.region);
				const key = `${mapped}|${region}`;
				if (!covers.has(key)) covers.set(key, { url: item.url, source: "LaunchBox" });
			}
		}

		games.push({
			sourceId: Number(g.id),
			title: g.title,
			normTitle: normalize(g.title),
			altTitles: g.alternate_names || [],
			description: g.overview || null,
			year: Number.isNaN(year!) ? null : year,
			genres: g.genres || [],
			gameplay: [], perspective: [], visual: [], setting: [],
			rating: g.community_rating ?? null,
			ratingVotes: g.total_votes ?? null,
			developers: g.developers || [],
			publishers: g.publishers || [],
			sourceUrl: g.url || null,
			covers,
			sourceTag: "LaunchBox",
		});
	}
	return games;
}

// ---- Matching ----
function findMatchIndex(
	normTitle: string,
	year: number | null,
	exactIndex: Map<string, number[]>,
	lbGames: NormalizedGame[],
	used: Set<number>
): number {
	const candidates = (exactIndex.get(normTitle) || []).filter((i) => !used.has(i));
	if (candidates.length === 1) return candidates[0];
	if (candidates.length > 1) {
		const withYear = candidates.filter((i) => {
			const ly = lbGames[i].year;
			return ly && year && Math.abs(ly - year) <= 1;
		});
		if (withYear.length >= 1) return withYear[0];
		return candidates[0];
	}

	let best = -1;
	let bestScore = 0;
	for (let i = 0; i < lbGames.length; i++) {
		if (used.has(i)) continue;
		const lbNorm = lbGames[i].normTitle;
		if (Math.abs(lbNorm.length - normTitle.length) > 8) continue;
		if (!sameNumerals(normTitle, lbNorm)) continue;
		const score = similarity(normTitle, lbNorm);
		if (score > bestScore) {
			bestScore = score;
			best = i;
		}
	}
	if (best !== -1 && bestScore >= FUZZY_MATCH_THRESHOLD) {
		const ly = lbGames[best].year;
		if (!ly || !year || Math.abs(ly - year) <= 1) return best;
	}
	return -1;
}

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

function mergeCovers(primary: CoverMap, secondary: CoverMap): CoverMap {
	const merged = new Map(primary);
	for (const [key, val] of secondary) {
		if (!merged.has(key)) merged.set(key, val);
	}
	return merged;
}

function coversToArray(covers: CoverMap): MergedGame["covers"] {
	return [...covers.entries()].map(([key, val]) => {
		const [type, region] = key.split("|");
		return { type, region, url: val.url, source: val.source };
	});
}

function buildConsole(spec: ConsoleSpec) {
	const mobyGames = loadMobyConsole(spec.mobyPlatformId);
	const lbGames = spec.lbFile ? loadLaunchBoxConsole(spec.lbFile) : [];

	const lbExactIndex = new Map<string, number[]>();
	lbGames.forEach((g, i) => {
		if (!lbExactIndex.has(g.normTitle)) lbExactIndex.set(g.normTitle, []);
		lbExactIndex.get(g.normTitle)!.push(i);
	});

	const used = new Set<number>();
	const merged: MergedGame[] = [];

	for (const moby of mobyGames) {
		const idx = findMatchIndex(moby.normTitle, moby.year, lbExactIndex, lbGames, used);
		const lb = idx !== -1 ? lbGames[idx] : null;
		if (idx !== -1) used.add(idx);

		const covers = lb ? mergeCovers(moby.covers, lb.covers) : moby.covers;

		merged.push({
			nb_source_id: moby.sourceId,
			title: moby.title,
			aka_titles: [...new Set([...moby.altTitles, ...(lb?.altTitles || [])])],
			description: moby.description || lb?.description || null,
			release_year: moby.year ?? lb?.year ?? null,
			genres: moby.genres.length ? moby.genres : (lb?.genres || []),
			gameplay: moby.gameplay,
			perspective: moby.perspective,
			visual: moby.visual,
			setting: moby.setting,
			rating: moby.rating ?? lb?.rating ?? null,
			rating_votes: moby.ratingVotes ?? lb?.ratingVotes ?? null,
			developers: moby.developers.length ? moby.developers : (lb?.developers || []),
			publishers: moby.publishers.length ? moby.publishers : (lb?.publishers || []),
			source_url: moby.sourceUrl,
			sources: lb ? ["MobyGames", "LaunchBox"] : ["MobyGames"],
			covers: coversToArray(covers),
		});
	}

	lbGames.forEach((lb, idx) => {
		if (used.has(idx)) return;
		merged.push({
			nb_source_id: -lb.sourceId,
			title: lb.title,
			aka_titles: lb.altTitles,
			description: lb.description,
			release_year: lb.year,
			genres: lb.genres,
			gameplay: [], perspective: [], visual: [], setting: [],
			rating: lb.rating,
			rating_votes: lb.ratingVotes,
			developers: lb.developers,
			publishers: lb.publishers,
			source_url: lb.sourceUrl,
			sources: ["LaunchBox"],
			covers: coversToArray(lb.covers),
		});
	});

	merged.sort((a, b) => a.title.localeCompare(b.title));
	return { merged, mobyTotal: mobyGames.length, lbTotal: lbGames.length };
}

// ---- Run ----
const summary: any[] = [];
for (const spec of CONSOLES) {
	console.log(`--- ${spec.name} ---`);
	const { merged, mobyTotal, lbTotal } = buildConsole(spec);

	let withRegionCover = 0, multiSource = 0, mobyOnly = 0, lbOnly = 0, totalCovers = 0;
	for (const g of merged) {
		totalCovers += g.covers.length;
		if (g.covers.some((c) => c.region !== "Other")) withRegionCover++;
		if (g.sources.length > 1) multiSource++;
		else if (g.sources[0] === "MobyGames") mobyOnly++;
		else lbOnly++;
	}

	writeFileSync(join(OUT_DIR, `${spec.slug}.json`), JSON.stringify(merged, null, 2), "utf-8");

	const row = {
		slug: spec.slug, name: spec.name,
		mobyTotal, lbTotal, total: merged.length,
		multiSource, mobyOnly, lbOnly,
		withRegionCover, totalCovers,
	};
	summary.push(row);
	console.log(row);
}

writeFileSync(join(OUT_DIR, "_summary.json"), JSON.stringify(summary, null, 2), "utf-8");
console.log("\n=== RESUME ===");
console.table(summary);
const grandTotal = summary.reduce((a, s) => a + s.total, 0);
const grandCovers = summary.reduce((a, s) => a + s.totalCovers, 0);
console.log(`TOTAL jeux : ${grandTotal}, TOTAL jaquettes : ${grandCovers}`);
