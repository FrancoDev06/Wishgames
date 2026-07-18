-- WishGames — wishlist multi-region, meme logique que la collection (migration 0004) : plusieurs
-- entrees wishlist pour le meme jeu, une par edition regionale suivie separement (ex. vouloir a la
-- fois la version USA et la version Japon de 1942). Avant : une seule entree par jeu avec une liste
-- de regions acceptees (comparer les offres entre regions, prendre la moins chere) — retour
-- utilisateur, ce n'est pas l'usage voulu ; on veut pouvoir suivre chaque edition separement, comme
-- pour la collection.

ALTER TABLE ref_wishlist ADD COLUMN ll_region text;

-- Backfill : une seule region acceptee -> devient LA region ciblee de la ligne existante. Zero ou
-- plusieurs regions acceptees ("peu importe" / "l'une des deux") -> pas de region precise (NULL),
-- la lecture la plus proche du sens d'origine sans dupliquer arbitrairement des lignes.
UPDATE ref_wishlist SET ll_region = ll_desired_regions[1] WHERE array_length(ll_desired_regions, 1) = 1;

ALTER TABLE ref_wishlist DROP CONSTRAINT ref_wishlist_id_game_key;
ALTER TABLE ref_wishlist ADD CONSTRAINT ref_wishlist_id_game_ll_region_key UNIQUE (id_game, ll_region);

ALTER TABLE ref_wishlist DROP COLUMN ll_desired_regions;

COMMENT ON COLUMN ref_wishlist.ll_region IS 'Region de l''edition recherchee (ex. Europe/North America/Japan) — permet plusieurs lignes pour le meme jeu, une par region suivie separement, comme ref_collection.ll_region';
