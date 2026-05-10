/** Máximo de dígitos para documento / cédula en formularios. */
export const DOCUMENT_MAX_DIGITS = 15;

/** Solo dígitos 0-9: quita letras, espacios y cualquier otro carácter. */
export function sanitizeDigitsOnly(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** Documento listo para modelo/API: solo dígitos y como máximo {@link DOCUMENT_MAX_DIGITS}. */
export function sanitizeDocumentDigits(raw: string): string {
  return sanitizeDigitsOnly(raw).slice(0, DOCUMENT_MAX_DIGITS);
}

const DOCUMENT_NAV_KEYS = new Set([
  'Backspace',
  'Delete',
  'Tab',
  'Escape',
  'Enter',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
]);

const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta']);

function digitCountAfterInsert(
  currentDigits: string,
  selectionStart: number,
  selectionEnd: number,
  insertLen: number,
): number {
  const len = currentDigits.length;
  const start = Math.max(0, Math.min(selectionStart, len));
  const end = Math.max(start, Math.min(selectionEnd, len));
  return currentDigits.length - (end - start) + insertLen;
}

/** Evita que en el campo se escriban letras u otros no dígitos (teclado físico). */
export function preventNonDigitDocumentKeydown(ev: KeyboardEvent): void {
  if (ev.ctrlKey || ev.metaKey || ev.altKey) {
    return;
  }
  if (MODIFIER_KEYS.has(ev.key)) {
    return;
  }
  if (ev.key === 'Unidentified' || ev.key === 'Process') {
    return;
  }
  if (DOCUMENT_NAV_KEYS.has(ev.key)) {
    return;
  }
  if (ev.key.length === 1 && /\d/.test(ev.key)) {
    const el = ev.target as HTMLInputElement;
    const base = sanitizeDigitsOnly(el.value);
    const start = el.selectionStart ?? base.length;
    const end = el.selectionEnd ?? base.length;
    if (digitCountAfterInsert(base, start, end, 1) > DOCUMENT_MAX_DIGITS) {
      ev.preventDefault();
    }
    return;
  }
  ev.preventDefault();
}

/**
 * Evita inserción de texto con caracteres no numéricos (móvil, IME, teclado virtual)
 * o que supere el máximo de dígitos.
 */
export function preventNonDigitDocumentBeforeInput(ev: Event): void {
  const e = ev as InputEvent;
  if (e.inputType !== 'insertText' && e.inputType !== 'insertCompositionText') {
    return;
  }
  const data = e.data;
  if (data == null || data.length === 0) {
    return;
  }
  const digits = sanitizeDigitsOnly(data);
  if (digits !== data) {
    e.preventDefault();
    return;
  }
  const target = e.target as HTMLInputElement;
  const base = sanitizeDigitsOnly(target.value);
  const start = target.selectionStart ?? base.length;
  const end = target.selectionEnd ?? base.length;
  if (digitCountAfterInsert(base, start, end, digits.length) > DOCUMENT_MAX_DIGITS) {
    e.preventDefault();
  }
}

/**
 * Valor del campo tras pegar, respetando selección (cédula / documento solo números).
 */
export function mergePastedDigitsOnly(
  currentValue: string,
  pastedRaw: string,
  selectionStart: number | null,
  selectionEnd: number | null,
): string {
  const pasted = sanitizeDigitsOnly(pastedRaw);
  const base = sanitizeDigitsOnly(currentValue);
  const len = base.length;
  const start = Math.max(0, Math.min(selectionStart ?? len, len));
  const end = Math.max(start, Math.min(selectionEnd ?? len, len));
  return (base.slice(0, start) + pasted + base.slice(end)).slice(0, DOCUMENT_MAX_DIGITS);
}
