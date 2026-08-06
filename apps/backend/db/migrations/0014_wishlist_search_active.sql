-- WishGames — bascule "actif dans la recherche" par entrée wishlist, indépendante de la priorité
-- (retour utilisateur : la priorité 5/5 servait jusqu'ici de proxy pour dire "je cherche ça
-- activement", ce qui mélangeait deux notions différentes). Cochée à la main sur la carte de la
-- wishlist (vue Cartes).
--
-- Note pont bot_alerte_vinted (migration 0013) : le bot externe surveille aujourd'hui les jeux
-- priorité 4/5. Ce nouveau champ ne les remplace pas automatiquement côté bot — il faudra mettre à
-- jour bot_alerte_vinted séparément pour filtrer sur flag_search_active plutôt que sur nb_priority.
ALTER TABLE ref_wishlist ADD COLUMN flag_search_active boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN ref_wishlist.flag_search_active IS 'Recherche activement suivie (bascule manuelle sur la carte wishlist), indépendante de nb_priority.';
