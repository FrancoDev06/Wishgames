import { Component, Input } from '@angular/core';
import { CONDITION_LEVELS_TOTAL, conditionColor, conditionLabel, conditionLevel } from '../../../core/constants/game-state.constants';

// Une ligne "label + jauge à 7 segments + pastille" pour un composant physique donné (Jeu, Jaquette,
// Notice) — retour utilisateur : voir l'état d'un coup d'œil (jauge) plutôt que de devoir lire le
// mot, tout en gardant la pastille comme valeur exacte affichée. Réutilisé par Collection (jeu/
// jaquette/notice séparés, cf. ll_condition_media/box/manual) et Wishlist (un seul état recherché).
@Component({
  selector: 'app-condition-meter',
  imports: [],
  templateUrl: './condition-meter.html',
})
export class ConditionMeter {
  @Input({ required: true }) label!: string;
  @Input() value: string | null = null;

  protected readonly segments = Array.from({ length: CONDITION_LEVELS_TOTAL });

  protected level(): number {
    return conditionLevel(this.value);
  }

  protected color(): string {
    return this.value ? conditionColor(this.value) : 'transparent';
  }

  protected valueLabel(): string {
    return this.value ? conditionLabel(this.value) : '';
  }
}
