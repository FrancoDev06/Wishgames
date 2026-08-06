import { Pool, PoolClient } from "pg";
import ActivityLogQueries, { ActivityLogInput } from "@queries/activity-log.queries";

// Petit helper partagé entre les CRUD wishlist/collection (jeux ET consoles) : les 4 fichiers
// *.queries.ts (wishlist, collection, console-wishlist, console-collection) répétaient chacun, dans
// create()/update()/delete(), le même `if (entity) { await ActivityLogQueries.log({...}) }` — seule
// la construction du payload de log change (kind/action/champs). `buildPayload` reste appelé par le
// code appelant, qui garde donc un contrôle total sur le contenu du log ; ce helper ne factorise que
// le contrôle de flux "logger seulement si l'entité existe encore".
export async function logIfPresent<T>(
	entity: T | null | undefined,
	buildPayload: (entity: T) => ActivityLogInput,
	runner?: Pool | PoolClient
): Promise<void> {
	if (!entity) return;
	await ActivityLogQueries.log(buildPayload(entity), runner);
}
