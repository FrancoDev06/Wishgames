import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { join } from "path";
import { existsSync } from "fs";
import express, { Express, Router, Request, Response, NextFunction, json, text, urlencoded } from "express";

import ResponsesUtil from "@utils/responses.util";
import { logMiddleware } from "@middlewares/log.middleware";
import { apiKeyMiddleware } from "@middlewares/auth.middleware";
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

		// En prod le frontend est servi depuis la meme origine (voir plus bas) : aucune origine
		// cross-origin n'a besoin d'etre autorisee. CORS_ORIGIN ne sert qu'au dev local, ou `ng serve`
		// (port 4200) appelle ce backend (port 6001) en cross-origin.
		const corsOrigin = process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? false : 'http://localhost:4200');
		instance.use(cors({ origin: corsOrigin }));
		instance.use(json());
		instance.use(text());
		// CSP desactivee : le build Angular utilise un <script> inline pour appliquer le theme
		// avant bootstrap et un onload inline pour charger styles-*.css en non-bloquant (technique
		// "media=print puis all") — la CSP par defaut d'helmet (script-src 'self', script-src-attr
		// 'none') bloque ces deux inline, ce qui casse le theme et l'affichage du CSS.
		instance.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "cross-origin" } }));
		instance.use(urlencoded({ extended: true }));
		instance.use(logMiddleware({ exclude: [`/${product}/${side}/v${version}/livez`, `/${product}/${side}/v${version}/readyz`] }));
		instance.use('/covers', express.static(join(process.cwd(), 'public', 'covers')));
		instance.use('/console-photos', express.static(join(process.cwd(), 'public', 'consoles')));

		// Rate limiting généreux : app mono-utilisateur (§1), sert de garde-fou contre un bug client qui
		// boucle ou un abus depuis une IP plutot que d'une vraie protection anti-bruteforce multi-
		// utilisateurs. Uniquement sur les routes API protegees par API_KEY (meme perimetre que
		// apiKeyMiddleware ci-dessous) : le RootRouter public reste exempte pour ne pas gener les health
		// checks de l'hebergeur (Render), qui peuvent sonder frequemment.
		const apiRateLimiter = rateLimit({
			windowMs: 15 * 60 * 1000,
			limit: 300,
			standardHeaders: true,
			legacyHeaders: false,
			handler: (_req: Request, res: Response): void => {
				ResponsesUtil.tooManyRequest(res, { id_case: 'RATE_LIMITED' });
			},
		});

		// RootRouter reste public : c'est le point que verifient les health checks de l'hebergeur
		// (Render), qui n'envoient pas de X-API-Key.
		const add = (path: string, router: Router, protect: boolean = true) => {
			const fullPath = `/${product}/${side}/v${version}/${path}`;
			if (protect) {
				instance.use(fullPath, apiRateLimiter);
				instance.use(fullPath, apiKeyMiddleware);
			}
			instance.use(fullPath, router);
		};

		add('', RootRouter, false);
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
