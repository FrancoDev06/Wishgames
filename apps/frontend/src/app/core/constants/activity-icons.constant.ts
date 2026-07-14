import { ActivityAction, ActivityKind } from '../models/dashboard.model';

// Cohérent avec les émojis déjà utilisés sur les stat tiles du Dashboard (📀⭐🎮🔍💰).
export const ACTIVITY_ACTION_ICON: Record<ActivityAction, string> = {
  added: '➕',
  edited: '✏️',
  bought: '🛒',
  deleted: '🗑️',
};

export const ACTIVITY_ACTION_LABEL: Record<ActivityAction, string> = {
  added: 'Ajouté',
  edited: 'Modifié',
  bought: 'Acheté',
  deleted: 'Supprimé',
};

export interface ActivityKindOption {
  value: ActivityKind | 'all';
  label: string;
}

export const ACTIVITY_KIND_OPTIONS: ActivityKindOption[] = [
  { value: 'all', label: 'Tout' },
  { value: 'collection_game', label: 'Collection (jeux)' },
  { value: 'wishlist_game', label: 'Wishlist (jeux)' },
  { value: 'collection_console', label: 'Collection (consoles)' },
  { value: 'wishlist_console', label: 'Wishlist (consoles)' },
];
