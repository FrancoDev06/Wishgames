import { Directive, ElementRef, EventEmitter, HostListener, Input, OnDestroy, AfterViewInit, Output } from '@angular/core';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// A poser sur le conteneur `.modal` (pas le backdrop) des modales de shared/components/*-modal.
// Ajoute role=dialog/aria-modal/aria-labelledby, piege le focus (Tab/Shift+Tab), ferme sur Echap
// (evenement `modalClosed`, a brancher sur le meme handler que le clic backdrop existant) et rend
// le focus a l'element declencheur en se detruisant — sans toucher a la structure/au style
// existants des 8 modales, qui restent identiques par ailleurs (retour utilisateur : clavier et
// lecteur d'ecran ne peuvent aujourd'hui ni fermer une modale ni y naviguer).
@Directive({
  selector: '[appModalA11y]',
})
export class ModalA11yDirective implements AfterViewInit, OnDestroy {
  @Input('appModalA11y') titleId = '';
  @Output() modalClosed = new EventEmitter<void>();

  private previouslyFocused: HTMLElement | null = null;

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    const el = this.host.nativeElement;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    if (this.titleId) el.setAttribute('aria-labelledby', this.titleId);
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');

    this.previouslyFocused = document.activeElement as HTMLElement | null;
    const focusable = this.focusableElements(el);
    (focusable[0] ?? el).focus();
  }

  ngOnDestroy(): void {
    this.previouslyFocused?.focus?.();
  }

  @HostListener('keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.modalClosed.emit();
      return;
    }
    if (event.key === 'Tab') this.trapFocus(event);
  }

  private trapFocus(event: KeyboardEvent): void {
    const focusable = this.focusableElements(this.host.nativeElement);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusableElements(root: HTMLElement): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => el.offsetParent !== null);
  }
}
