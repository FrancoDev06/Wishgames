import ResponsesUtil from "@utils/responses.util";
import { RDRouter } from "@utils/router.util";
import ConsoleCollectionQueries from "@queries/console-collection.queries";
import ConsoleWishlistQueries from "@queries/console-wishlist.queries";
import ConsoleWishlistOfferQueries from "@queries/console-wishlist-offer.queries";

// Consoles physiques (§3.5) : collection et wishlist du matériel lui-même, distinct du catalogue (platforms.routes).
const router: RDRouter = new RDRouter("Consoles");

router.register("GET", "/collection", async ({ res }): Promise<void> => {
	const items = await ConsoleCollectionQueries.list();
	return ResponsesUtil.handleResult(res, { info: "execok", data: items });
});

router.register("GET", "/collection/:id", async ({ req, res }): Promise<void> => {
	const item = await ConsoleCollectionQueries.getById(String(req.params.id));
	if (!item) return ResponsesUtil.notFound(res);
	return ResponsesUtil.handleResult(res, { info: "execok", data: item });
});

router.register("POST", "/collection", async ({ req, res }): Promise<void> => {
	const body = req.body ?? {};
	if (!body.id_console || !body.ll_completeness || !body.ll_condition_overall) {
		return ResponsesUtil.invalidParameters(res, { id_case: "MISSING_REQUIRED_FIELDS" });
	}

	const item = await ConsoleCollectionQueries.create(body);
	return ResponsesUtil.handleResult(res, { info: "execok", data: item }, 201);
});

router.register("PUT", "/collection/:id", async ({ req, res }): Promise<void> => {
	const id = String(req.params.id);
	const existing = await ConsoleCollectionQueries.getRaw(id);
	if (!existing) return ResponsesUtil.notFound(res);

	const item = await ConsoleCollectionQueries.update(id, req.body ?? {});
	return ResponsesUtil.handleResult(res, { info: "execok", data: item });
});

router.register("DELETE", "/collection/:id", async ({ req, res }): Promise<void> => {
	const deleted = await ConsoleCollectionQueries.delete(String(req.params.id));
	if (!deleted) return ResponsesUtil.notFound(res);
	return ResponsesUtil.handleResult(res, { info: "execok" });
});

router.register("GET", "/wishlist", async ({ res }): Promise<void> => {
	const items = await ConsoleWishlistQueries.list();
	return ResponsesUtil.handleResult(res, { info: "execok", data: items });
});

router.register("GET", "/wishlist/:id", async ({ req, res }): Promise<void> => {
	const item = await ConsoleWishlistQueries.getById(String(req.params.id));
	if (!item) return ResponsesUtil.notFound(res);
	return ResponsesUtil.handleResult(res, { info: "execok", data: item });
});

router.register("POST", "/wishlist", async ({ req, res }): Promise<void> => {
	const body = req.body ?? {};
	if (!body.id_console) {
		return ResponsesUtil.invalidParameters(res, { id_case: "MISSING_REQUIRED_FIELDS" });
	}

	const item = await ConsoleWishlistQueries.create(body);
	return ResponsesUtil.handleResult(res, { info: "execok", data: item }, 201);
});

router.register("PUT", "/wishlist/:id", async ({ req, res }): Promise<void> => {
	const id = String(req.params.id);
	const existing = await ConsoleWishlistQueries.getRaw(id);
	if (!existing) return ResponsesUtil.notFound(res);

	const item = await ConsoleWishlistQueries.update(id, req.body ?? {});
	return ResponsesUtil.handleResult(res, { info: "execok", data: item });
});

router.register("DELETE", "/wishlist/:id", async ({ req, res }): Promise<void> => {
	const deleted = await ConsoleWishlistQueries.delete(String(req.params.id));
	if (!deleted) return ResponsesUtil.notFound(res);
	return ResponsesUtil.handleResult(res, { info: "execok" });
});

router.register("POST", "/wishlist/:id/buy", async ({ req, res }): Promise<void> => {
	const body = req.body ?? {};
	if (!body.ll_completeness || !body.ll_condition_overall) {
		return ResponsesUtil.invalidParameters(res, { id_case: "MISSING_REQUIRED_FIELDS" });
	}

	const item = await ConsoleWishlistQueries.buy(String(req.params.id), body);
	if (!item) return ResponsesUtil.notFound(res);
	return ResponsesUtil.handleResult(res, { info: "execok", data: item }, 201);
});

// Offres multiples pour une console recherchée (§3.5, ref_console_wishlist_offer), symétrique aux offres de jeux.
router.register("GET", "/wishlist/:id/offers", async ({ req, res }): Promise<void> => {
	const id = String(req.params.id);
	const wishlistItem = await ConsoleWishlistQueries.getRaw(id);
	if (!wishlistItem) return ResponsesUtil.notFound(res);

	const offers = await ConsoleWishlistOfferQueries.list(id);
	return ResponsesUtil.handleResult(res, { info: "execok", data: offers });
});

router.register("POST", "/wishlist/:id/offers", async ({ req, res }): Promise<void> => {
	const id = String(req.params.id);
	const wishlistItem = await ConsoleWishlistQueries.getRaw(id);
	if (!wishlistItem) return ResponsesUtil.notFound(res);

	const offer = await ConsoleWishlistOfferQueries.create(id, req.body ?? {});
	return ResponsesUtil.handleResult(res, { info: "execok", data: offer }, 201);
});

router.register("PUT", "/wishlist/offers/:offerId", async ({ req, res }): Promise<void> => {
	const offerId = String(req.params.offerId);
	const existing = await ConsoleWishlistOfferQueries.getById(offerId);
	if (!existing) return ResponsesUtil.notFound(res);

	const offer = await ConsoleWishlistOfferQueries.update(offerId, req.body ?? {});
	return ResponsesUtil.handleResult(res, { info: "execok", data: offer });
});

router.register("DELETE", "/wishlist/offers/:offerId", async ({ req, res }): Promise<void> => {
	const deleted = await ConsoleWishlistOfferQueries.delete(String(req.params.offerId));
	if (!deleted) return ResponsesUtil.notFound(res);
	return ResponsesUtil.handleResult(res, { info: "execok" });
});

const exported = router.wrap();
export { exported as ConsolesRouter };
