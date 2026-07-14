-- Suppression d'un item wishlist/console_wishlist ayant des offres échouait (violation FK) :
-- ref_wishlist_offer / ref_console_wishlist_offer référençaient sans ON DELETE CASCADE.
-- Les offres sont des données subordonnées à l'item recherché, elles doivent disparaître avec lui.

ALTER TABLE ref_wishlist_offer
    DROP CONSTRAINT ref_wishlist_offer_id_wishlist_fkey,
    ADD CONSTRAINT ref_wishlist_offer_id_wishlist_fkey
        FOREIGN KEY (id_wishlist) REFERENCES ref_wishlist(id) ON DELETE CASCADE;

ALTER TABLE ref_console_wishlist_offer
    DROP CONSTRAINT ref_console_wishlist_offer_id_console_wishlist_fkey,
    ADD CONSTRAINT ref_console_wishlist_offer_id_console_wishlist_fkey
        FOREIGN KEY (id_console_wishlist) REFERENCES ref_console_wishlist(id) ON DELETE CASCADE;
