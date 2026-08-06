import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environments';

// Attache X-API-Key aux appels vers le backend (cf. apps/backend/src/middlewares/auth.middleware.ts).
// Ne s'applique qu'aux requetes vers apiBaseUrl : les eventuels appels externes (ex. liens source
// d'offres ouverts dans un nouvel onglet, pas des requetes HttpClient de toute facon) ne recoivent
// jamais ce header.
export const apiKeyInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.apiKey || !req.url.startsWith(environment.apiBaseUrl)) return next(req);

  return next(req.clone({ setHeaders: { 'X-API-Key': environment.apiKey } }));
};
