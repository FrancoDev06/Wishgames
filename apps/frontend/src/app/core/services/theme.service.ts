import { Injectable, signal } from '@angular/core';

export type ThemeId = 'minimal' | 'dark-gaming' | 'neon' | 'retro';

export interface ThemeOption {
  id: ThemeId;
  label: string;
}

const STORAGE_KEY = 'wishgames-theme';
const DEFAULT_THEME: ThemeId = 'minimal';

export const THEMES: ThemeOption[] = [
  { id: 'minimal', label: 'Minimal' },
  { id: 'dark-gaming', label: 'Dark Gaming' },
  { id: 'neon', label: 'Neon' },
  { id: 'retro', label: 'Retro' },
];

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<ThemeId>(this.readInitialTheme());
  readonly themes = THEMES;

  constructor() {
    this.applyTheme(this.theme());
  }

  setTheme(theme: ThemeId): void {
    this.theme.set(theme);
    this.applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }

  private applyTheme(theme: ThemeId): void {
    document.documentElement.setAttribute('data-theme', theme);
  }

  private readInitialTheme(): ThemeId {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    return stored && THEMES.some((t) => t.id === stored) ? stored : DEFAULT_THEME;
  }
}
