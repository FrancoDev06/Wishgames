import ResponsesUtil from "@utils/responses.util";
import { RDRouter } from "@utils/router.util";
import DashboardQueries from "@queries/dashboard.queries";
import ActivityLogQueries from "@queries/activity-log.queries";
import { ActivityKind } from "@models/activity-log.model";

const router: RDRouter = new RDRouter("Dashboard");

// Stats + derniers ajoutés + accès rapides (§3.4).
router.register("GET", "/", async ({ res }): Promise<void> => {
	const [stats, recentCollection, recentWishlist] = await Promise.all([
		DashboardQueries.getStats(),
		DashboardQueries.getRecentCollection(5),
		DashboardQueries.getRecentWishlist(5),
	]);

	return ResponsesUtil.handleResult(res, {
		info: "execok",
		data: {
			...stats,
			recent_collection: recentCollection,
			recent_wishlist: recentWishlist,
		},
	});
});

// Flux d'activité paginé/filtrable (§3.4 refonte) — distinct de /activity (ref_notification,
// historique des toasts succès/erreur, sans rapport avec les mutations collection/wishlist).
router.register("GET", "/activity", async ({ req, res }): Promise<void> => {
	const kind = typeof req.query.kind === "string" ? (req.query.kind as ActivityKind) : undefined;
	const limit = Number(req.query.limit ?? 15);
	const offset = Number(req.query.offset ?? 0);

	const { rows, total } = await ActivityLogQueries.list({ kind, limit, offset });
	return ResponsesUtil.handleResult(res, { info: "execok", data: { rows, total } });
});

const exported = router.wrap();
export { exported as DashboardRouter };
