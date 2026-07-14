// Couleur associée à chaque console (§ catalogue) pour repérer rapidement la plateforme
// en un coup d'œil (bannière de carte, tuiles de la vue "par console"). Choisies pour rester
// distinctes les unes des autres et lisibles en texte blanc par-dessus.
const CONSOLE_COLORS: Record<string, string> = {
  'sony-playstation': '#2E5FA3',
  'sony-playstation-2': '#3D6FB4',
  'sony-playstation-3': '#4C7FC5',
  'sony-playstation-4': '#1C4F92',
  'nintendo-entertainment-system': '#C23B2E',
  'super-nintendo-entertainment-system': '#8B5FBF',
  'nintendo-64': '#2E7D5C',
  'nintendo-gamecube': '#6A4C93',
  'nintendo-famicom-disk-system': '#B8912A',
  'sega-genesis': '#39393D',
  'sega-saturn': '#5B5F97',
  'sega-dreamcast': '#E8722C',
  'sega-cd': '#2E8B8B',
  'sega-32x': '#8B2E2E',
  'sega-master-system': '#1F3A5F',
  'nec-turbografx-16': '#B23A48',
  'nec-turbografx-cd': '#D4574A',
};

// Repli déterministe (même slug -> même couleur) pour une console non listée ci-dessus.
const FALLBACK_PALETTE = ['#5C7A98', '#6E9B57', '#D6A536', '#E0793A', '#D9484B', '#8B5FBF'];

export function consoleColor(slug: string): string {
  const known = CONSOLE_COLORS[slug];
  if (known) return known;

  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
}
