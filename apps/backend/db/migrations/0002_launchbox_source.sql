-- WishGames — adaptation du schéma à la nouvelle source LaunchBox Games DB (remplace MobyGames, voir §2 du cahier des charges)
-- Tables vides au moment de cette migration, aucune donnée à migrer.

ALTER TABLE ref_game RENAME COLUMN nb_moby_id TO nb_source_id;
ALTER INDEX idx_ref_game_moby_id RENAME TO idx_ref_game_source_id;

ALTER TABLE ref_game RENAME COLUMN nb_moby_score TO nb_rating;
ALTER TABLE ref_game ADD COLUMN nb_rating_votes integer;

ALTER TABLE ref_game RENAME COLUMN ll_moby_url TO ll_source_url;

COMMENT ON COLUMN ref_game.nb_source_id IS 'Identifiant du jeu dans la source LaunchBox (ex-nb_moby_id)';
COMMENT ON COLUMN ref_game.nb_rating IS 'community_rating LaunchBox (0-5), ex-nb_moby_score';
COMMENT ON COLUMN ref_game.nb_rating_votes IS 'total_votes LaunchBox associé à nb_rating';
COMMENT ON COLUMN ref_game.ll_source_url IS 'URL de la fiche LaunchBox Games DB, ex-ll_moby_url';

-- ll_group_id n'a pas d'équivalent côté LaunchBox (la région est déjà portée par ll_region)
ALTER TABLE ref_cover DROP COLUMN ll_group_id;

COMMENT ON COLUMN ref_console.ll_platform_names IS 'Libellé(s) de plateforme LaunchBox correspondants (ex-libellés MobyGames)';
