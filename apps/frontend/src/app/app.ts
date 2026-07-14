import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeSwitcher } from './shared/components/theme-switcher/theme-switcher';
import { Toast } from './shared/components/toast/toast';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ThemeSwitcher, Toast],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
