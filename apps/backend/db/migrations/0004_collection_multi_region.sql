-- WishGames — suivi de plusieurs éditions régionales du même jeu (ex. Crash Bandicoot PAL + USA + Japon
-- possédés séparément), suite à la découverte que LaunchBox n'a qu'une seule fiche jeu par (console,
-- source_id) avec les jaquettes de toutes les régions groupées dedans (voir §2/§2bis du cahier des charges).

-- ref_cover : une jaquette par (jeu, type, région) au lieu d'une seule région choisie à l'import
-- (priorité PAL -> USA -> Japon). Permet de conserver toutes les régions disponibles.
ALTER TABLE ref_cover DROP CONSTRAINT ref_cover_id_game_ll_cover_type_key;
ALTER TABLE ref_cover ADD CONSTRAINT ref_cover_id_game_ll_cover_type_ll_region_key UNIQUE (id_game, ll_cover_type, ll_region);

-- ref_collection : plusieurs exemplaires du même jeu possibles, un par région suivie (chacun avec
-- son propre état/prix/notes). nb_quantity reste pertinent pour plusieurs copies d'une même région.
ALTER TABLE ref_collection DROP CONSTRAINT ref_collection_id_game_key;
ALTER TABLE ref_collection ADD COLUMN ll_region text;
ALTER TABLE ref_collection ADD CONSTRAINT ref_collection_id_game_ll_region_key UNIQUE (id_game, ll_region);

COMMENT ON COLUMN ref_collection.ll_region IS 'Région de l''édition possédée (ex. Europe/North America/Japan) — permet plusieurs lignes pour le même jeu, une par région suivie séparément';
