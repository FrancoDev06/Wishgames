-- WishGames — statut de recherche pour la vue "Chasse" (kanban avec glisser-déposer), sur les
-- wishlists jeux et consoles (refonte Wishlist, cf. cahier des charges §0). "BOUGHT" reste dans le
-- domaine pour la complétude du vocabulaire, mais n'est jamais écrit par un simple déplacement de
-- carte : le dépôt sur cette colonne déclenche le flux d'achat existant (transfert vers
-- ref_collection/ref_console_collection), qui supprime la ligne de la wishlist avant qu'un statut
-- "BOUGHT" n'ait besoin d'être persisté.

CREATE DOMAIN wishlist_status_t AS text CHECK (VALUE IN ('SEARCHING', 'SPOTTED', 'NEGOTIATING', 'BOUGHT'));

ALTER TABLE ref_wishlist
    ADD COLUMN ll_status wishlist_status_t NOT NULL DEFAULT 'SEARCHING';
COMMENT ON COLUMN ref_wishlist.ll_status IS 'Étape de recherche (vue Chasse / kanban) : SEARCHING, SPOTTED, NEGOTIATING, BOUGHT.';

ALTER TABLE ref_console_wishlist
    ADD COLUMN ll_status wishlist_status_t NOT NULL DEFAULT 'SEARCHING';
COMMENT ON COLUMN ref_console_wishlist.ll_status IS 'Étape de recherche (vue Chasse / kanban) : SEARCHING, SPOTTED, NEGOTIATING, BOUGHT.';
