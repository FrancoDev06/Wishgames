// Sauvegarde complète de toutes les tables Supabase en JSON avant reconstruction du catalogue
// (pas de pg_dump disponible sur la machine). Aucune écriture, lecture seule.
// Usage : bun run scripts/backup-supabase.ts

import { Client } from "pg";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const OUT_DIR = join(import.meta.dir, "..", "..", "..", "backups");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outFile = join(OUT_DIR, `supabase-backup-${stamp}.json`);

const TABLES = [
	"ref_console",
	"ref_game",
	"ref_cover",
	"ref_collection",
	"ref_wishlist",
	"ref_wishlist_offer",
	"ref_console_collection",
	"ref_console_wishlist",
	"ref_console_wishlist_offer",
	"ref_activity_log",
	"ref_notification",
];

async function main() {
	if (!process.env.SUPABASE_DB_HOST || !process.env.SUPABASE_DB_USER || !process.env.SUPABASE_DB_PASSWORD) {
		throw new Error("SUPABASE_DB_HOST / SUPABASE_DB_USER / SUPABASE_DB_PASSWORD manquants — voir .env.example");
	}

	const client = new Client({
		host: process.env.SUPABASE_DB_HOST,
		port: Number(process.env.SUPABASE_DB_PORT ?? 5432),
		database: process.env.SUPABASE_DB_NAME ?? "postgres",
		user: process.env.SUPABASE_DB_USER,
		password: process.env.SUPABASE_DB_PASSWORD,
		ssl: { rejectUnauthorized: false },
	});
	await client.connect();

	const backup: Record<string, unknown[]> = {};
	for (const table of TABLES) {
		const r = await client.query(`SELECT * FROM ${table}`);
		backup[table] = r.rows;
		console.log(`${table}: ${r.rows.length} lignes`);
	}

	await client.end();

	mkdirSync(OUT_DIR, { recursive: true });
	writeFileSync(outFile, JSON.stringify(backup, null, 2), "utf-8");
	console.log(`\nSauvegarde ecrite : ${outFile}`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
