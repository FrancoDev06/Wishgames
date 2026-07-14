-- WishGames — ajout région(s) désirée(s) + priorité sur ref_wishlist (import wishlist Excel, voir cahier des charges §2/§3.2)
-- Décision : une seule entrée wishlist par jeu (pas une par région), avec les régions acceptées listées,
-- pour pouvoir ensuite comparer plusieurs offres entre régions via ref_wishlist_offer et prendre la moins chère.

ALTER TABLE ref_wishlist ADD COLUMN ll_desired_regions text[] NOT NULL DEFAULT '{}';
ALTER TABLE ref_wishlist ADD COLUMN nb_priority integer CHECK (nb_priority BETWEEN 1 AND 5);

COMMENT ON COLUMN ref_wishlist.ll_desired_regions IS 'Régions acceptées pour ce jeu (ex. USA/EU/JAPON) — on cherche la meilleure offre parmi ces régions';
COMMENT ON COLUMN ref_wishlist.nb_priority IS 'Priorité de recherche 1 (faible) à 5 (haute), reprise du fichier wishlist Excel';
