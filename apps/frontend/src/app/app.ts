import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { Toast } from './shared/components/toast/toast';

interface NavItem {
  path: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/collection', label: 'Collection' },
  { path: '/catalogue', label: 'Catalogue' },
  { path: '/wishlist', label: 'Wishlist' },
];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Toast],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly navItems = signal(NAV_ITEMS);

  private readonly swUpdate = inject(SwUpdate);

  // Sans ça, le service worker installe silencieusement la nouvelle version en tâche de fond mais
  // ne l'active jamais tant qu'on ne recharge pas une 2e fois — on active + recharge dès qu'une
  // nouvelle version est prête pour ne plus jamais se retrouver face à un ancien build après un
  // redéploiement (cf. retour utilisateur : "j'ai pas de modification").
  constructor() {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
        .subscribe(() => {
          this.swUpdate.activateUpdate().then(() => document.location.reload());
        });
      this.swUpdate.checkForUpdate();
    }
  }
}
