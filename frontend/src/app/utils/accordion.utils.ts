/**
 * Helper reutilizable para acordeones Ionic que:
 * - Permiten solo una sección abierta a la vez.
 * - Evitan el cierre accidental al hacer clic en la cabecera (solo se cierra con un botón explícito).
 */
export class AccordionController {
  private _open: string | undefined = undefined;
  private _allowClose = false;

  get open(): string | undefined {
    return this._open;
  }

  /** Maneja el evento `ionChange` del `<ion-accordion-group>`. */
  onChange(ev: Event): void {
    const next = (ev as CustomEvent<{ value: string | undefined }>).detail.value;
    const prev = this._open;
    if (next === undefined && prev !== undefined && !this._allowClose) {
      queueMicrotask(() => {
        this._open = prev;
      });
      return;
    }
    this._open = next;
  }

  /** Cierra el acordeón de forma programática (p. ej. desde un botón «Cerrar»). */
  close(): void {
    this._allowClose = true;
    this._open = undefined;
    queueMicrotask(() => {
      this._allowClose = false;
    });
  }

  /** Abre una sección específica por su valor. */
  openSection(value: string): void {
    this._open = value;
  }

  /** Retorna '−' si la sección está abierta, '+' si está cerrada. */
  toggleGlyph(value: string): string {
    return this._open === value ? '−' : '+';
  }

  /** Elimina la sección abierta si ya no existe en la lista de valores válidos. */
  syncWithValues(validValues: string[]): void {
    if (this._open !== undefined && !validValues.includes(this._open)) {
      this._open = undefined;
    }
  }
}
