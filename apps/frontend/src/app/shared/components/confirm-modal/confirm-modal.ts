import { Component, EventEmitter, Input, Output } from '@angular/core';

// Modale de confirmation générique (§6 : "confirmation simple avant suppression définitive")
// — remplace le confirm() natif du navigateur, incohérent avec le reste de l'UI stylée de l'app.
@Component({
  selector: 'app-confirm-modal',
  templateUrl: './confirm-modal.html',
  styleUrl: './confirm-modal.scss',
})
export class ConfirmModal {
  @Input({ required: true }) heading!: string;
  @Input() message = '';
  @Input() confirmLabel = 'Supprimer';
  @Input() cancelLabel = 'Annuler';
  @Input() submitting = false;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  protected cancel(): void {
    this.cancelled.emit();
  }

  protected confirm(): void {
    this.confirmed.emit();
  }
}
