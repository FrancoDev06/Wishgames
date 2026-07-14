-- WishGames — annotation libre par offre (ex. "complet en boîte", vu sur Leboncoin, §3.2) et suivi
-- d'offres multiples pour la wishlist de consoles (§3.5), symétrique à ref_wishlist_offer côté jeux.

ALTER TABLE ref_wishlist_offer ADD COLUMN ll_notes text;
COMMENT ON COLUMN ref_wishlist_offer.ll_notes IS 'Annotation libre sur cette offre précise (ex. "complet en boîte", état constaté) — distinct des critères de recherche globaux du jeu';

CREATE TABLE ref_console_wishlist_offer (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_console_wishlist uuid NOT NULL REFERENCES ref_console_wishlist(id),
    nb_price numeric(10, 2),
    ll_source_label text,
    ll_source_url text,
    ll_notes text,
    ts_create timestamptz NOT NULL DEFAULT now(),
    ts_update timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ref_console_wishlist_offer_wishlist ON ref_console_wishlist_offer (id_console_wishlist);
CREATE TRIGGER trg_ref_console_wishlist_offer_ts_update BEFORE UPDATE ON ref_console_wishlist_offer
    FOR EACH ROW EXECUTE FUNCTION fn_set_ts_update();
