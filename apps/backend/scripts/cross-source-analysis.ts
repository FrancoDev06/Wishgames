// Analyse en lecture seule (aucune écriture DB) : pour chacune des 23 consoles, mesure ce que
// chaque source (LaunchBox / MobyGames / PriceCharting) apporte réellement — nombre de jeux,
// régions couvertes — et calcule une estimation du nombre de jeux distincts si on fusionnait les 3.
// Usage : bun run cross-source-analysis.ts

import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

const LB_DIR = "C:/Users/franc/Desktop/scrapper_launchbox/output";
const MOBY_DIR = "C:/Users/franc/Desktop/retro_collection/scraper/data/platform-games";
const PC_DIR = "C:/Users/franc/Desktop/wishlist_retro/csv";

const GENRE_BLOCKLIST = new Set(["Accessories", "Controllers", "Systems", "Demo & NFR"]);

interface ConsoleSpec {
	slug: string;
	name: string;
	lbFile?: string;
	mobyFile?: string;
	pcFiles?: { file: string; region: string }[];
}

const CONSOLES: ConsoleSpec[] = [
	{ slug: "nec-supergrafx", name: "NEC SuperGrafx", mobyFile: "supergrafx.json" },
	{ slug: "nec-turbografx-16", name: "NEC TurboGrafx-16", lbFile: "nec-turbografx-16.json", mobyFile: "turbo-grafx.json", pcFiles: [{ file: "jp-pc-engine", region: "Japan" }] },
	{ slug: "nec-turbografx-cd", name: "NEC TurboGrafx-CD", lbFile: "nec-turbografx-cd.json", mobyFile: "turbografx-cd.json", pcFiles: [{ file: "jp-pc-engine-cd", region: "Japan" }] },
	{ slug: "nintendo-64", name: "Nintendo 64", lbFile: "nintendo-64.json", mobyFile: "n64.json", pcFiles: [{ file: "nintendo-64", region: "NA" }, { file: "pal-nintendo-64", region: "EU" }, { file: "jp-nintendo-64", region: "JP" }] },
	{ slug: "nintendo-entertainment-system", name: "NES", lbFile: "nintendo-entertainment-system.json", mobyFile: "nes.json", pcFiles: [{ file: "nes", region: "NA" }, { file: "pal-nes", region: "EU" }] },
	{ slug: "nintendo-famicom-disk-system", name: "Famicom Disk System", lbFile: "nintendo-famicom-disk-system.json", pcFiles: [{ file: "famicom-disk-system", region: "JP" }] },
	{ slug: "nintendo-game-boy", name: "Game Boy", mobyFile: "gameboy.json" },
	{ slug: "nintendo-gamecube", name: "GameCube", lbFile: "nintendo-gamecube.json", mobyFile: "gamecube.json", pcFiles: [{ file: "gamecube", region: "NA" }, { file: "pal-gamecube", region: "EU" }] },
	{ slug: "nintendo-wii", name: "Wii", mobyFile: "wii.json", pcFiles: [{ file: "pal-wii", region: "EU" }] },
	{ slug: "nintendo-wii-u", name: "Wii U", mobyFile: "wii-u.json", pcFiles: [{ file: "pal-wii-u", region: "EU" }] },
	{ slug: "sega-32x", name: "Sega 32X", lbFile: "sega-32x.json", mobyFile: "sega-32x.json", pcFiles: [{ file: "sega-32x", region: "NA" }, { file: "pal-mega-drive-32x", region: "EU" }, { file: "jp-super-32x", region: "JP" }] },
	{ slug: "sega-cd", name: "Sega CD", lbFile: "sega-cd.json", mobyFile: "sega-cd.json", pcFiles: [{ file: "sega-cd", region: "NA" }, { file: "pal-sega-mega-cd", region: "EU" }] },
	{ slug: "sega-dreamcast", name: "Dreamcast", lbFile: "sega-dreamcast.json", mobyFile: "dreamcast.json", pcFiles: [{ file: "sega-dreamcast", region: "NA" }, { file: "pal-sega-dreamcast", region: "EU" }, { file: "jp-sega-dreamcast", region: "JP" }] },
	{ slug: "sega-game-gear", name: "Game Gear", mobyFile: "game-gear.json", pcFiles: [{ file: "pal-sega-game-gear", region: "EU" }, { file: "jp-sega-game-gear", region: "JP" }] },
	{ slug: "sega-genesis", name: "Genesis/Mega Drive", lbFile: "sega-genesis.json", mobyFile: "genesis.json", pcFiles: [{ file: "sega-genesis", region: "NA" }, { file: "pal-sega-mega-drive", region: "EU" }, { file: "jp-sega-mega-drive", region: "JP" }] },
	{ slug: "sega-master-system", name: "Master System", lbFile: "sega-master-system.json", mobyFile: "sega-master-system.json", pcFiles: [{ file: "sega-master-system", region: "NA" }, { file: "pal-sega-master-system", region: "EU" }] },
	{ slug: "sega-saturn", name: "Saturn", lbFile: "sega-saturn.json", mobyFile: "sega-saturn.json", pcFiles: [{ file: "sega-saturn", region: "NA" }, { file: "pal-sega-saturn", region: "EU" }, { file: "jp-sega-saturn", region: "JP" }] },
	{ slug: "snk-neo-geo", name: "Neo Geo", mobyFile: "neo-geo.json", pcFiles: [{ file: "neo-geo-aes", region: "NA" }, { file: "neo-geo-cd", region: "NA" }, { file: "neo-geo-mvs", region: "NA" }, { file: "jp-neo-geo-aes", region: "JP" }, { file: "jp-neo-geo-cd", region: "JP" }, { file: "jp-neo-geo-mvs", region: "JP" }] },
	{ slug: "sony-playstation", name: "PlayStation", lbFile: "sony-playstation.json", mobyFile: "playstation.json", pcFiles: [{ file: "playstation", region: "NA" }, { file: "pal-playstation", region: "EU" }] },
	{ slug: "sony-playstation-2", name: "PS2", lbFile: "sony-playstation-2.json", mobyFile: "ps2.json", pcFiles: [{ file: "playstation-2", region: "NA" }, { file: "pal-playstation-2", region: "EU" }] },
	{ slug: "sony-playstation-3", name: "PS3", lbFile: "sony-playstation-3.json", mobyFile: "ps3.json", pcFiles: [{ file: "playstation-3", region: "NA" }, { file: "pal-playstation-3", region: "EU" }] },
	{ slug: "sony-playstation-4", name: "PS4", lbFile: "sony-playstation-4.json", mobyFile: "playstation-4.json", pcFiles: [{ file: "playstation-4", region: "NA" }, { file: "pal-playstation-4", region: "EU" }] },
	{ slug: "super-nintendo-entertainment-system", name: "SNES", lbFile: "super-nintendo-entertainment-system.json", mobyFile: "snes.json", pcFiles: [{ file: "super-nintendo", region: "NA" }, { file: "pal-super-nintendo", region: "EU" }, { file: "super-famicom", region: "JP" }] },
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

// --- LaunchBox ---
function analyzeLaunchBox(file: string): { total: number; regions: Set<string>; titles: Set<string> } {
	const path = join(LB_DIR, file);
	if (!existsSync(path)) return { total: 0, regions: new Set(), titles: new Set() };
	const data = JSON.parse(readFileSync(path, "utf-8"));
	const regions = new Set<string>();
	const titles = new Set<string>();
	for (const game of data.games) {
		titles.add(normalize(game.title));
		for (const key of ["Box - Front", "Box - Front - Reconstructed"]) {
			const items = game.media?.[key];
			if (!items) continue;
			for (const item of items) if (item.region) regions.add(item.region);
		}
	}
	return { total: data.games.length, regions, titles };
}

// --- MobyGames ---
function analyzeMoby(file: string): { total: number; titles: Set<string> } {
	const path = join(MOBY_DIR, file);
	if (!existsSync(path)) return { total: 0, titles: new Set() };
	const data: { title: string }[] = JSON.parse(readFileSync(path, "utf-8"));
	const titles = new Set<string>();
	for (const item of data) titles.add(normalize(item.title));
	return { total: data.length, titles };
}

// --- PriceCharting ---
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

function analyzePriceCharting(fileBase: string): { total: number; titles: Set<string> } {
	const path = join(PC_DIR, `${fileBase}.csv`);
	if (!existsSync(path)) return { total: 0, titles: new Set() };
	const table = parseCsv(readFileSync(path, "utf-8"));
	const header = table[0];
	const ci = header.indexOf("console");
	const ti = header.indexOf("title");
	const gi = header.indexOf("genre");
	const titles = new Set<string>();
	let count = 0;
	for (let i = 1; i < table.length; i++) {
		const r = table[i];
		const genre = (r[gi] || "").trim();
		if (GENRE_BLOCKLIST.has(genre)) continue;
		let title = (r[ti] || "").trim();
		const cons = r[ci] || "";
		if (title.endsWith(cons)) title = title.slice(0, title.length - cons.length).trim();
		title = title.replace(/\s*\[[^\]]*\]\s*$/, "").trim();
		if (!title) continue;
		titles.add(normalize(title));
		count++;
	}
	return { total: count, titles };
}

console.log(
	"console".padEnd(24),
	"LB".padStart(6),
	"LB-regions".padStart(11),
	"Moby".padStart(6),
	"PC".padStart(6),
	"PC-regions".padStart(11),
	"UNION".padStart(7)
);
console.log("-".repeat(90));

let totalUnion = 0;
for (const c of CONSOLES) {
	const lb = c.lbFile ? analyzeLaunchBox(c.lbFile) : { total: 0, regions: new Set<string>(), titles: new Set<string>() };
	const moby = c.mobyFile ? analyzeMoby(c.mobyFile) : { total: 0, titles: new Set<string>() };

	const pcTitles = new Set<string>();
	const pcRegions = new Set<string>();
	let pcTotal = 0;
	for (const pf of c.pcFiles ?? []) {
		const r = analyzePriceCharting(pf.file);
		pcTotal += r.total;
		pcRegions.add(pf.region);
		for (const t of r.titles) pcTitles.add(t);
	}

	const union = new Set<string>([...lb.titles, ...moby.titles, ...pcTitles]);
	totalUnion += union.size;

	console.log(
		c.name.padEnd(24),
		String(lb.total).padStart(6),
		([...lb.regions].join(",") || "-").padStart(11),
		String(moby.total).padStart(6),
		String(pcTotal).padStart(6),
		([...pcRegions].join(",") || "-").padStart(11),
		String(union.size).padStart(7)
	);
}
console.log("-".repeat(90));
console.log(`TOTAL union estimee (toutes consoles) : ${totalUnion}`);
