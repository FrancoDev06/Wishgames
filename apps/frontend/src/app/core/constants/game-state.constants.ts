export interface OptionItem {
  value: string;
  label: string;
}

// Vocabulaires contrôlés côté backend (DOMAIN Postgres completeness_t / condition_t, §9 du cahier des charges).
export const COMPLETENESS_OPTIONS: OptionItem[] = [
  { value: 'LOOSE', label: 'Loose' },
  { value: 'LOOSE_MANUAL', label: 'Loose + Manuel' },
  { value: 'BOXED', label: 'Boxed' },
  { value: 'CIB', label: 'CIB' },
  { value: 'SEALED', label: 'Sealed' },
  { value: 'NOS', label: 'NOS' },
];

export const CONDITION_OPTIONS: OptionItem[] = [
  { value: 'MINT', label: 'Mint' },
  { value: 'NEAR_MINT', label: 'Near Mint' },
  { value: 'EXCELLENT', label: 'Excellent' },
  { value: 'VERY_GOOD', label: 'Very Good' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'POOR', label: 'Poor' },
];

// Régions suivies par le catalogue (priorité d'import Europe -> USA -> Japon, §2bis) : une même
// fiche jeu peut désormais être possédée séparément dans chacune de ces éditions.
export const REGION_OPTIONS: OptionItem[] = [
  { value: 'Europe', label: 'Europe (PAL)' },
  { value: 'North America', label: 'USA (NTSC)' },
  { value: 'Japan', label: 'Japon (NTSC-J)' },
];

// Standard vidéo (§3.5, consoles physiques) — DOMAIN Postgres video_standard_t.
export const VIDEO_STANDARD_OPTIONS: OptionItem[] = [
  { value: 'NTSC', label: 'NTSC' },
  { value: 'PAL', label: 'PAL' },
  { value: 'SECAM', label: 'SECAM' },
];

export function videoStandardLabel(value: string | null): string {
  if (!value) return 'Non précisé';
  return VIDEO_STANDARD_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function completenessLabel(value: string): string {
  return COMPLETENESS_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function conditionLabel(value: string): string {
  return CONDITION_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function regionLabel(value: string | null): string {
  if (!value) return 'Région non précisée';
  return REGION_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

// Libellé court (sans le standard vidéo entre parenthèses) — utilisé pour lister plusieurs régions
// possédées en peu d'espace (ex. badge "En collection (Europe, USA)" du Catalogue).
const REGION_SHORT_LABELS: Record<string, string> = {
  Europe: 'Europe',
  'North America': 'USA',
  Japan: 'Japon',
};

export function regionShortLabel(value: string): string {
  return REGION_SHORT_LABELS[value] ?? value;
}

// ---------- Couleurs par valeur (badges Collection/Wishlist) ----------
// Retour utilisateur : les badges complétude/état avaient tous la même couleur fixe par
// catégorie (ex. complétude toujours cyan), peu importe la valeur — impossible de repérer un
// jeu loose vs complet en un coup d'œil. Chaque échelle est ordonnée du moins au plus
// désirable ; les régions sont catégorielles (pas d'ordre), une couleur distincte chacune.

const COMPLETENESS_COLORS: Record<string, string> = {
  LOOSE: '#6b7280',
  LOOSE_MANUAL: '#5c8a99',
  BOXED: '#4f8ea3',
  CIB: '#3fae8a',
  SEALED: '#d6a536',
  NOS: '#e0793a',
};

export function completenessColor(value: string): string {
  return COMPLETENESS_COLORS[value] ?? '#6b7280';
}

const CONDITION_COLORS: Record<string, string> = {
  POOR: '#d9484b',
  FAIR: '#e0793a',
  GOOD: '#d6a536',
  VERY_GOOD: '#a3c15a',
  EXCELLENT: '#6e9b57',
  NEAR_MINT: '#3fae8a',
  MINT: '#67e8f9',
};

export function conditionColor(value: string): string {
  return CONDITION_COLORS[value] ?? '#8a8b8e';
}

const REGION_COLORS: Record<string, string> = {
  Europe: '#5b8cff',
  'North America': '#e0546a',
  Japan: '#f4a640',
};

export function regionColor(value: string | null): string {
  if (!value) return '#8a8b8e';
  return REGION_COLORS[value] ?? '#8a8b8e';
}

// Quel composant physique demander selon la complétude choisie (§3.1) : le jeu (média) est
// toujours pertinent ; la boîte et la notice ne le sont que si la complétude les inclut. Partagé
// entre CollectionFormModal (ajout/achat) et OffersPanel (état constaté sur une offre précise).
const BOX_COMPLETENESS = new Set(['BOXED', 'CIB', 'SEALED', 'NOS']);
const MANUAL_COMPLETENESS = new Set(['LOOSE_MANUAL', 'CIB', 'SEALED', 'NOS']);

export function showBoxCondition(completeness: string): boolean {
  return BOX_COMPLETENESS.has(completeness);
}

export function showManualCondition(completeness: string): boolean {
  return MANUAL_COMPLETENESS.has(completeness);
}
