import { HttpErrorResponse } from '@angular/common/http';

// Le backend répond toujours { info: 'execko', error: 'ERROR_XXX', additional: {...} } sur échec
// (voir errors.util.ts) — jamais de message humain. On extrait ce code (+ additional.id_case s'il
// existe, ex. MISSING_REQUIRED_FIELDS) pour le joindre aux toasts génériques existants, plutôt que
// de le perdre silencieusement : c'est ce détail qui manquait pour diagnostiquer rapidement
// l'incident de migration non appliquée (500 générique indiscernable d'un vrai bug).
export function httpErrorDetail(err: HttpErrorResponse): string {
  if (err.status === 0) return 'serveur injoignable';

  const body = err.error as { error?: string; additional?: unknown } | null;
  const code = typeof body?.error === 'string' ? body.error : `HTTP ${err.status}`;

  const additional = body?.additional;
  const idCase =
    additional && typeof additional === 'object' && typeof (additional as Record<string, unknown>)['id_case'] === 'string'
      ? ` : ${(additional as Record<string, unknown>)['id_case']}`
      : '';

  return `${code}${idCase}`;
}
