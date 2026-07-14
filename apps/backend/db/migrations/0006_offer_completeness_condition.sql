-- WishGames — précision complétude/état par offre (§3.2/§3.5, retour utilisateur : ex. "50€ sur
-- Vinted, complet boîte et jeu bon état et notice très bon état"), en plus de l'annotation libre
-- (ll_notes, migration 0005). Tous les champs restent optionnels, comme le reste d'une offre.

ALTER TABLE ref_wishlist_offer
    ADD COLUMN ll_completeness completeness_t,
    ADD COLUMN ll_condition_media condition_t,
    ADD COLUMN ll_condition_box condition_t,
    ADD COLUMN ll_condition_manual condition_t;

ALTER TABLE ref_console_wishlist_offer
    ADD COLUMN ll_completeness completeness_t,
    ADD COLUMN ll_condition_overall condition_t;
