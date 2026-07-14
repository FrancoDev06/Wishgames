// Téléchargement ponctuel des photos de consoles (refonte Wishlist §0, remplacement des tuiles
// couleur unie par de vraies photos sur Catalogue et Consoles) — curation manuelle sur Wikimedia
// Commons, licences vérifiées une à une (Domaine public ou CC BY-SA, jamais "fair use"). La quasi-
// totalité des clichés proviennent d'Evan-Amos (Vanamo Online Game Museum), qui publie ses photos
// de matériel rétro dans le domaine public — source fiable et déjà largement utilisée sur Wikipédia.
// Enregistrées en `.jpg` quelle que soit l'extension d'origine (un octet PNG servi avec l'extension
// .jpg s'affiche normalement dans un navigateur, qui détecte le vrai format au contenu) pour rester
// cohérent avec consolePhotoUrl() côté frontend, qui suppose toujours `.jpg`.
// Usage : bun run scripts/download-console-photos.ts   (exécuté depuis apps/backend)

import { mkdirSync, existsSync } from "fs";
import { join } from "path";

interface ConsolePhoto {
	url: string;
	license: string;
	source: string;
}

// Le CDN Wikimedia (upload.wikimedia.org) rate-limite agressivement (429, Retry-After 10 min) le
// téléchargement direct des fichiers originaux pleine résolution — message d'erreur explicite
// recommandant de passer par le service de miniatures à la place (voir https://w.wiki/GHai pour les
// largeurs acceptées ; 800/640/320 rejetés en pratique, 1280 fonctionne). On dérive donc l'URL de
// miniature depuis l'URL du fichier original : .../commons/H/HH/Nom.ext -> .../commons/thumb/H/HH/Nom.ext/1280px-Nom.ext
const THUMB_WIDTH = 1280;

function toThumbUrl(originalUrl: string, width: number): string {
	const marker = "/wikipedia/commons/";
	const idx = originalUrl.indexOf(marker);
	if (idx === -1) return originalUrl;

	const afterMarker = originalUrl.slice(idx + marker.length);
	const filename = afterMarker.split("/").pop()!;
	return `${originalUrl.slice(0, idx + marker.length)}thumb/${afterMarker}/${width}px-${filename}`;
}

const CONSOLE_PHOTOS: Record<string, ConsolePhoto> = {
	"sony-playstation": {
		url: "https://upload.wikimedia.org/wikipedia/commons/6/60/PlayStation-SCPH-1000-with-Controller.jpg",
		license: "Domaine public",
		source: "https://commons.wikimedia.org/wiki/File:PlayStation-SCPH-1000-with-Controller.jpg",
	},
	"sony-playstation-2": {
		url: "https://upload.wikimedia.org/wikipedia/commons/7/76/Sony-PlayStation-2-70001-Console-FL.jpg",
		license: "Domaine public",
		source: "https://commons.wikimedia.org/wiki/File:Sony-PlayStation-2-70001-Console-FL.jpg",
	},
	"sony-playstation-3": {
		url: "https://upload.wikimedia.org/wikipedia/commons/9/9d/Sony-PlayStation-3-CECHA01-Console-FL.jpg",
		license: "Domaine public",
		source: "https://commons.wikimedia.org/wiki/File:Sony-PlayStation-3-CECHA01-Console-FL.jpg",
	},
	"sony-playstation-4": {
		url: "https://upload.wikimedia.org/wikipedia/commons/5/52/Sony-PlayStation-4-PS4-Console-FL.jpg",
		license: "Domaine public",
		source: "https://commons.wikimedia.org/wiki/File:Sony-PlayStation-4-PS4-Console-FL.jpg",
	},
	"nintendo-entertainment-system": {
		url: "https://upload.wikimedia.org/wikipedia/commons/8/82/Nintendo-Entertainment-System-NES-Console-FL.jpg",
		license: "Domaine public",
		source: "https://commons.wikimedia.org/wiki/File:Nintendo-Entertainment-System-NES-Console-FL.jpg",
	},
	"super-nintendo-entertainment-system": {
		url: "https://upload.wikimedia.org/wikipedia/commons/3/31/SNES-Mod1-Console-Set.jpg",
		license: "Domaine public",
		source: "https://commons.wikimedia.org/wiki/File:SNES-Mod1-Console-Set.jpg",
	},
	"nintendo-64": {
		url: "https://upload.wikimedia.org/wikipedia/commons/8/88/Nintendo-64-Console-FL.jpg",
		license: "Domaine public",
		source: "https://commons.wikimedia.org/wiki/File:Nintendo-64-Console-FL.jpg",
	},
	"nintendo-gamecube": {
		url: "https://upload.wikimedia.org/wikipedia/commons/d/d1/GameCube-Set.jpg",
		license: "Domaine public",
		source: "https://commons.wikimedia.org/wiki/File:GameCube-Set.jpg",
	},
	"nintendo-famicom-disk-system": {
		url: "https://upload.wikimedia.org/wikipedia/commons/f/fe/Nintendo-Famicom-Disk-System.jpg",
		license: "Domaine public",
		source: "https://commons.wikimedia.org/wiki/File:Nintendo-Famicom-Disk-System.jpg",
	},
	"sega-genesis": {
		url: "https://upload.wikimedia.org/wikipedia/commons/f/f8/Sega-Genesis-3-Console-FL.jpg",
		license: "Domaine public",
		source: "https://commons.wikimedia.org/wiki/File:Sega-Genesis-3-Console-FL.jpg",
	},
	"sega-saturn": {
		url: "https://upload.wikimedia.org/wikipedia/commons/a/a8/Sega-Saturn-Console-Set-Mk1.jpg",
		license: "Domaine public",
		source: "https://commons.wikimedia.org/wiki/File:Sega-Saturn-Console-Set-Mk1.jpg",
	},
	"sega-dreamcast": {
		url: "https://upload.wikimedia.org/wikipedia/commons/8/81/Dreamcast-Console-Set.jpg",
		license: "CC BY-SA 3.0",
		source: "https://commons.wikimedia.org/wiki/File:Dreamcast-Console-Set.jpg",
	},
	"sega-cd": {
		url: "https://upload.wikimedia.org/wikipedia/commons/1/1f/Sega-CD-Model1-Set.jpg",
		license: "Domaine public",
		source: "https://commons.wikimedia.org/wiki/File:Sega-CD-Model1-Set.jpg",
	},
	"sega-32x": {
		url: "https://upload.wikimedia.org/wikipedia/commons/a/a0/Sega-Genesis-Model2-32X.jpg",
		license: "Domaine public",
		source: "https://commons.wikimedia.org/wiki/File:Sega-Genesis-Model2-32X.jpg",
	},
	"sega-master-system": {
		url: "https://upload.wikimedia.org/wikipedia/commons/8/88/Sega-Master-System-Set.jpg",
		license: "Domaine public",
		source: "https://commons.wikimedia.org/wiki/File:Sega-Master-System-Set.jpg",
	},
	"nec-turbografx-16": {
		url: "https://upload.wikimedia.org/wikipedia/commons/3/33/NEC-TurboGrafx-16-Console-FL.jpg",
		license: "Domaine public",
		source: "https://commons.wikimedia.org/wiki/File:NEC-TurboGrafx-16-Console-FL.jpg",
	},
	"nec-turbografx-cd": {
		url: "https://upload.wikimedia.org/wikipedia/commons/6/6e/NEC-TurboGrafx-16-CD-FL.png",
		license: "Domaine public",
		source: "https://commons.wikimedia.org/wiki/File:NEC-TurboGrafx-16-CD-FL.png",
	},
};

async function main(): Promise<void> {
	const outDir = join(process.cwd(), "public", "consoles");
	mkdirSync(outDir, { recursive: true });

	let ok = 0;
	let failed = 0;

	for (const [slug, photo] of Object.entries(CONSOLE_PHOTOS)) {
		const dest = join(outDir, `${slug}.jpg`);
		// Idempotent : relancer le script après une série de 429 ne re-télécharge que ce qui manque.
		if (existsSync(dest)) {
			console.log(`= ${slug} (déjà présent, ignoré)`);
			ok++;
			continue;
		}

		const thumbUrl = toThumbUrl(photo.url, THUMB_WIDTH);
		try {
			const response = await fetch(thumbUrl, {
				headers: { "User-Agent": "WishGames/1.0 (personal collection app; contact: local dev)" },
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}`);

			const bytes = await response.arrayBuffer();
			await Bun.write(dest, bytes);
			console.log(`✓ ${slug} (${photo.license}) <- ${thumbUrl}`);
			ok++;
		} catch (error) {
			console.error(`✗ ${slug} : ${(error as Error).message}`);
			failed++;
		}

		await new Promise((resolve) => setTimeout(resolve, 8000));
	}

	console.log(`\n${ok} photo(s) téléchargée(s), ${failed} échec(s).`);
	console.log("Attribution (licences non-domaine-public) :");
	for (const [slug, photo] of Object.entries(CONSOLE_PHOTOS)) {
		if (photo.license !== "Domaine public") console.log(`  - ${slug} : ${photo.license} — ${photo.source}`);
	}
}

main();
