// Jeu de données FICTIF pour prévisualiser le rendu du catalogue (consoles + fiches détaillées),
// en l'absence du scraper LaunchBox sur cette machine (voir cahier des charges §2).
// Usage : bun run scripts/seed-fake-catalogue.ts   (exécuté depuis apps/backend, .env chargé automatiquement par Bun)
// Idempotent : ON CONFLICT DO UPDATE sur consoles/jeux, jaquettes régénérées à chaque run.

import { Pool } from "pg";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const PUBLIC_COVERS_DIR = join(import.meta.dir, "..", "public", "covers");

// Slugs/couleurs repris de apps/frontend/src/app/core/constants/console-colors.constant.ts
// pour que le rendu (tuiles, bannières) corresponde exactement à ce que verra l'app.
const CONSOLES = [
	{ slug: "sony-playstation", name: "Sony PlayStation", color: "#2E5FA3" },
	{ slug: "super-nintendo-entertainment-system", name: "Super Nintendo Entertainment System", color: "#8B5FBF" },
	{ slug: "sega-genesis", name: "Sega Genesis", color: "#39393D" },
	{ slug: "nintendo-64", name: "Nintendo 64", color: "#2E7D5C" },
	{ slug: "sega-dreamcast", name: "Sega Dreamcast", color: "#E8722C" },
];

interface FakeGame {
	console: string;
	sourceId: number;
	title: string;
	aka: string[];
	description: string;
	year: number;
	genres: string[];
	developers: string[];
	publishers: string[];
	rating: number;
	votes: number;
	regions: string[]; // régions disponibles pour la jaquette FRONT (§9, multi-région)
}

const GAMES: FakeGame[] = [
	// --- Sony PlayStation ---
	{
		console: "sony-playstation",
		sourceId: 90001,
		title: "Crash Bandicoot",
		aka: ["Crash Bandicoot 1"],
		description:
			"Un marsupial mutant traverse une île tropicale infestée de pièges pour contrecarrer les plans du Dr. Neo Cortex. Plateforme linéaire en 3D avec caméra fixe, référence du genre sur la console.",
		year: 1996,
		genres: ["Plateforme"],
		developers: ["Naughty Dog"],
		publishers: ["Sony Computer Entertainment"],
		rating: 4.2,
		votes: 1830,
		regions: ["Europe", "North America", "Japan"],
	},
	{
		console: "sony-playstation",
		sourceId: 90002,
		title: "Final Fantasy VII",
		aka: ["FF7", "Final Fantasy 7"],
		description:
			"Cloud Strife et le groupe éco-terroriste Avalanche s'opposent à la méga-corporation Shinra puis à Sephiroth. RPG au tour par tour avec système de Materia, cinématiques précalculées marquantes.",
		year: 1997,
		genres: ["RPG"],
		developers: ["Square"],
		publishers: ["Square", "Sony Computer Entertainment"],
		rating: 4.7,
		votes: 5120,
		regions: ["Europe", "North America", "Japan"],
	},
	{
		console: "sony-playstation",
		sourceId: 90003,
		title: "Metal Gear Solid",
		aka: [],
		description:
			"Solid Snake infiltre en solo la base FOXHOUND pour désamorcer une menace nucléaire. Infiltration tactique avec caméra vue du dessus, mise en scène cinématographique signée Hideo Kojima.",
		year: 1998,
		genres: ["Action", "Infiltration"],
		developers: ["Konami Computer Entertainment Japan"],
		publishers: ["Konami"],
		rating: 4.6,
		votes: 3410,
		regions: ["Europe", "North America"],
	},
	{
		console: "sony-playstation",
		sourceId: 90004,
		title: "Tekken 3",
		aka: [],
		description:
			"Tournoi d'arts martiaux en 3D opposant un casting élargi de combattants aux styles variés. Combos accessibles, esquive latérale, considéré comme un sommet de la trilogie originale.",
		year: 1998,
		genres: ["Combat"],
		developers: ["Namco"],
		publishers: ["Namco"],
		rating: 4.5,
		votes: 1275,
		regions: ["Europe", "Japan"],
	},

	// --- Super Nintendo Entertainment System ---
	{
		console: "super-nintendo-entertainment-system",
		sourceId: 91001,
		title: "Super Metroid",
		aka: [],
		description:
			"Samus Aran retourne sur Zebes récupérer un bébé Metroid volé par les Pirates de l'Espace. Exploration non linéaire, ambiance oppressante, référence fondatrice du genre \"metroidvania\".",
		year: 1994,
		genres: ["Action", "Aventure"],
		developers: ["Nintendo R&D1", "Intelligent Systems"],
		publishers: ["Nintendo"],
		rating: 4.8,
		votes: 2640,
		regions: ["Europe", "North America", "Japan"],
	},
	{
		console: "super-nintendo-entertainment-system",
		sourceId: 91002,
		title: "Chrono Trigger",
		aka: [],
		description:
			"Crono et ses compagnons voyagent à travers le temps pour empêcher l'apocalypse provoquée par Lavos. RPG signé Square avec le concours d'Akira Toriyama, multiples fins selon les choix du joueur.",
		year: 1995,
		genres: ["RPG"],
		developers: ["Square"],
		publishers: ["Square"],
		rating: 4.9,
		votes: 3980,
		regions: ["North America", "Japan"],
	},
	{
		console: "super-nintendo-entertainment-system",
		sourceId: 91003,
		title: "The Legend of Zelda: A Link to the Past",
		aka: ["Zelda 3"],
		description:
			"Link explore Hyrule et son monde parallèle des Ténèbres pour délivrer les sept sages et vaincre Ganon. Vue de dessus, énigmes et donjons devenus la structure de référence de la série.",
		year: 1991,
		genres: ["Action", "Aventure"],
		developers: ["Nintendo EAD"],
		publishers: ["Nintendo"],
		rating: 4.9,
		votes: 4210,
		regions: ["Europe", "North America", "Japan"],
	},
	{
		console: "super-nintendo-entertainment-system",
		sourceId: 91004,
		title: "Street Fighter II Turbo",
		aka: [],
		description:
			"Version accélérée et rééquilibrée du jeu de combat qui a lancé le genre en arène 1 contre 1. Ajout des quatre boss jouables, vitesse de jeu réglable.",
		year: 1993,
		genres: ["Combat"],
		developers: ["Capcom"],
		publishers: ["Capcom"],
		rating: 4.4,
		votes: 1560,
		regions: ["Europe", "Japan"],
	},

	// --- Sega Genesis ---
	{
		console: "sega-genesis",
		sourceId: 92001,
		title: "Sonic the Hedgehog 2",
		aka: ["Sonic 2"],
		description:
			"Sonic et Tails s'allient pour empêcher le Dr. Robotnik de terminer sa forteresse volante, le Death Egg. Plateforme rapide, niveaux en boucles, introduction du Spin Dash.",
		year: 1992,
		genres: ["Plateforme"],
		developers: ["Sega Technical Institute"],
		publishers: ["Sega"],
		rating: 4.6,
		votes: 2890,
		regions: ["Europe", "North America", "Japan"],
	},
	{
		console: "sega-genesis",
		sourceId: 92002,
		title: "Streets of Rage 2",
		aka: [],
		description:
			"Axel, Blaze, Max et Skate affrontent l'empire criminel du Syndicat dans une suite d'affrontements de rue. Beat 'em up coopératif porté par la bande-son de Yuzo Koshiro.",
		year: 1992,
		genres: ["Beat 'em up"],
		developers: ["Sega"],
		publishers: ["Sega"],
		rating: 4.7,
		votes: 1340,
		regions: ["Europe", "North America"],
	},
	{
		console: "sega-genesis",
		sourceId: 92003,
		title: "Gunstar Heroes",
		aka: [],
		description:
			"Deux justiciers armés jusqu'aux dents combattent une armée de robots pour l'empire du Colonel Red. Run and gun frénétique de Treasure, combinaisons d'armes et boss démesurés.",
		year: 1993,
		genres: ["Run and gun"],
		developers: ["Treasure"],
		publishers: ["Sega"],
		rating: 4.5,
		votes: 690,
		regions: ["Japan"],
	},
	{
		console: "sega-genesis",
		sourceId: 92004,
		title: "Aladdin",
		aka: ["Disney's Aladdin"],
		description:
			"Adaptation du film Disney en plateforme animée, avec sabre-fauché et lancer de pommes contre les gardes d'Agrabah. Animations fluides supervisées par les studios Disney.",
		year: 1993,
		genres: ["Plateforme"],
		developers: ["Virgin Games"],
		publishers: ["Sega"],
		rating: 4.3,
		votes: 980,
		regions: ["Europe", "North America"],
	},

	// --- Nintendo 64 ---
	{
		console: "nintendo-64",
		sourceId: 93001,
		title: "Super Mario 64",
		aka: [],
		description:
			"Mario explore le château de Peach à travers des mondes accessibles par tableaux peints, à la recherche des Power Stars. Fondateur du platformer 3D à monde ouvert, caméra libre.",
		year: 1996,
		genres: ["Plateforme"],
		developers: ["Nintendo EAD"],
		publishers: ["Nintendo"],
		rating: 4.8,
		votes: 3120,
		regions: ["Europe", "North America", "Japan"],
	},
	{
		console: "nintendo-64",
		sourceId: 93002,
		title: "The Legend of Zelda: Ocarina of Time",
		aka: ["Zelda 64"],
		description:
			"Link, élevé chez les Kokiri, voyage entre enfance et âge adulte pour contrer Ganondorf. Premier Zelda en 3D, ciblage Z, souvent cité parmi les meilleurs jeux jamais créés.",
		year: 1998,
		genres: ["Action", "Aventure"],
		developers: ["Nintendo EAD"],
		publishers: ["Nintendo"],
		rating: 4.9,
		votes: 4870,
		regions: ["Europe", "North America", "Japan"],
	},
	{
		console: "nintendo-64",
		sourceId: 93003,
		title: "GoldenEye 007",
		aka: [],
		description:
			"Adaptation du film James Bond en FPS solo et multijoueur à écran splitté à quatre. Missions basées sur l'infiltration et objectifs variés, référence du FPS console des années 90.",
		year: 1997,
		genres: ["FPS"],
		developers: ["Rare"],
		publishers: ["Nintendo"],
		rating: 4.6,
		votes: 2210,
		regions: ["Europe", "North America"],
	},
	{
		console: "nintendo-64",
		sourceId: 93004,
		title: "Mario Kart 64",
		aka: [],
		description:
			"Course d'arcade avec Mario et ses amis sur seize circuits, bonus et objets à collecter. Premier Mario Kart en 3D, écran splitté jusqu'à quatre joueurs.",
		year: 1996,
		genres: ["Course"],
		developers: ["Nintendo EAD"],
		publishers: ["Nintendo"],
		rating: 4.4,
		votes: 1490,
		regions: ["Japan"],
	},

	// --- Sega Dreamcast ---
	{
		console: "sega-dreamcast",
		sourceId: 94001,
		title: "Shenmue",
		aka: [],
		description:
			"Ryo Hazuki enquête sur le meurtre de son père dans le Yokosuka des années 80. Monde ouvert précurseur avec cycle jour/nuit, mini-jeux d'arcade et système de dialogue \"Quick Timer Hint\".",
		year: 1999,
		genres: ["Action", "Aventure"],
		developers: ["Sega AM2"],
		publishers: ["Sega"],
		rating: 4.3,
		votes: 760,
		regions: ["Europe", "Japan"],
	},
	{
		console: "sega-dreamcast",
		sourceId: 94002,
		title: "Soulcalibur",
		aka: [],
		description:
			"Tournoi de combat à l'arme blanche autour de l'épée maudite Soul Edge. Portage arcade acclamé pour sa fluidité et son système de garde à huit directions.",
		year: 1999,
		genres: ["Combat"],
		developers: ["Namco"],
		publishers: ["Namco"],
		rating: 4.7,
		votes: 1120,
		regions: ["Europe", "North America", "Japan"],
	},
	{
		console: "sega-dreamcast",
		sourceId: 94003,
		title: "Crazy Taxi",
		aka: [],
		description:
			"Course contre la montre pour transporter des clients à travers une ville stylisée, au son de The Offspring et Bad Religion. Portage arcade au gameplay immédiat et addictif.",
		year: 1999,
		genres: ["Course", "Arcade"],
		developers: ["Hitmaker"],
		publishers: ["Sega"],
		rating: 4.2,
		votes: 640,
		regions: ["North America"],
	},
	{
		console: "sega-dreamcast",
		sourceId: 94004,
		title: "Jet Set Radio",
		aka: ["Jet Grind Radio"],
		description:
			"Un gang de rollers tague les rues de Tokyo-to face à la police et à des gangs rivaux. Cel-shading pionnier, bande-son électro/hip-hop culte.",
		year: 2000,
		genres: ["Action", "Plateforme"],
		developers: ["Smilebit"],
		publishers: ["Sega"],
		rating: 4.5,
		votes: 590,
		regions: ["Europe", "Japan"],
	},
];

function escapeXml(value: string): string {
	return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wrapTitle(title: string, maxCharsPerLine: number): string[] {
	const words = title.split(" ");
	const lines: string[] = [];
	let current = "";
	for (const word of words) {
		const next = current ? `${current} ${word}` : word;
		if (next.length > maxCharsPerLine && current) {
			lines.push(current);
			current = word;
		} else {
			current = next;
		}
	}
	if (current) lines.push(current);
	return lines.slice(0, 4);
}

// Jaquette placeholder générée (pas d'assets réels disponibles sur cette machine, §2) : fond dégradé
// à la couleur de la console, titre du jeu, mention "DONNÉES FICTIVES" pour ne jamais confondre
// avec un vrai import LaunchBox.
function buildCoverSvg(title: string, consoleName: string, region: string, color: string): string {
	const lines = wrapTitle(title, 16);
	const lineHeight = 34;
	const startY = 300 - ((lines.length - 1) * lineHeight) / 2;
	const textEls = lines
		.map((line, i) => `<text x="200" y="${startY + i * lineHeight}" text-anchor="middle">${escapeXml(line)}</text>`)
		.join("\n");

	return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560" viewBox="0 0 400 560">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" />
      <stop offset="100%" stop-color="#111318" />
    </linearGradient>
  </defs>
  <rect width="400" height="560" fill="url(#bg)" />
  <rect x="12" y="12" width="376" height="536" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="3" />
  <text x="200" y="80" text-anchor="middle" fill="rgba(255,255,255,0.75)" font-family="Arial, sans-serif" font-size="18" letter-spacing="2">${escapeXml(consoleName.toUpperCase())}</text>
  <g fill="#ffffff" font-family="Arial, sans-serif" font-size="30" font-weight="bold">
    ${textEls}
  </g>
  <text x="200" y="470" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-family="Arial, sans-serif" font-size="16">Région : ${escapeXml(region)}</text>
  <text x="200" y="524" text-anchor="middle" fill="rgba(255,255,255,0.45)" font-family="Arial, sans-serif" font-size="13" letter-spacing="1">DONNEES FICTIVES — SEED DE TEST</text>
</svg>`;
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
	let totalGames = 0;
	let totalCovers = 0;

	try {
		await client.query("BEGIN");

		const consoleIds = new Map<string, string>();
		for (const [index, console_] of CONSOLES.entries()) {
			const result = await client.query<{ id: string }>(
				`INSERT INTO ref_console (ll_slug, ll_name, ll_source_file, ll_platform_names, nb_sort_order)
				 VALUES ($1, $2, $3, $4, $5)
				 ON CONFLICT (ll_slug) DO UPDATE SET ll_name = EXCLUDED.ll_name
				 RETURNING id`,
				[console_.slug, console_.name, "seed-fake-catalogue.ts", [console_.name], index]
			);
			consoleIds.set(console_.slug, result.rows[0].id);
		}

		for (const game of GAMES) {
			const idConsole = consoleIds.get(game.console);
			if (!idConsole) throw new Error(`Console inconnue: ${game.console}`);

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
					game.sourceId,
					game.title,
					game.aka,
					game.description,
					game.year,
					game.genres,
					game.rating,
					game.votes,
					game.developers,
					game.publishers,
					null,
				]
			);
			const idGame = gameResult.rows[0].id;
			totalGames++;

			await client.query(`DELETE FROM ref_cover WHERE id_game = $1`, [idGame]);

			const consoleMeta = CONSOLES.find((c) => c.slug === game.console)!;
			for (const region of game.regions) {
				const regionSlug = region.toLowerCase().replace(/[^a-z0-9]+/g, "-");
				const destRelPath = `${game.console}/${idGame}/front-${regionSlug}.svg`;
				const destPath = join(PUBLIC_COVERS_DIR, destRelPath);

				mkdirSync(join(PUBLIC_COVERS_DIR, game.console, idGame), { recursive: true });
				writeFileSync(destPath, buildCoverSvg(game.title, consoleMeta.name, region, consoleMeta.color));

				await client.query(
					`INSERT INTO ref_cover (id_game, ll_cover_type, ll_region, ll_image_url)
					 VALUES ($1, 'FRONT', $2, $3)`,
					[idGame, region, `/covers/${destRelPath.replace(/\\/g, "/")}`]
				);
				totalCovers++;
			}
		}

		await client.query("COMMIT");
	} catch (error) {
		await client.query("ROLLBACK");
		console.error("Echec du seed :", error);
		throw error;
	} finally {
		client.release();
	}

	console.log(`Termine. consoles=${CONSOLES.length} jeux=${totalGames} jaquettes=${totalCovers}`);
	await pool.end();
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
