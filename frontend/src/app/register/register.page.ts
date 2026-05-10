import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import {
  DOCUMENT_MAX_DIGITS,
  mergePastedDigitsOnly,
  preventNonDigitDocumentBeforeInput,
  preventNonDigitDocumentKeydown,
  sanitizeDocumentDigits,
} from '../utils/numeric-document';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false,
})
export class RegisterPage {
  readonly documentMaxDigits = DOCUMENT_MAX_DIGITS;

  name = '';
  document = '';
  email = '';
  password = '';
  passwordConfirm = '';
  loading = false;

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly toast: ToastController,
  ) {}

  onDocumentChange(value: string): void {
    this.document = sanitizeDocumentDigits(value);
  }

  onRegisterDocumentKeydown(ev: KeyboardEvent): void {
    preventNonDigitDocumentKeydown(ev);
  }

  onRegisterDocumentBeforeInput(ev: Event): void {
    preventNonDigitDocumentBeforeInput(ev);
  }

  onRegisterDocumentPaste(ev: ClipboardEvent): void {
    ev.preventDefault();
    const el = ev.target as HTMLInputElement;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const pasted = ev.clipboardData?.getData('text') ?? '';
    const pastedDigits = pasted.replace(/\D/g, '');
    this.document = mergePastedDigitsOnly(this.document, pasted, start, end);
    const cursor = Math.min(start + pastedDigits.length, this.document.length);
    queueMicrotask(() => {
      el.setSelectionRange(cursor, cursor);
    });
  }

  async submit(): Promise<void> {
    this.document = sanitizeDocumentDigits(this.document);
    if (this.password !== this.passwordConfirm) {
      const t = await this.toast.create({
        message: 'Las contraseñas no coinciden.',
        duration: 2800,
        color: 'warning',
      });
      await t.present();
      return;
    }

    this.loading = true;
    this.auth
      .register({
        name: this.name.trim(),
        document: this.document,
        email: this.email.trim(),
        password: this.password,
      })
      .subscribe({
        next: async (res) => {
          this.loading = false;
          const t = await this.toast.create({
            message: res.message ?? 'Registro creado.',
            duration: 4500,
            color: 'success',
          });
          await t.present();
          await this.router.navigate(['/login']);
        },
        error: async (err) => {
          this.loading = false;
          const msg =
            err.error?.errors?.document?.[0] ??
            err.error?.errors?.email?.[0] ??
            err.error?.message ??
            'No se pudo registrar.';
          const t = await this.toast.create({
            message: msg,
            duration: 3500,
            color: 'danger',
          });
          await t.present();
        },
      });
  }

  goLogin(): void {
    void this.router.navigate(['/login']);
  }
}
