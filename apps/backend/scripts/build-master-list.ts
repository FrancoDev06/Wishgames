// Construit, pour chaque console, une liste maîtresse dédupliquée de jeux en croisant LaunchBox +
// MobyGames + PriceCharting, PUREMENT à partir des fichiers sources bruts (aucune dépendance à la
// base de données WishGames, sur demande explicite de l'utilisateur — la base actuelle peut contenir
// des doublons qui fausseraient toute comparaison basée dessus).
// Sortie : un JSON par console dans ./master-lists/<slug>.json + un résumé en console.
// Usage : bun run build-master-list.ts

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const LB_DIR = "C:/Users/franc/Desktop/Wish/output";
const MOBY_DIR = "C:/Users/franc/Desktop/retro_collection/scraper/data/platform-games";
const PC_DIR = "C:/Users/franc/Desktop/wishlist_retro/csv";
const OUT_DIR = join(import.meta.dir, "master-lists");
mkdirSync(OUT_DIR, { recursive: true });

const GENRE_BLOCKLIST = new Set(["Accessories", "Controllers", "Systems", "Demo & NFR"]);
const NON_GAME_BRACKET = /not for resale|press kit|^promo\b|promo only|trade demo|^demo\b|demo disc|demo cd|homebrew|reproduction|kiosk/i;
const FUZZY_MATCH_THRESHOLD = 0.85;

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
	"nec-turbografx-16": 1995,
	"nec-turbografx-cd": 1999,
	"snk-neo-geo": 2004,
};

interface ConsoleSpec {
	slug: string;
	name: string;
	lbFile?: string;
	mobyFiles?: string[]; // parfois plusieurs (ex: futur pc-engine JP en plus de turbo-grafx)
	pcFiles?: { file: string; region: string }[];
}

const CONSOLES: ConsoleSpec[] = [
	{ slug: "nec-supergrafx", name: "NEC SuperGrafx", mobyFiles: ["supergrafx.json"] },
	{ slug: "nec-turbografx-16", name: "NEC TurboGrafx-16", lbFile: "nec-turbografx-16.json", mobyFiles: ["turbo-grafx.json"], pcFiles: [{ file: "jp-pc-engine", region: "Japan" }] },
	{ slug: "nec-turbografx-cd", name: "NEC TurboGrafx-CD", lbFile: "nec-turbografx-cd.json", mobyFiles: ["turbografx-cd.json"], pcFiles: [{ file: "jp-pc-engine-cd", region: "Japan" }] },
	{ slug: "nintendo-64", name: "Nintendo 64", lbFile: "nintendo-64.json", mobyFiles: ["n64.json"], pcFiles: [{ file: "nintendo-64", region: "North America" }, { file: "pal-nintendo-64", region: "Europe" }, { file: "jp-nintendo-64", region: "Japan" }] },
	{ slug: "nintendo-entertainment-system", name: "NES", lbFile: "nintendo-entertainment-system.json", mobyFiles: ["nes.json"], pcFiles: [{ file: "nes", region: "North America" }, { file: "pal-nes", region: "Europe" }] },
	{ slug: "nintendo-famicom-disk-system", name: "Famicom Disk System", lbFile: "nintendo-famicom-disk-system.json", pcFiles: [{ file: "famicom-disk-system", region: "Japan" }] },
	{ slug: "nintendo-game-boy", name: "Game Boy", mobyFiles: ["gameboy.json"] },
	{ slug: "nintendo-gamecube", name: "GameCube", lbFile: "nintendo-gamecube.json", mobyFiles: ["gamecube.json"], pcFiles: [{ file: "gamecube", region: "North America" }, { file: "pal-gamecube", region: "Europe" }] },
	{ slug: "nintendo-wii", name: "Wii", mobyFiles: ["wii.json"], pcFiles: [{ file: "pal-wii", region: "Europe" }] },
	{ slug: "nintendo-wii-u", name: "Wii U", mobyFiles: ["wii-u.json"], pcFiles: [{ file: "pal-wii-u", region: "Europe" }] },
	{ slug: "sega-32x", name: "Sega 32X", lbFile: "sega-32x.json", mobyFiles: ["sega-32x.json"], pcFiles: [{ file: "sega-32x", region: "North America" }, { file: "pal-mega-drive-32x", region: "Europe" }, { file: "jp-super-32x", region: "Japan" }] },
	{ slug: "sega-cd", name: "Sega CD", lbFile: "sega-cd.json", mobyFiles: ["sega-cd.json"], pcFiles: [{ file: "sega-cd", region: "North America" }, { file: "pal-sega-mega-cd", region: "Europe" }] },
	{ slug: "sega-dreamcast", name: "Dreamcast", lbFile: "sega-dreamcast.json", mobyFiles: ["dreamcast.json"], pcFiles: [{ file: "sega-dreamcast", region: "North America" }, { file: "pal-sega-dreamcast", region: "Europe" }, { file: "jp-sega-dreamcast", region: "Japan" }] },
	{ slug: "sega-game-gear", name: "Game Gear", mobyFiles: ["game-gear.json"], pcFiles: [{ file: "pal-sega-game-gear", region: "Europe" }, { file: "jp-sega-game-gear", region: "Japan" }] },
	{ slug: "sega-genesis", name: "Genesis/Mega Drive", lbFile: "sega-genesis.json", mobyFiles: ["genesis.json"], pcFiles: [{ file: "sega-genesis", region: "North America" }, { file: "pal-sega-mega-drive", region: "Europe" }, { file: "jp-sega-mega-drive", region: "Japan" }] },
	{ slug: "sega-master-system", name: "Master System", lbFile: "sega-master-system.json", mobyFiles: ["sega-master-system.json"], pcFiles: [{ file: "sega-master-system", region: "North America" }, { file: "pal-sega-master-system", region: "Europe" }] },
	{ slug: "sega-saturn", name: "Saturn", lbFile: "sega-saturn.json", mobyFiles: ["sega-saturn.json"], pcFiles: [{ file: "sega-saturn", region: "North America" }, { file: "pal-sega-saturn", region: "Europe" }, { file: "jp-sega-saturn", region: "Japan" }] },
	{ slug: "snk-neo-geo", name: "Neo Geo", mobyFiles: ["neo-geo.json"], pcFiles: [{ file: "neo-geo-aes", region: "North America" }, { file: "neo-geo-cd", region: "North America" }, { file: "neo-geo-mvs", region: "North America" }, { file: "jp-neo-geo-aes", region: "Japan" }, { file: "jp-neo-geo-cd", region: "Japan" }, { file: "jp-neo-geo-mvs", region: "Japan" }] },
	{ slug: "sony-playstation", name: "PlayStation", lbFile: "sony-playstation.json", mobyFiles: ["playstation.json"], pcFiles: [{ file: "playstation", region: "North America" }, { file: "pal-playstation", region: "Europe" }] },
	{ slug: "sony-playstation-2", name: "PS2", lbFile: "sony-playstation-2.json", mobyFiles: ["ps2.json"], pcFiles: [{ file: "playstation-2", region: "North America" }, { file: "pal-playstation-2", region: "Europe" }] },
	{ slug: "sony-playstation-3", name: "PS3", lbFile: "sony-playstation-3.json", mobyFiles: ["ps3.json"], pcFiles: [{ file: "playstation-3", region: "North America" }, { file: "pal-playstation-3", region: "Europe" }] },
	{ slug: "sony-playstation-4", name: "PS4", lbFile: "sony-playstation-4.json", mobyFiles: ["playstation-4.json"], pcFiles: [{ file: "playstation-4", region: "North America" }, { file: "pal-playstation-4", region: "Europe" }] },
	{ slug: "super-nintendo-entertainment-system", name: "SNES", lbFile: "super-nintendo-entertainment-system.json", mobyFiles: ["snes.json"], pcFiles: [{ file: "super-nintendo", region: "North America" }, { file: "pal-super-nintendo", region: "Europe" }, { file: "super-famicom", region: "Japan" }] },
];

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
function numeralTokens(t: string): string[] {
	return t.split(" ").filter((x) => NUMERAL_TOKEN.test(x)).sort();
}
function sameNumerals(a: string, b: string): boolean {
	const ta = numeralTokens(a);
	const tb = numeralTokens(b);
	return ta.length === tb.length && ta.every((v, i) => v === tb[i]);
}

interface RegionInfo {
	coverUrl: string | null;
	source: string;
}

interface Entry {
	title: string;
	normTitle: string;
	year: number | null;
	sources: Set<string>;
	regions: Map<string, RegionInfo>; // region -> info ; "unknown" si aucune region connue
}

function ensureEntry(index: Map<string, Entry>, list: { normTitle: string; entry: Entry }[], normTitle: string, title: string, year: number | null): Entry {
	let entry = index.get(normTitle);
	if (!entry) {
		entry = { title, normTitle, year, sources: new Set(), regions: new Map() };
		index.set(normTitle, entry);
		list.push({ normTitle, entry });
	}
	return entry;
}

function findMatch(norm: string, list: { normTitle: string; entry: Entry }[]): Entry | null {
	const exact = list.find((e) => e.normTitle === norm);
	if (exact) return exact.entry;
	let best: { entry: Entry; score: number } | null = null;
	for (const { normTitle, entry } of list) {
		if (Math.abs(normTitle.length - norm.length) > 8) continue;
		if (!sameNumerals(norm, normTitle)) continue;
		const score = similarity(norm, normTitle);
		if (!best || score > best.score) best = { entry, score };
	}
	if (best && best.score >= FUZZY_MATCH_THRESHOLD) return best.entry;
	return null;
}

// ---- LaunchBox ----
function loadLaunchBox(file: string, index: Map<string, Entry>, list: { normTitle: string; entry: Entry }[]) {
	const path = join(LB_DIR, file);
	if (!existsSync(path)) return;
	const data = JSON.parse(readFileSync(path, "utf-8"));
	for (const game of data.games) {
		const norm = normalize(game.title);
		const year = game.release_date ? parseInt(game.release_date.slice(0, 4), 10) : null;
		const entry = ensureEntry(index, list, norm, game.title, Number.isNaN(year!) ? null : year);
		entry.sources.add("LaunchBox");
		for (const key of ["Box - Front", "Box - Front - Reconstructed"]) {
			const items = game.media?.[key];
			if (!items) continue;
			for (const item of items) {
				const region = item.region || "unknown";
				if (!entry.regions.has(region)) entry.regions.set(region, { coverUrl: item.url ?? null, source: "LaunchBox" });
			}
		}
	}
}

// ---- MobyGames ----
function loadMoby(file: string, index: Map<string, Entry>, list: { normTitle: string; entry: Entry }[]) {
	const path = join(MOBY_DIR, file);
	if (!existsSync(path)) return;
	const data: { title: string; year: number | null; coverUrl: string | null }[] = JSON.parse(readFileSync(path, "utf-8"));
	for (const item of data) {
		const norm = normalize(item.title);
		const matched = findMatch(norm, list);
		const entry = matched ?? ensureEntry(index, list, norm, item.title, item.year);
		entry.sources.add("MobyGames");
		if (!entry.regions.has("unknown") && ![...entry.regions.keys()].some((r) => r !== "unknown")) {
			// seulement si aucune region connue pour ce jeu, sinon on ne pollue pas avec un cover region-less
			if (!entry.regions.has("unknown")) entry.regions.set("unknown", { coverUrl: item.coverUrl ?? null, source: "MobyGames" });
		}
	}
}

// ---- PriceCharting ----
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

function cleanTitle(rawTitle: string, consoleLabel: string): string | null {
	let title = rawTitle.trim();
	if (consoleLabel && title.endsWith(consoleLabel)) title = title.slice(0, title.length - consoleLabel.length).trim();
	const bracketMatch = title.match(/\[([^\]]*)\]\s*$/);
	if (bracketMatch && NON_GAME_BRACKET.test(bracketMatch[1])) return null;
	title = title.replace(/\s*\[[^\]]*\]\s*$/, "").trim();
	return title.length > 0 ? title : null;
}

function parseYear(releaseDate: string): number | null {
	const m = releaseDate.match(/\b(19\d{2}|20\d{2})\b/);
	return m ? parseInt(m[1], 10) : null;
}

function loadPriceCharting(fileBase: string, region: string, consoleSlug: string, index: Map<string, Entry>, list: { normTitle: string; entry: Entry }[]) {
	const path = join(PC_DIR, `${fileBase}.csv`);
	if (!existsSync(path)) return;
	const table = parseCsv(readFileSync(path, "utf-8"));
	const header = table[0];
	const ci = header.indexOf("console");
	const ti = header.indexOf("title");
	const gi = header.indexOf("genre");
	const rdIdx = header.indexOf("release_date");
	const imgIdx = header.indexOf("image_cover");
	const yearCutoff = YEAR_CUTOFF[consoleSlug];

	const seenInFile = new Set<string>();
	for (let i = 1; i < table.length; i++) {
		const r = table[i];
		const genre = (r[gi] || "").trim();
		if (GENRE_BLOCKLIST.has(genre)) continue;
		const title = cleanTitle(r[ti] || "", r[ci] || "");
		if (!title) continue;
		const norm = normalize(title);
		if (seenInFile.has(norm)) continue;
		seenInFile.add(norm);

		const year = parseYear(r[rdIdx] || "");
		if (yearCutoff !== undefined && year !== null && year > yearCutoff) continue; // homebrew/reedition moderne

		const imageUrl = (r[imgIdx] || "").trim();
		if (!imageUrl) continue;

		const matched = findMatch(norm, list);
		const entry = matched ?? ensureEntry(index, list, norm, title, year);
		entry.sources.add("PriceCharting");
		if (!entry.regions.has(region)) entry.regions.set(region, { coverUrl: imageUrl, source: "PriceCharting" });
	}
}

// ---- Run ----
const summary: { slug: string; name: string; total: number; withRegion: number; onlyLb: number; onlyMoby: number; onlyPc: number; multi: number }[] = [];

for (const c of CONSOLES) {
	const index = new Map<string, Entry>();
	const list: { normTitle: string; entry: Entry }[] = [];

	if (c.lbFile) loadLaunchBox(c.lbFile, index, list);
	for (const mf of c.mobyFiles ?? []) loadMoby(mf, index, list);
	for (const pf of c.pcFiles ?? []) loadPriceCharting(pf.file, pf.region, c.slug, index, list);

	const entries = [...index.values()].sort((a, b) => a.title.localeCompare(b.title));
	const out = entries.map((e) => ({
		title: e.title,
		year: e.year,
		sources: [...e.sources],
		regions: Object.fromEntries([...e.regions.entries()].map(([r, info]) => [r, info])),
	}));
	writeFileSync(join(OUT_DIR, `${c.slug}.json`), JSON.stringify(out, null, 2), "utf-8");

	let withRegion = 0, onlyLb = 0, onlyMoby = 0, onlyPc = 0, multi = 0;
	for (const e of entries) {
		const hasRealRegion = [...e.regions.keys()].some((r) => r !== "unknown");
		if (hasRealRegion) withRegion++;
		if (e.sources.size === 1) {
			if (e.sources.has("LaunchBox")) onlyLb++;
			else if (e.sources.has("MobyGames")) onlyMoby++;
			else if (e.sources.has("PriceCharting")) onlyPc++;
		} else multi++;
	}
	summary.push({ slug: c.slug, name: c.name, total: entries.length, withRegion, onlyLb, onlyMoby, onlyPc, multi });
}

writeFileSync(join(OUT_DIR, "_summary.json"), JSON.stringify(summary, null, 2), "utf-8");

console.log(
	"console".padEnd(24),
	"total".padStart(7),
	"avec-region".padStart(12),
	"seul-LB".padStart(8),
	"seul-Moby".padStart(10),
	"seul-PC".padStart(8),
	"croise".padStart(7)
);
console.log("-".repeat(90));
let grandTotal = 0;
for (const s of summary) {
	grandTotal += s.total;
	console.log(
		s.name.padEnd(24),
		String(s.total).padStart(7),
		String(s.withRegion).padStart(12),
		String(s.onlyLb).padStart(8),
		String(s.onlyMoby).padStart(10),
		String(s.onlyPc).padStart(8),
		String(s.multi).padStart(7)
	);
}
console.log("-".repeat(90));
console.log(`TOTAL jeux distincts (toutes consoles) : ${grandTotal}`);
console.log(`\nListes ecrites dans : ${OUT_DIR}`);
