-- WishGames — mots-clés de recherche Vinted par entrée wishlist (pont avec le bot d'alerte
-- externe bot_alerte_vinted). Renseignés à la main, jamais devinés automatiquement : le bot lit
-- ce champ via l'API pour construire ses recherches (priorité 4/5 uniquement), vide = il retombe
-- sur le titre du jeu tel quel.
ALTER TABLE ref_wishlist ADD COLUMN ll_search_keywords text;

COMMENT ON COLUMN ref_wishlist.ll_search_keywords IS 'Mots-clés de recherche Vinted (séparés par des virgules), saisis manuellement — utilisés par le bot d''alerte externe pour les jeux priorité 4/5. Vide = le bot utilise le titre du jeu.';
