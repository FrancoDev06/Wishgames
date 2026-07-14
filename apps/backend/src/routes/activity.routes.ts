import ResponsesUtil from "@utils/responses.util";
import { RDRouter } from "@utils/router.util";
import NotificationQueries from "@queries/notification.queries";
import { NotificationType } from "@models/notification.model";

const router: RDRouter = new RDRouter("Activity");

const NOTIFICATION_TYPES: NotificationType[] = ["SUCCESS", "ERROR"];

// Notifications internes éphémères, 30 jours glissants (§4) — pas de journal d'activité persistant.
router.register("GET", "/", async ({ res }): Promise<void> => {
	const notifications = await NotificationQueries.listRecent();
	return ResponsesUtil.handleResult(res, { info: "execok", data: notifications });
});

router.register("POST", "/", async ({ req, res }): Promise<void> => {
	const body = req.body ?? {};
	if (!NOTIFICATION_TYPES.includes(body.ll_type) || !body.ll_message) {
		return ResponsesUtil.invalidParameters(res, { id_case: "MISSING_REQUIRED_FIELDS" });
	}

	const notification = await NotificationQueries.create(body.ll_type, body.ll_message);
	return ResponsesUtil.handleResult(res, { info: "execok", data: notification }, 201);
});

router.register("DELETE", "/:id", async ({ req, res }): Promise<void> => {
	const deleted = await NotificationQueries.delete(String(req.params.id));
	if (!deleted) return ResponsesUtil.notFound(res);
	return ResponsesUtil.handleResult(res, { info: "execok" });
});

const exported = router.wrap();
export { exported as ActivityRouter };
