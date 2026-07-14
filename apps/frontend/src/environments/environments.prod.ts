// Déploiement cloud (Render) : backend et frontend servis depuis la même origine (voir mount
// statique + fallback SPA dans apps/backend/src/utils/routes.util.ts) — chemins relatifs, pas
// besoin de connaître l'URL du service à l'avance ni de configurer CORS.
export const environment = {
  production: true,
  apiOrigin: '',
  apiBaseUrl: '/api/client/v1',
};
