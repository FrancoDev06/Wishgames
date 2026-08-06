-- WishGames — index manquants identifiés lors de l'audit sécurité/perf backend (2026-08) :
--
-- 1) Recherche catalogue par titre (GameQueries.list, filters.search) : la requête fait
--    `g.ll_title ILIKE '%...%'` (recherche libre, motif au milieu du texte) — un index B-tree
--    classique ne sert à rien pour ce pattern. pg_trgm + un index GIN trigram permet à Postgres
--    d'utiliser l'index même avec un `%...%` des deux côtés, essentiel une fois le catalogue à
--    plusieurs milliers de jeux (12 consoles importées à ce jour, §"Catalog rebuild").
--
-- 2) Jointures ref_game.id_console : utilisées à chaque page Catalogue/Dashboard
--    (`JOIN ref_console c ON c.id = g.id_console`, GameQueries.list/getById, DashboardQueries) —
--    id_console est une FK sans index dédié jusqu'ici (seule la PK de ref_console est indexée),
--    Postgres devait donc scanner ref_game en entier pour chaque jointure/filtre par console.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_ref_game_title_trgm ON ref_game USING gin (ll_title gin_trgm_ops);

CREATE INDEX idx_ref_game_id_console ON ref_game (id_console);
