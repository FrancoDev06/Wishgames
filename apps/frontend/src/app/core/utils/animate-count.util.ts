// Anime un nombre de `from` à `to` (stat tiles du Dashboard, §3.4 refonte) via requestAnimationFrame
// — une interpolation numérique n'est pas faisable en CSS pur, contrairement au reste des animations
// de l'écran (voir _animations.scss). No-op immédiat si l'utilisateur préfère moins de mouvement.
export function animateCount(from: number, to: number, durationMs: number, onTick: (value: number) => void): void {
  if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    onTick(to);
    return;
  }

  if (from === to) {
    onTick(to);
    return;
  }

  const start = performance.now();
  const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

  const step = (now: number) => {
    const elapsed = now - start;
    const progress = Math.min(1, elapsed / durationMs);
    const value = from + (to - from) * easeOut(progress);
    onTick(value);
    if (progress < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}
