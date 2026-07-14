import { Component, Input } from '@angular/core';

export interface DonutSlice {
  label: string;
  value: number;
  // Nom d'une custom property CSS (ex. '--color-primary') — jamais une couleur en dur, pour rester
  // correct dans les 4 thèmes (skill dataviz : la couleur suit l'entité, pas un hex figé).
  colorVar: string;
}

interface DonutSegment extends DonutSlice {
  percent: number;
  dashArray: string;
  dashOffset: number;
}

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

@Component({
  selector: 'app-donut-chart',
  templateUrl: './donut-chart.html',
  styleUrl: './donut-chart.scss',
})
export class DonutChart {
  @Input({ required: true }) slices: DonutSlice[] = [];

  protected readonly radius = RADIUS;
  protected readonly circumference = CIRCUMFERENCE;

  protected get total(): number {
    return this.slices.reduce((sum, s) => sum + s.value, 0);
  }

  // Tranches → segments de cercle SVG (technique stroke-dasharray/stroke-dashoffset cumulés).
  protected get segments(): DonutSegment[] {
    const total = this.total;
    let offsetAccum = 0;

    return this.slices
      .filter((slice) => slice.value > 0)
      .map((slice) => {
        const fraction = total > 0 ? slice.value / total : 0;
        const dashLength = fraction * this.circumference;
        const segment: DonutSegment = {
          ...slice,
          percent: Math.round(fraction * 100),
          dashArray: `${dashLength} ${this.circumference - dashLength}`,
          dashOffset: -offsetAccum,
        };
        offsetAccum += dashLength;
        return segment;
      });
  }
}
