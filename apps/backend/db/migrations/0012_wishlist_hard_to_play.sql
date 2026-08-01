-- WishGames — signal manuel "difficile à jouer" sur une entrée wishlist (retour utilisateur : un
-- jeu suivi dans plusieurs régions pour comparer les prix, ex. Adventure Island Europe/USA/Japon,
-- n'est pas forcément jouable dans toutes ces éditions — une version japonaise très textuelle
-- comme Zelda peut être injouable sans lire le japonais). Pas de détection automatique possible
-- (LaunchBox ne donne pas la langue par jeu) : simple case à cocher renseignée manuellement,
-- utilisée par la vue Prix regroupée par jeu pour prévenir avant d'acheter "la moins chère".
ALTER TABLE ref_wishlist ADD COLUMN flag_hard_to_play boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN ref_wishlist.flag_hard_to_play IS 'Coché manuellement quand cette édition régionale est difficile à jouer sans en connaître la langue (ex. Japon) — sert à ne pas recommander cette édition comme "moins chère" dans la vue Prix';
