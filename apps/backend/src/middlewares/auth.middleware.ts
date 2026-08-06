import { Request, Response, NextFunction } from "express";
import ResponsesUtil from "@utils/responses.util";
import LogUtil from "@utils/log.util";

let warnedMissingKey = false;

// Verifie le header X-API-Key contre API_KEY (env). Si API_KEY n'est pas configure (ex: poste de
// dev sans .env a jour), la verification est desactivee avec un avertissement au demarrage plutot
// que de casser le dev local — mais tout environnement deploye DOIT definir API_KEY.
export const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction): void => {
	const expected = process.env.API_KEY;

	if (!expected) {
		if (!warnedMissingKey) {
			LogUtil.conswarn("API_KEY n'est pas definie : les routes API tournent SANS authentification.");
			warnedMissingKey = true;
		}
		return next();
	}

	if (req.header("x-api-key") !== expected) {
		ResponsesUtil.unauthorizedAction(res, { id_case: "INVALID_API_KEY" });
		return;
	}

	next();
};
