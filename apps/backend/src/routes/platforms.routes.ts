import ResponsesUtil from "@utils/responses.util";
import { RDRouter } from "@utils/router.util";
import ConsoleQueries from "@queries/console.queries";

const router: RDRouter = new RDRouter("Platforms");

// Liste des consoles/plateformes du catalogue (avec compte de jeux) — sert à construire
// l'arborescence console -> jeux en collection/wishlist/catalogue (§3.1/§3.3).
router.register("GET", "/", async ({ res }): Promise<void> => {
	const consoles = await ConsoleQueries.list();
	return ResponsesUtil.handleResult(res, { info: "execok", data: consoles });
});

router.register("GET", "/:slug", async ({ req, res }): Promise<void> => {
	const console_ = await ConsoleQueries.getBySlug(String(req.params.slug));
	if (!console_) return ResponsesUtil.notFound(res);
	return ResponsesUtil.handleResult(res, { info: "execok", data: console_ });
});

const exported = router.wrap();
export { exported as PlatformsRouter };
