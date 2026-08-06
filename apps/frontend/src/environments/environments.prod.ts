// Déploiement cloud (Render) : backend et frontend servis depuis la même origine (voir mount
// statique + fallback SPA dans apps/backend/src/utils/routes.util.ts) — chemins relatifs, pas
// besoin de connaître l'URL du service à l'avance ni de configurer CORS.
export const environment = {
  production: true,
  apiOrigin: '',
  apiBaseUrl: '/api/client/v1',
  // Remplacé au build Docker (voir Dockerfile, `ARG API_KEY` + sed sur ce placeholder) par la
  // valeur de la variable d'env Render API_KEY — LA MÊME que celle lue côté backend
  // (apps/backend/src/middlewares/auth.middleware.ts). Ce n'est pas un vrai secret : une fois le
  // bundle JS livré au navigateur, n'importe qui peut la lire (view-source / onglet réseau). Elle
  // sert juste à fermer la porte au scraping/bots basiques qui tapent l'URL au hasard, pas à
  // authentifier un utilisateur — voir l'audit du 2026-08-06 pour le contexte.
  apiKey: '__API_KEY__',
};
