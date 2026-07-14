import pkg from "../package.json";

import RoutesUtil from "@utils/routes.util";
import DatabaseUtil from "@utils/database.util";
import UserUtil from "@utils/user.util";
import express from "express";
import LogUtil from "@utils/log.util";
import { uuidv7 } from "uuidv7";


type RDConfig = { product: string; versionShort: number; port: number; };
let app = express();

export const getRDConfig = (): RDConfig => {
	return (pkg as { rdConfig: RDConfig }).rdConfig;
}
app.set("runIdentifier", uuidv7());
// Render (et la plupart des hébergeurs) assignent leur propre port via PORT — le port fixe de
// rdConfig ne reste pertinent qu'en local, où PORT n'est jamais défini.
app.set("port", Number(process.env.PORT) || getRDConfig().port);
app.set("product", getRDConfig().product);
app.set("version.short", getRDConfig().versionShort);
app.set("version.full", process.env.npm_package_version);
app.set("name", process.env.npm_package_name);

const init = async () => {
	LogUtil.consinfo(`Mouting ${app.get('name')} code on /${app.get('product')}/collect-play/v${app.get('version.short')}`);
	LogUtil.conslog(`${app.get('version.full')} [RUN-${app.get('runIdentifier')}] (${app.get('env')})`);
	LogUtil.conslog("");

	const steps = [
		{
			processes: [() => RoutesUtil.init(app)],
			messages: {
				start: "Initializing routes...",
				success: "Routes successfully configured.",
				fail: "Routes configuration failed!"
			}
		},
		{
			processes: [() => DatabaseUtil.init(app)],
			messages: {
				start: "Initializing database(s) connection(s)...",
				success: "Database(s) successfully configured.",
				fail: "Database(s) configuration failed!"
			}
		},
		{
			processes: [() => UserUtil.init()],
			messages: {
				start: "Resolving default user...",
				success: "Default user resolved.",
				fail: "Default user resolution failed!"
			}
		},
		{
			processes: [() => new Promise<void>((resolve) => app.listen(app.get('port'), () => resolve()))],
			messages: {
				start: "Listening on service port...",
				success: `API ready to receive requests on port ${app.get('port')}.`,
				fail: "API cannot listen on the configured port!"
			}
		}
	]

	let failed = false;

	for (let step of steps) {
		try {
			LogUtil.conslog("➜ ", step.messages.start);

			const results: unknown[] = await Promise.all(step.processes.map((process) => process()));

			if (results.some((r) => r === false)) {
				throw new Error("An assertion returned false");
			}

			LogUtil.conssuccess("   ↳", step.messages.success);
		} catch (error: any) {
			console.error(error);
			LogUtil.conserror("   ↳", step.messages.fail);
		}
	}

	if (failed) process.exit(1);

	app.set("readiness", true);
	LogUtil.conslog("");
	LogUtil.conssuccess("➜ ", `Service marked ready. [RUN-${app.get('runIdentifier')}]`);
};


init();

export default app;