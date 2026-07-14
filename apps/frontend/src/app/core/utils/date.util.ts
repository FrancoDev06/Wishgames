// Un <input type="date"> attend "YYYY-MM-DD" ; le backend renvoie un ISO complet (timestamptz) ou
// une date déjà courte selon la colonne — on ne garde que les 10 premiers caractères dans les deux cas.
export function toDateInputValue(value: string | null): string {
  return value ? value.slice(0, 10) : '';
}

// Date relative courte (ex. "il y a 3 j") pour le flux d'activité du Dashboard (§3.4).
export function timeAgo(value: string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `il y a ${diffD} j`;
  const diffMonth = Math.floor(diffD / 30);
  if (diffMonth < 12) return `il y a ${diffMonth} mois`;
  const diffYear = Math.floor(diffMonth / 12);
  return `il y a ${diffYear} an${diffYear > 1 ? 's' : ''}`;
}

export type DayBucket = 'today' | 'yesterday' | 'week' | 'older';

// Regroupement par jour du flux d'activité du Dashboard (§3.4 refonte) — comparaison calendaire
// (minuit local), pas un simple diff en heures comme timeAgo().
export function dayBucket(value: string): DayBucket {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOfDay(new Date());
  const target = startOfDay(new Date(value));
  const diffDays = Math.round((today - target) / 86_400_000);

  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays <= 7) return 'week';
  return 'older';
}

export const DAY_BUCKET_LABEL: Record<DayBucket, string> = {
  today: "Aujourd'hui",
  yesterday: 'Hier',
  week: 'Cette semaine',
  older: 'Plus ancien',
};
