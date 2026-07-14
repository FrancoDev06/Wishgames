-- WishGames — schéma initial (réconcilié avec collect_play_db existant, voir §9 du cahier des charges)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION fn_set_ts_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.ts_update = NOW();
    RETURN NEW;
END;
$$;

-- Vocabulaires contrôlés (domains plutôt que tables lov_* : pas de besoin de navigation/admin dessus)
CREATE DOMAIN completeness_t AS text CHECK (VALUE IN ('LOOSE', 'LOOSE_MANUAL', 'BOXED', 'CIB', 'SEALED', 'NOS'));
CREATE DOMAIN condition_t AS text CHECK (VALUE IN ('MINT', 'NEAR_MINT', 'EXCELLENT', 'VERY_GOOD', 'GOOD', 'FAIR', 'POOR'));
CREATE DOMAIN video_standard_t AS text CHECK (VALUE IN ('NTSC', 'PAL', 'SECAM'));

-- Consoles (les 16 consoles scrapées)
CREATE TABLE ref_console (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ll_slug text NOT NULL UNIQUE,               -- ex: "genesis", "snes"
    ll_name text NOT NULL,                      -- nom affiché, ex: "Sega Genesis"
    ll_source_file text NOT NULL,               -- fichier JSON source, ex: "genesis.json"
    ll_platform_names text[] NOT NULL DEFAULT '{}', -- libellés MobyGames correspondants (§2bis)
    nb_sort_order integer NOT NULL DEFAULT 0,
    ts_create timestamptz NOT NULL DEFAULT now(),
    ts_update timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_ref_console_ts_update BEFORE UPDATE ON ref_console
    FOR EACH ROW EXECUTE FUNCTION fn_set_ts_update();

-- Jeux : une ligne par (console, moby_id) — les portages sont ignorés (§2bis)
CREATE TABLE ref_game (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_console uuid NOT NULL REFERENCES ref_console(id),
    nb_moby_id integer NOT NULL,
    ll_title text NOT NULL,
    ll_aka_titles text[] NOT NULL DEFAULT '{}',
    ll_description text,
    nb_release_year integer,
    ll_genres text[] NOT NULL DEFAULT '{}',
    ll_gameplay text[] NOT NULL DEFAULT '{}',
    ll_perspective text[] NOT NULL DEFAULT '{}',
    ll_visual text[] NOT NULL DEFAULT '{}',
    ll_setting text[] NOT NULL DEFAULT '{}',
    nb_moby_score numeric(4, 2),
    ll_developers text[] NOT NULL DEFAULT '{}',
    ll_publishers text[] NOT NULL DEFAULT '{}',
    ll_moby_url text,
    ts_create timestamptz NOT NULL DEFAULT now(),
    ts_update timestamptz NOT NULL DEFAULT now(),
    UNIQUE (id_console, nb_moby_id)
);
CREATE INDEX idx_ref_game_moby_id ON ref_game (nb_moby_id);
CREATE INDEX idx_ref_game_release_year ON ref_game (nb_release_year);
CREATE TRIGGER trg_ref_game_ts_update BEFORE UPDATE ON ref_game
    FOR EACH ROW EXECUTE FUNCTION fn_set_ts_update();

-- Jaquettes : une édition/région déjà figée à l'import (PAL → USA → Japon, §2bis), un type par jeu
CREATE TABLE ref_cover (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_game uuid NOT NULL REFERENCES ref_game(id),
    ll_cover_type text NOT NULL CHECK (ll_cover_type IN ('FRONT', 'BACK', 'MANUAL_FRONT', 'MANUAL_BACK', 'MEDIA', 'SPINE')),
    ll_group_id text,                           -- group_id MobyGames retenu (traçabilité)
    ll_region text,                             -- libellé région si connu, ex: "Europe", "USA", "Japan"
    ll_image_url text NOT NULL,
    ts_create timestamptz NOT NULL DEFAULT now(),
    ts_update timestamptz NOT NULL DEFAULT now(),
    UNIQUE (id_game, ll_cover_type)
);
CREATE TRIGGER trg_ref_cover_ts_update BEFORE UPDATE ON ref_cover
    FOR EACH ROW EXECUTE FUNCTION fn_set_ts_update();

-- Collection de jeux (mono-utilisateur, §1)
CREATE TABLE ref_collection (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_game uuid NOT NULL UNIQUE REFERENCES ref_game(id),
    nb_quantity integer NOT NULL DEFAULT 1,
    ll_completeness completeness_t NOT NULL,
    ll_condition_overall condition_t NOT NULL,
    ll_condition_box condition_t,
    ll_condition_manual condition_t,
    ll_condition_media condition_t,
    ts_acquired date,
    nb_price_paid numeric(10, 2),
    ll_purchase_location text,
    ll_notes text,
    ts_create timestamptz NOT NULL DEFAULT now(),
    ts_update timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_ref_collection_ts_update BEFORE UPDATE ON ref_collection
    FOR EACH ROW EXECUTE FUNCTION fn_set_ts_update();

-- Wishlist de jeux : un jeu est soit en collection, soit en wishlist (§3.2)
CREATE TABLE ref_wishlist (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_game uuid NOT NULL UNIQUE REFERENCES ref_game(id),
    ts_last_checked date,
    ll_desired_completeness completeness_t,
    ll_desired_condition condition_t,
    ts_create timestamptz NOT NULL DEFAULT now(),
    ts_update timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_ref_wishlist_ts_update BEFORE UPDATE ON ref_wishlist
    FOR EACH ROW EXECUTE FUNCTION fn_set_ts_update();

-- Plusieurs offres suivies en parallèle pour un même jeu recherché
CREATE TABLE ref_wishlist_offer (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_wishlist uuid NOT NULL REFERENCES ref_wishlist(id),
    nb_price numeric(10, 2),
    ll_source_label text,
    ll_source_url text,
    ts_create timestamptz NOT NULL DEFAULT now(),
    ts_update timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ref_wishlist_offer_wishlist ON ref_wishlist_offer (id_wishlist);
CREATE TRIGGER trg_ref_wishlist_offer_ts_update BEFORE UPDATE ON ref_wishlist_offer
    FOR EACH ROW EXECUTE FUNCTION fn_set_ts_update();

-- Consoles physiques possédées
CREATE TABLE ref_console_collection (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_console uuid NOT NULL UNIQUE REFERENCES ref_console(id),
    nb_quantity integer NOT NULL DEFAULT 1,
    ll_completeness completeness_t NOT NULL,
    ll_condition_overall condition_t NOT NULL,
    ll_video_standard video_standard_t,
    flag_with_cables boolean NOT NULL DEFAULT false,
    flag_with_controller boolean NOT NULL DEFAULT false,
    ts_acquired date,
    nb_price_paid numeric(10, 2),
    ll_purchase_location text,
    ll_notes text,
    ts_create timestamptz NOT NULL DEFAULT now(),
    ts_update timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_ref_console_collection_ts_update BEFORE UPDATE ON ref_console_collection
    FOR EACH ROW EXECUTE FUNCTION fn_set_ts_update();

-- Consoles physiques recherchées
CREATE TABLE ref_console_wishlist (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_console uuid NOT NULL UNIQUE REFERENCES ref_console(id),
    ll_desired_video_standard video_standard_t,
    ts_last_checked date,
    ts_create timestamptz NOT NULL DEFAULT now(),
    ts_update timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_ref_console_wishlist_ts_update BEFORE UPDATE ON ref_console_wishlist
    FOR EACH ROW EXECUTE FUNCTION fn_set_ts_update();

-- Notifications internes, historique 30 jours glissants (§4) — purge à faire via job/requête planifiée
CREATE TABLE ref_notification (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ll_type text NOT NULL CHECK (ll_type IN ('SUCCESS', 'ERROR')),
    ll_message text NOT NULL,
    ts_create timestamptz NOT NULL DEFAULT now()
);
