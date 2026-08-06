export const environment = {
  production: false,
  // Backend Express, cf. apps/backend/src/routes.util.ts (product/side/version -> /api/client/v1)
  apiOrigin: 'http://localhost:6001',
  apiBaseUrl: 'http://localhost:6001/api/client/v1',
  // Doit correspondre a API_KEY dans apps/backend/.env pour tester l'authentification en local
  // (voir core/interceptors/api-key.interceptor.ts). Vide = pas de header envoye ; le backend
  // tourne alors sans verification si API_KEY n'y est pas non plus definie (avertissement au
  // demarrage), donc laisser vide ici ne casse rien par defaut.
  apiKey: '',
};
