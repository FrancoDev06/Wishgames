// Pas de garantie que la photo existe (consolePhotoUrl construit toujours une URL) : si elle
// 404, on la masque pour laisser voir le fond coloré derrière plutôt que l'icône d'image cassée.
export function hidePhoto(event: Event): void {
  (event.target as HTMLImageElement).style.visibility = 'hidden';
}
