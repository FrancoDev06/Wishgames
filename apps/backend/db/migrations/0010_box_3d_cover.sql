-- WishGames — jaquettes "3D" (rendu boîtier en volume, media LaunchBox "Box - 3D") en plus des
-- jaquettes plates existantes (FRONT) : retour utilisateur, le rendu 3D est ce qu'on veut voir par
-- défaut sur les cartes Catalogue plutôt que le scan plat.

ALTER TABLE ref_cover DROP CONSTRAINT ref_cover_ll_cover_type_check;
ALTER TABLE ref_cover ADD CONSTRAINT ref_cover_ll_cover_type_check
	CHECK (ll_cover_type IN ('FRONT', 'BACK', 'MANUAL_FRONT', 'MANUAL_BACK', 'MEDIA', 'SPINE', 'BOX_3D'));
