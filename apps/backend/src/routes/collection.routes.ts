import ResponsesUtil from "@utils/responses.util";
import { RDRouter } from "@utils/router.util";
import ValidationUtil, { GAME_ITEM_FIELD_SPECS } from "@utils/validation.util";
import CollectionQueries from "@queries/collection.queries";

const router: RDRouter = new RDRouter("Collection");

router.register("GET", "/", async ({ req, res }): Promise<void> => {
	const consoleSlug = typeof req.query.console === "string" ? req.query.console : undefined;
	const items = await CollectionQueries.list(consoleSlug);
	return ResponsesUtil.handleResult(res, { info: "execok", data: items });
});

router.register("GET", "/:id", async ({ req, res }): Promise<void> => {
	const item = await CollectionQueries.getById(String(req.params.id));
	if (!item) return ResponsesUtil.notFound(res);
	return ResponsesUtil.handleResult(res, { info: "execok", data: item });
});

// Ajout manuel (§6) : id_game vient du catalogue, seules les infos perso (prix/état/date) sont saisies.
router.register("POST", "/", async ({ req, res }): Promise<void> => {
	const body = req.body ?? {};
	if (!body.id_game || !body.ll_completeness || !body.ll_condition_overall) {
		return ResponsesUtil.invalidParameters(res, { id_case: "MISSING_REQUIRED_FIELDS" });
	}
	const invalidFields = ValidationUtil.invalidFields(body, GAME_ITEM_FIELD_SPECS);
	if (invalidFields.length > 0) {
		return ResponsesUtil.unprocessableEntity(res, { id_case: "INVALID_FIELD_TYPES", fields: invalidFields });
	}

	const item = await CollectionQueries.create(body);
	return ResponsesUtil.handleResult(res, { info: "execok", data: item }, 201);
});

router.register("PUT", "/:id", async ({ req, res }): Promise<void> => {
	const id = String(req.params.id);
	const existing = await CollectionQueries.getRaw(id);
	if (!existing) return ResponsesUtil.notFound(res);

	const body = req.body ?? {};
	const invalidFields = ValidationUtil.invalidFields(body, GAME_ITEM_FIELD_SPECS);
	if (invalidFields.length > 0) {
		return ResponsesUtil.unprocessableEntity(res, { id_case: "INVALID_FIELD_TYPES", fields: invalidFields });
	}

	const item = await CollectionQueries.update(id, body);
	return ResponsesUtil.handleResult(res, { info: "execok", data: item });
});

router.register("DELETE", "/:id", async ({ req, res }): Promise<void> => {
	const deleted = await CollectionQueries.delete(String(req.params.id));
	if (!deleted) return ResponsesUtil.notFound(res);
	return ResponsesUtil.handleResult(res, { info: "execok" });
});

const exported = router.wrap();
export { exported as CollectionRouter };
