// Tableaux de valeurs exposés (en plus des types) pour permettre une vérification à l'exécution
// (ValidationUtil.invalidFields) des enums envoyés dans les payloads des routes — les `as const`
// gardent les types littéraux ci-dessous strictement identiques à avant.
export const COMPLETENESS_VALUES = ["LOOSE", "LOOSE_MANUAL", "BOXED", "CIB", "SEALED", "NOS"] as const;
export type Completeness = (typeof COMPLETENESS_VALUES)[number];

export const CONDITION_VALUES = ["MINT", "NEAR_MINT", "EXCELLENT", "VERY_GOOD", "GOOD", "FAIR", "POOR"] as const;
export type Condition = (typeof CONDITION_VALUES)[number];

export const VIDEO_STANDARD_VALUES = ["NTSC", "PAL", "SECAM"] as const;
export type VideoStandard = (typeof VIDEO_STANDARD_VALUES)[number];

export const WISHLIST_STATUS_VALUES = ["SEARCHING", "SPOTTED", "NEGOTIATING", "BOUGHT"] as const;
export type WishlistStatus = (typeof WISHLIST_STATUS_VALUES)[number];
