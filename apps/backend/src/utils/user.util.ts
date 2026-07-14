import LogUtil from "@utils/log.util";

// Application mono-utilisateur stricte (§1/§9 du cahier des charges) : pas de table ref_user,
// pas de comptes multiples. Ce stub existe uniquement pour satisfaire le pipeline de démarrage
// hérité du boilerplate perso (server.ts appelle UserUtil.init() comme étape générique).
export default class UserUtil {
	static async init(): Promise<void> {
		LogUtil.conslog("Mono-utilisateur — aucune resolution de compte necessaire.");
	}
}
