import LogUtil from "@utils/log.util";
import { Request, Response, NextFunction } from "express";
import datejs from "dayjs";
import utc from "dayjs/plugin/utc.js";

datejs.extend(utc);

export type ExcludeRule = string | RegExp | ((req: Request) => boolean);

export interface LogOptions {
	exclude?: ExcludeRule[];
}

const isExcluded = (req: Request, rules: LogOptions["exclude"] = []): boolean => {
	const urlPath = (req.path || req.originalUrl || "/");
	for (const rule of rules) {
		if (typeof rule === "function" && rule(req)) return true;
		if (rule instanceof RegExp && rule.test(urlPath)) return true;
		if (typeof rule === "string") {
			if (rule.endsWith("*") && urlPath.startsWith(rule.slice(0, -1))) return true;
			if (urlPath === rule) return true;
		}
	}
	return false;
};

export const logMiddleware = (options: LogOptions = {}) =>
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		if (isExcluded(req, options.exclude)) return next();

		const start = datejs.utc();
		res.on('finish', () => {
			if (!req) return;

			const end = datejs.utc();
			const duration = end.diff(start);

			LogUtil.conslog(`[RUN-${res.get('RRD-API')}] [HTTP/${req.httpVersion}] (${req.route?.path}) ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
		});
		next();
	};
