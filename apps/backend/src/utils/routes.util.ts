import cors from "cors";
import helmet from "helmet";
import { join } from "path";
import { existsSync } from "fs";
import express, { Express, Router, Request, Response, NextFunction, json, text, urlencoded } from "express";

import ResponsesUtil from "@utils/responses.util";
import { logMiddleware } from "@middlewares/log.middleware";
import { RootRouter } from "@routes/root.routes";
import { CollectionRouter } from "@routes/collection.routes";
import { PlatformsRouter } from "@routes/platforms.routes";
import { WishlistRouter } from "@routes/wishlist.routes";
import { GamesRouter } from "@routes/games.routes";
import { ConsolesRouter } from "@routes/consoles.routes";
import { ActivityRouter } from "@routes/activity.routes";
import { DashboardRouter } from "@routes/dashboard.routes";

export default class RoutesUtil {


	static async init(instance: Express): Promise<void> {
		const version = instance.get('version.short');
		const product = instance.get('product');
		const side = 'client';

		instance.use(cors());
		instance.use(json());
		instance.use(text());
		instance.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
		instance.use(urlencoded({ extended: true }));
		instance.use(logMiddleware({ exclude: [`/${product}/${side}/v${version}/livez`, `/${product}/${side}/v${version}/readyz`] }));
		instance.use('/covers', express.static(join(process.cwd(), 'public', 'covers')));
		instance.use('/console-photos', express.static(join(process.cwd(), 'public', 'consoles')));
		const add = (path: string, router: Router) => instance.use(`/${product}/${side}/v${version}/${path}`, router);

		add('', RootRouter);
		add('collection', CollectionRouter);
		add('platforms', PlatformsRouter);
		add('wishlist', WishlistRouter);
		add('games', GamesRouter);
		add('consoles', ConsolesRouter);
		add('activity', ActivityRouter);
		add('dashboard', DashboardRouter);

		// Sert le build Angular en production (déploiement cloud : backend + frontend sur un seul
		// service/origine, cf. cahier des charges §1) — en dev local ce dossier n'existe pas (le
		// frontend est servi séparément via `ng serve`), le fallback ci-dessous laisse alors la main
		// au 404 JSON existant sans rien casser.
		const frontendDist = join(process.cwd(), '..', 'frontend', 'dist', 'fronted', 'browser');
		const frontendIndex = join(frontendDist, 'index.html');
		const apiPrefix = `/${product}/${side}/v${version}`;
		instance.use(express.static(frontendDist));
		instance.get(new RegExp(`^(?!${apiPrefix}|/covers|/console-photos)`), (_req: Request, res: Response, next: NextFunction) => {
			if (!existsSync(frontendIndex)) return next();
			res.sendFile(frontendIndex);
		});

		instance.use((error: any, __: Request, res: Response, ___: NextFunction) => ResponsesUtil.somethingWentWrong(res, error instanceof SyntaxError ? { id_case: 'MISFORMED_JSON_BODY' } : {}));
		instance.use((_: Request, res: Response, __: NextFunction) => ResponsesUtil.notFound(res));
	}
}
