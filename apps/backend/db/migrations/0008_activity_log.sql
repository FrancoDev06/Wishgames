-- Historique d'activité pour le Dashboard (§3.4, refonte) : jusqu'ici "Activité récente" était
-- reconstruit côté client à partir des dernières lignes collection/wishlist, sans distinction
-- ajout/modif/achat/suppression et sans trace après une suppression définitive. Cette table est
-- alimentée par l'application à chaque mutation (jeux et consoles, collection et wishlist).
--
-- Pas de FK vers ref_game/ref_console/ref_collection/ref_wishlist : les champs d'affichage sont
-- dénormalisés au moment de l'écriture pour qu'une entrée "deleted" reste affichable même une fois
-- la ligne source disparue. Table insert-only (pas de ts_update/trigger).

CREATE TABLE ref_activity_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ll_kind text NOT NULL CHECK (ll_kind IN ('collection_game', 'wishlist_game', 'collection_console', 'wishlist_console')),
    ll_action text NOT NULL CHECK (ll_action IN ('added', 'edited', 'bought', 'deleted')),
    ll_title text NOT NULL,
    ll_console_slug text NOT NULL,
    ll_console_name text NOT NULL,
    ll_cover_url text,
    nb_price numeric(10, 2),
    ts_create timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_log_ts_create ON ref_activity_log (ts_create DESC);
CREATE INDEX idx_activity_log_kind ON ref_activity_log (ll_kind);
