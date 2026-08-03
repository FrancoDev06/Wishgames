// Les clés d'un payload JS (Object.keys) ne doivent jamais être interpolées brutes comme noms de
// colonnes SQL — une clé arbitraire dans le body d'une requête PUT deviendrait alors un fragment
// SQL non contrôlé. Ce helper filtre le payload contre une whitelist de colonnes réelles avant de
// construire la clause SET, pour tous les update() de type "column = value" des *.queries.ts.
export default class QueryBuilderUtil {
	static buildSetClause<T extends object>(
		payload: T,
		allowedFields: readonly (keyof T)[],
		startIndex = 2
	): { clause: string; values: unknown[] } {
		const fields = (Object.keys(payload) as (keyof T)[]).filter((field) => allowedFields.includes(field));
		const clause = fields.map((field, i) => `${String(field)} = $${i + startIndex}`).join(", ");
		const values = fields.map((field) => payload[field]);
		return { clause, values };
	}
}
