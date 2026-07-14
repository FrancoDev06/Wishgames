import ResponsesUtil from "@utils/responses.util";
import { RDRouter } from "@utils/router.util";

const router: RDRouter = new RDRouter("Root");

router.register(`ALL`,  `/`, async ({ res }): Promise<void> => {
	return ResponsesUtil.handleResult(res, {
		info: `execok`,
		additional: `Roy Retro API v1.0.0`,
	});
});

/**
 *  Export
 */

const exported = router.wrap();
export { exported as RootRouter };
