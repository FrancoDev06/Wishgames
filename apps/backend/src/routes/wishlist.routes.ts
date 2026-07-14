import ResponsesUtil from "@utils/responses.util";
import { RDRouter } from "@utils/router.util";
import WishlistQueries from "@queries/wishlist.queries";
import WishlistOfferQueries from "@queries/wishlist-offer.queries";

const router: RDRouter = new RDRouter("Wishlist");

router.register("GET", "/", async ({ req, res }): Promise<void> => {
	const consoleSlug = typeof req.query.console === "string" ? req.query.console : undefined;
	const items = await WishlistQueries.list(consoleSlug);
	return ResponsesUtil.handleResult(res, { info: "execok", data: items });
});

router.register("GET", "/:id", async ({ req, res }): Promise<void> => {
	const item = await WishlistQueries.getById(String(req.params.id));
	if (!item) return ResponsesUtil.notFound(res);
	return ResponsesUtil.handleResult(res, { info: "execok", data: item });
});

router.register("POST", "/", async ({ req, res }): Promise<void> => {
	const body = req.body ?? {};
	if (!body.id_game) {
		return ResponsesUtil.invalidParameters(res, { id_case: "MISSING_REQUIRED_FIELDS" });
	}

	const item = await WishlistQueries.create(body);
	return ResponsesUtil.handleResult(res, { info: "execok", data: item }, 201);
});

router.register("PUT", "/:id", async ({ req, res }): Promise<void> => {
	const id = String(req.params.id);
	const existing = await WishlistQueries.getRaw(id);
	if (!existing) return ResponsesUtil.notFound(res);

	const item = await WishlistQueries.update(id, req.body ?? {});
	return ResponsesUtil.handleResult(res, { info: "execok", data: item });
});

router.register("DELETE", "/:id", async ({ req, res }): Promise<void> => {
	const deleted = await WishlistQueries.delete(String(req.params.id));
	if (!deleted) return ResponsesUtil.notFound(res);
	return ResponsesUtil.handleResult(res, { info: "execok" });
});

// Bouton "Acheter" (§3.2) : saisie prix/lieu/date/état -> transfert wishlist -> collection.
router.register("POST", "/:id/buy", async ({ req, res }): Promise<void> => {
	const body = req.body ?? {};
	if (!body.ll_completeness || !body.ll_condition_overall) {
		return ResponsesUtil.invalidParameters(res, { id_case: "MISSING_REQUIRED_FIELDS" });
	}

	const item = await WishlistQueries.buy(String(req.params.id), body);
	if (!item) return ResponsesUtil.notFound(res);
	return ResponsesUtil.handleResult(res, { info: "execok", data: item }, 201);
});

// Offres multiples par jeu recherché (§3.2, ref_wishlist_offer).
router.register("GET", "/:id/offers", async ({ req, res }): Promise<void> => {
	const id = String(req.params.id);
	const wishlistItem = await WishlistQueries.getRaw(id);
	if (!wishlistItem) return ResponsesUtil.notFound(res);

	const offers = await WishlistOfferQueries.list(id);
	return ResponsesUtil.handleResult(res, { info: "execok", data: offers });
});

router.register("POST", "/:id/offers", async ({ req, res }): Promise<void> => {
	const id = String(req.params.id);
	const wishlistItem = await WishlistQueries.getRaw(id);
	if (!wishlistItem) return ResponsesUtil.notFound(res);

	const offer = await WishlistOfferQueries.create(id, req.body ?? {});
	return ResponsesUtil.handleResult(res, { info: "execok", data: offer }, 201);
});

router.register("PUT", "/offers/:offerId", async ({ req, res }): Promise<void> => {
	const offerId = String(req.params.offerId);
	const existing = await WishlistOfferQueries.getById(offerId);
	if (!existing) return ResponsesUtil.notFound(res);

	const offer = await WishlistOfferQueries.update(offerId, req.body ?? {});
	return ResponsesUtil.handleResult(res, { info: "execok", data: offer });
});

router.register("DELETE", "/offers/:offerId", async ({ req, res }): Promise<void> => {
	const deleted = await WishlistOfferQueries.delete(String(req.params.offerId));
	if (!deleted) return ResponsesUtil.notFound(res);
	return ResponsesUtil.handleResult(res, { info: "execok" });
});

const exported = router.wrap();
export { exported as WishlistRouter };
