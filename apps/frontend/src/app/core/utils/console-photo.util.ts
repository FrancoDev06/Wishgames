// Photos consoles (refonte Wishlist §0, remplacement des tuiles couleur unie) — servies localement
// depuis apps/backend/public/consoles/<slug>.jpg (téléchargées depuis Wikimedia Commons via
// scripts/download-console-photos.ts), même mécanique que resolveCoverUrl pour les jaquettes.
// Pas de garantie qu'un slug ait une photo (curation manuelle, §8) : l'appelant doit garder
// consoleColor() comme repli visuel (background-color sous le background-image) si l'image 404.
export function consolePhotoUrl(slug: string, apiOrigin: string): string {
  return `${apiOrigin}/console-photos/${slug}.jpg`;
}
