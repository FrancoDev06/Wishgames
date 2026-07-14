import { Router, Request, Response, NextFunction, RequestHandler } from "express";
import ResponsesUtil from "@utils/responses.util";

type HTTPMethod = 'POST'|'PUT'|'PATCH'|'GET'|'DELETE'|'HEAD'|'ALL'|'OPTIONS'|'CONNECT';

export default class RouterUtil {

	private static _routes: Map<string, Map<string, Set<HTTPMethod>>> = new Map();

	static register(
		router: Router,
		routerName: string,
		method: HTTPMethod,
		path: string,
		call: (context: { id: string, res: Response, req: Request, next: NextFunction }) => Promise<void>,
		...middlewares: RequestHandler[]
	): void {
		const identifier = `${routerName}Router_${method}_${this._expressPathToId(path)}`;

		const lower = method.toLowerCase() as keyof Router;
		const func = (router as any)[lower]?.bind(router);
		if (typeof func !== "function")
			throw new Error(`HTTP method ${method} not supported by this Express version.`);

		func(path, ...middlewares, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
			try {
				await call({ id: identifier, res, req, next });
			} catch (error) {
				console.error(`[${identifier}] Unhandled route error!`, error);
				ResponsesUtil.somethingWentWrong(res);
			}
		});

		const perRouter = this._routes.get(routerName) ?? new Map<string, Set<HTTPMethod>>();
		const methods = perRouter.get(path) ?? new Set<HTTPMethod>();
		methods.add(method);
		perRouter.set(path, methods);
		this._routes.set(routerName, perRouter);
	}

	static wrap(router: Router, routerName: string): void {
		const perRouter = this._routes.get(routerName);
		if (!perRouter) return;

		for (const [path, methods] of perRouter) {
			const allowed = new Set<HTTPMethod>(methods);
			if (methods.has('GET')) allowed.add('HEAD');
			allowed.add('OPTIONS');

			router.options(path, (_req: Request, res: Response): void => {
				res.set('Allow', Array.from(allowed).join(', '));
				res.status(204).end();
			});

			router.all(path, (req: Request, res: Response, next: NextFunction): void => {
				if (allowed.has(req.method as HTTPMethod)) return next();

				res.set('Allow', Array.from(allowed).join(', '));
				ResponsesUtil.methodNotAllowed(res);
			});
		}
	}


	private static _expressPathToId(path: string): string {
		const input = String(path ?? "");
		const noQuery = input.split(/[?#]/, 1)[0].trim();
		const normalized = noQuery.replace(/\/+/g, "/");

		if (normalized === "" || normalized === "/") return ".root";

		const segments = normalized.split("/").filter(Boolean);
		const idSegments = segments.map((segment) => {
			if (segment === "*") return "_wildcard";

			if (segment.startsWith(":")) {
				let name = segment.slice(1);
				const cutAt = name.search(/[\(\?\+\*\s]/);
				if (cutAt !== -1) name = name.slice(0, cutAt);
				name = name.replace(/[^A-Za-z0-9_]/g, "_");
				return `_${name}`;
			}

			return segment;
		});

		return `.${idSegments.join(".")}`;
	}
}


export class RDRouter {
	private _router: Router;
	private _name: string;

	constructor(name: string) {
		this._router = Router();
		this._name = name;
	}

	public register(
		method: HTTPMethod,
		path: string,
		call: (context: { id: string, res: Response, req: Request, next: NextFunction }) => Promise<void>,
		...middlewares: RequestHandler[]
	): void {
		RouterUtil.register(this._router, this._name, method, path, call, ...middlewares);
	}

	public wrap(): Router {
		RouterUtil.wrap(this._router, this._name);
		return this._router;
	}
}
