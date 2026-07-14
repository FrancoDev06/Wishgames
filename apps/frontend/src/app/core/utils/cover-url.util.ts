// Une jaquette peut être servie localement (`/covers/...`, à préfixer avec l'origine API) ou
// hotlinkée depuis le CDN LaunchBox (URL absolue déjà complète, ex. import "remote" sans copie
// locale des images — voir scripts/import-launchbox-remote.ts) : ne jamais préfixer une URL absolue.
export function resolveCoverUrl(path: string | null, apiOrigin: string): string | null {
  if (!path) return null;
  return /^https?:\/\//i.test(path) ? path : `${apiOrigin}${path}`;
}
