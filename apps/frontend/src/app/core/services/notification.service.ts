import { Injectable, signal } from '@angular/core';

export type NotificationLevel = 'success' | 'error';

export interface AppNotification {
  id: number;
  level: NotificationLevel;
  message: string;
}

const AUTO_DISMISS_MS = 4000;
let nextId = 0;

// Notifications internes éphémères (§4 du cahier des charges) : toast pour succès/erreur,
// pas de journal persistant.
@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly notifications = signal<AppNotification[]>([]);

  success(message: string): void {
    this.push('success', message);
  }

  error(message: string): void {
    this.push('error', message);
  }

  dismiss(id: number): void {
    this.notifications.update((list) => list.filter((notification) => notification.id !== id));
  }

  private push(level: NotificationLevel, message: string): void {
    const notification: AppNotification = { id: nextId++, level, message };
    this.notifications.update((list) => [...list, notification]);
    setTimeout(() => this.dismiss(notification.id), AUTO_DISMISS_MS);
  }
}
