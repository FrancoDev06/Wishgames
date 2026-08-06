import { COMPLETENESS_VALUES, CONDITION_VALUES, VIDEO_STANDARD_VALUES, WISHLIST_STATUS_VALUES } from "@models/common.model";

// Validation d'entrée minimale pour les payloads des routes CRUD wishlist/collection (jeux et
// consoles) : avant ce correctif, seules les présences des champs requis étaient vérifiées
// (`if (!body.id_game)`), jamais leur type — un nb_price_paid en string ou un ll_completeness hors
// enum finissait en 500 générique (catch-all de router.util.ts) plutôt qu'en 422 explicite. Reste
// volontairement minimaliste (pas de librairie de validation externe) : quelques vérifications de
// type/enum appliquées dans les routes juste avant l'appel aux queries.
//
// Ne remplace PAS les contrôles de présence existants (`if (!body.xxx) return invalidParameters(...)`
// avec id_case MISSING_REQUIRED_FIELDS) : ceux-ci restent tels quels. `invalidFields` ne juge que les
// champs réellement présents dans le body — un champ optionnel absent ou explicitement `null` est
// toléré ici (les *.queries.ts gèrent déjà `?? null`/`?? undefined` pour ces cas).
export type FieldSpec =
	| { field: string; type: "string" }
	| { field: string; type: "number" }
	| { field: string; type: "boolean" }
	| { field: string; type: "enum"; values: readonly string[] };

export default class ValidationUtil {
	// Retourne la liste des noms de champs invalides (présents mais du mauvais type, ou enum hors
	// valeurs autorisées) — vide si tout est correct.
	static invalidFields(body: Record<string, unknown>, specs: readonly FieldSpec[]): string[] {
		const invalid: string[] = [];

		for (const spec of specs) {
			const value = body[spec.field];
			if (value === undefined || value === null) continue;

			switch (spec.type) {
				case "string":
					if (typeof value !== "string") invalid.push(spec.field);
					break;
				case "number":
					if (typeof value !== "number" || !Number.isFinite(value)) invalid.push(spec.field);
					break;
				case "boolean":
					if (typeof value !== "boolean") invalid.push(spec.field);
					break;
				case "enum":
					if (typeof value !== "string" || !spec.values.includes(value)) invalid.push(spec.field);
					break;
			}
		}

		return invalid;
	}
}

// Groupes de FieldSpec réutilisés tels quels par plusieurs routes qui partagent la même forme de
// payload (§3.2/§3.5) — évite de faire diverger silencieusement les mêmes vérifications entre
// wishlist/collection (jeux) et leurs pendants console-wishlist/console-collection.

// Champs "état/prix/lieu d'achat" communs à un jeu possédé/acheté : collection.routes.ts (POST/PUT)
// et wishlist.routes.ts (POST /:id/buy, où l'édition achetée devient une ligne ref_collection).
export const GAME_ITEM_FIELD_SPECS: readonly FieldSpec[] = [
	{ field: "ll_region", type: "string" },
	{ field: "nb_quantity", type: "number" },
	{ field: "ll_completeness", type: "enum", values: COMPLETENESS_VALUES },
	{ field: "ll_condition_overall", type: "enum", values: CONDITION_VALUES },
	{ field: "ll_condition_box", type: "enum", values: CONDITION_VALUES },
	{ field: "ll_condition_manual", type: "enum", values: CONDITION_VALUES },
	{ field: "ll_condition_media", type: "enum", values: CONDITION_VALUES },
	{ field: "ts_acquired", type: "string" },
	{ field: "nb_price_paid", type: "number" },
	{ field: "ll_purchase_location", type: "string" },
	{ field: "ll_notes", type: "string" },
];

// Champs propres à une entrée wishlist de jeu (create/update) — en plus de GAME_ITEM_FIELD_SPECS
// pour le prix/état/date lors de l'achat (POST /:id/buy).
export const WISHLIST_ENTRY_FIELD_SPECS: readonly FieldSpec[] = [
	{ field: "ts_last_checked", type: "string" },
	{ field: "ll_desired_completeness", type: "enum", values: COMPLETENESS_VALUES },
	{ field: "ll_desired_condition", type: "enum", values: CONDITION_VALUES },
	{ field: "ll_region", type: "string" },
	{ field: "nb_priority", type: "number" },
	{ field: "flag_hard_to_play", type: "boolean" },
	{ field: "ll_search_keywords", type: "string" },
	{ field: "flag_search_active", type: "boolean" },
	{ field: "ll_status", type: "enum", values: WISHLIST_STATUS_VALUES },
];

// Champs "état/prix/lieu d'achat" communs à une console possédée/achetée : consoles.routes.ts
// (POST/PUT /collection) et (POST /wishlist/:id/buy, où la console recherchée devient une ligne
// ref_console_collection). Pas de ll_condition_box/manual/media (pas de boîte/notice pour une
// console) — distinct de GAME_ITEM_FIELD_SPECS.
export const CONSOLE_ITEM_FIELD_SPECS: readonly FieldSpec[] = [
	{ field: "nb_quantity", type: "number" },
	{ field: "ll_completeness", type: "enum", values: COMPLETENESS_VALUES },
	{ field: "ll_condition_overall", type: "enum", values: CONDITION_VALUES },
	{ field: "ll_video_standard", type: "enum", values: VIDEO_STANDARD_VALUES },
	{ field: "flag_with_cables", type: "boolean" },
	{ field: "flag_with_controller", type: "boolean" },
	{ field: "ts_acquired", type: "string" },
	{ field: "nb_price_paid", type: "number" },
	{ field: "ll_purchase_location", type: "string" },
	{ field: "ll_notes", type: "string" },
];

// Champs propres à une entrée wishlist de console (create/update).
export const CONSOLE_WISHLIST_ENTRY_FIELD_SPECS: readonly FieldSpec[] = [
	{ field: "ll_desired_video_standard", type: "enum", values: VIDEO_STANDARD_VALUES },
	{ field: "ts_last_checked", type: "string" },
	{ field: "ll_status", type: "enum", values: WISHLIST_STATUS_VALUES },
];
