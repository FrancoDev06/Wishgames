// Fragment SQL partagé entre WishlistQueries.SELECT_WITH_GAME et CollectionQueries.SELECT_WITH_GAME :
// sélection de la jaquette d'un jeu en fonction de la région de la ligne courante (wishlist ou
// collection), avec repli sur la priorité Europe -> USA -> Japon habituelle (§2bis) quand cette
// région précise n'a pas de jaquette. Le rendu 3D (BOX_3D, migration 0010) est préféré au scan plat
// (FRONT) une fois la région choisie — même logique que GameQueries.COVER_JOIN pour le Catalogue.
//
// `mainAlias` est l'alias SQL, dans la requête appelante, de la table dont la colonne ll_region sert
// de région de référence (`wl` pour ref_wishlist, `col` pour ref_collection) — la requête appelante
// doit par ailleurs déjà exposer un alias `g` pour ref_game (jointure sur g.id).
export function gameCoverJoin(mainAlias: string): string {
	return `
	LEFT JOIN LATERAL (
		SELECT ll_image_url
		FROM ref_cover c2
		WHERE c2.id_game = g.id AND c2.ll_cover_type IN ('FRONT', 'BOX_3D')
		ORDER BY
			CASE WHEN c2.ll_region = ${mainAlias}.ll_region THEN 0 ELSE 1 END,
			CASE c2.ll_region WHEN 'Europe' THEN 1 WHEN 'North America' THEN 2 WHEN 'Japan' THEN 3 ELSE 4 END,
			CASE WHEN c2.ll_cover_type = 'BOX_3D' THEN 0 ELSE 1 END
		LIMIT 1
	) cov ON true
	`;
}
