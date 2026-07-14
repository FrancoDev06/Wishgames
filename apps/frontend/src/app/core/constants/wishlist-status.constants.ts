export type WishlistStatus = 'SEARCHING' | 'SPOTTED' | 'NEGOTIATING' | 'BOUGHT';

export interface WishlistStatusColumn {
  value: WishlistStatus;
  label: string;
  color: string;
}

// Colonnes du kanban "Chasse" (vue Wishlist, refonte §0) — ordre fixe, reflète le domaine Postgres
// wishlist_status_t (migration 0009). BOUGHT n'est jamais écrit par un déplacement de carte : le
// dépôt sur cette colonne déclenche le flux d'achat existant plutôt qu'un simple changement de
// statut (voir WishlistKanban).
export const WISHLIST_STATUS_COLUMNS: WishlistStatusColumn[] = [
  { value: 'SEARCHING', label: 'Recherché', color: '#5C7A98' },
  { value: 'SPOTTED', label: 'Repéré', color: '#D6A536' },
  { value: 'NEGOTIATING', label: 'Négociation', color: '#E0793A' },
  { value: 'BOUGHT', label: 'Acheté', color: '#2E7D5C' },
];

export function wishlistStatusLabel(value: string): string {
  return WISHLIST_STATUS_COLUMNS.find((c) => c.value === value)?.label ?? value;
}
