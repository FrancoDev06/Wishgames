import { Response } from "express";
import ErrorsUtil from "./errors.util";
import { RequestReturn } from "./interfaces/return.interfaces";

export default class ResponsesUtil {

	static unauthorizedAction(res: Response, additional: any = {}): void {
		ResponsesUtil.handleResult(res, ErrorsUtil._401(additional), 401);
	}

	static notFound(res: Response, additional: any = {}): void {
		ResponsesUtil.handleResult(res, ErrorsUtil._404(additional), 404);
	}

	static methodNotAllowed(res: Response, additional: any = {}): void {
		ResponsesUtil.handleResult(res, ErrorsUtil._405(additional), 405);
	}

	static invalidParameters(res: Response, additional: any = {}): void {
		ResponsesUtil.handleResult(res, ErrorsUtil._412(additional), 412);
	}

	static unprocessableEntity(res: Response, additional: any = {}): void {
		ResponsesUtil.handleResult(res, ErrorsUtil._422(additional), 422);
	}

	static tooManyRequest(res: Response, additional: any = {}): void {
		ResponsesUtil.handleResult(res, ErrorsUtil._429(additional), 429);
	}

	static somethingWentWrong(res: Response, additional: any = {}): void {
		ResponsesUtil.handleResult(res, ErrorsUtil._500(additional), 500);
	}

	static serviceUnavailable(res: Response, additional: any = {}): void {
		ResponsesUtil.handleResult(res, ErrorsUtil._503(additional), 503);
	}

	static handleResult<T>(res: Response, data: RequestReturn<T>, code: number = 200): void {
		res.status(code).json(data);
	}
}
