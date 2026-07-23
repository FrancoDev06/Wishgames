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

// Régions suivies par le catalogue : une même fiche jeu peut être possédée séparément dans chacune
// de ces éditions. Le catalogue importe désormais une édition par région distincte trouvée chez
// LaunchBox (pas seulement Europe/USA/Japon — le PAL y est souvent étiqueté par pays précis), d'où
// la liste complète ci-dessous plutôt que 3 valeurs.
export const REGION_OPTIONS: OptionItem[] = [
  { value: 'Europe', label: 'Europe (PAL)' },
  { value: 'France', label: 'France (PAL)' },
  { value: 'Germany', label: 'Allemagne (PAL)' },
  { value: 'Spain', label: 'Espagne (PAL)' },
  { value: 'Italy', label: 'Italie (PAL)' },
  { value: 'United Kingdom', label: 'Royaume-Uni (PAL)' },
  { value: 'The Netherlands', label: 'Pays-Bas (PAL)' },
  { value: 'Sweden', label: 'Suède (PAL)' },
  { value: 'Norway', label: 'Norvège (PAL)' },
  { value: 'Finland', label: 'Finlande (PAL)' },
  { value: 'Greece', label: 'Grèce (PAL)' },
  { value: 'North America', label: 'USA (NTSC)' },
  { value: 'United States', label: 'États-Unis (NTSC)' },
  { value: 'Canada', label: 'Canada (NTSC)' },
  { value: 'Japan', label: 'Japon (NTSC-J)' },
  { value: 'Korea', label: 'Corée' },
  { value: 'China', label: 'Chine' },
  { value: 'Hong Kong', label: 'Hong Kong' },
  { value: 'Asia', label: 'Asie' },
  { value: 'Brazil', label: 'Brésil' },
  { value: 'South America', label: 'Amérique du Sud' },
  { value: 'Australia', label: 'Australie' },
  { value: 'Oceania', label: 'Océanie' },
  { value: 'Russia', label: 'Russie' },
  { value: 'World', label: 'Monde' },
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
