import ResponsesUtil from "@utils/responses.util";
import { RDRouter } from "@utils/router.util";
import GameQueries, { GameListFilters } from "@queries/game.queries";

const router: RDRouter = new RDRouter("Games");

const STATUS_VALUES: GameListFilters["status"][] = ["collection", "wishlist", "none"];

// Catalogue global (§3.3) : pagination au scroll, filtres console/statut/recherche.
router.register("GET", "/", async ({ req, res }): Promise<void> => {
	const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
	const offset = Math.max(Number(req.query.offset) || 0, 0);
	const consoleSlug = typeof req.query.console === "string" ? req.query.console : undefined;
	const search = typeof req.query.search === "string" ? req.query.search : undefined;
	const statusParam = typeof req.query.status === "string" ? req.query.status : undefined;
	const status = STATUS_VALUES.includes(statusParam as GameListFilters["status"])
		? (statusParam as GameListFilters["status"])
		: undefined;

	const { items, total } = await GameQueries.list({ consoleSlug, status, search, limit, offset });
	return ResponsesUtil.handleResult(res, { info: "execok", data: items, additional: { total, limit, offset } });
});

router.register("GET", "/:id", async ({ req, res }): Promise<void> => {
	const id = String(req.params.id);
	const game = await GameQueries.getById(id);
	if (!game) return ResponsesUtil.notFound(res);

	const covers = await GameQueries.getCovers(id);
	return ResponsesUtil.handleResult(res, { info: "execok", data: { ...game, covers } });
});

const exported = router.wrap();
export { exported as GamesRouter };
