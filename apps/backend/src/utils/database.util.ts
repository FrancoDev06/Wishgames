import { Pool, QueryResult, types } from "pg";
import { Express } from "express";

// OID 1082 = DATE. Par défaut pg convertit les colonnes `date` en objets JS Date à minuit HEURE
// LOCALE, puis Express les sérialise en ISO UTC — sur un fuseau en avance sur UTC, ça fait reculer
// la date d'un jour à l'affichage (ex. 2026-06-01 devient 2026-05-31). On garde la chaîne "YYYY-MM-DD"
// brute renvoyée par Postgres, jamais convertie en Date : aucune conversion de fuseau possible.
types.setTypeParser(1082, (value: string) => value);

export default class DatabaseUtil {

	private static _pool: Pool | null = null;

	static async init(instance: Express): Promise<void> {
		const pool = new Pool({
			host: process.env.DB_HOST,
			port: Number(process.env.DB_PORT ?? 5432),
			database: process.env.DB_NAME,
			user: process.env.DB_USER,
			password: process.env.DB_PASSWORD,
			// Supabase (et la plupart des hébergeurs Postgres cloud) exigent SSL — le Postgres Docker
			// local n'en a pas besoin, d'où le pilotage par variable d'env plutôt qu'un true en dur.
			ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
		});

		const client = await pool.connect();
		await client.query('SELECT 1');
		client.release();

		this._pool = pool;
		instance.set('db', pool);
	}

	static get pool(): Pool {
		if (!this._pool) throw new Error("DatabaseUtil: pool not initialized — call init() first.");
		return this._pool;
	}

	static async query<T extends Record<string, any> = Record<string, any>>(
		text: string,
		values?: unknown[]
	): Promise<QueryResult<T>> {
		return this.pool.query<T>(text, values);
	}
}
