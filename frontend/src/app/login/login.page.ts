import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { apiErrorMessage } from '../utils/api-error-message';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastController);

  email = '';
  password = '';
  loading = false;
  errorMessage: string | null = null;

  get canSubmit(): boolean {
    return this.email.trim().length > 0 && this.password.length > 0;
  }

  clearError(): void {
    if (this.errorMessage !== null) {
      this.errorMessage = null;
    }
  }

  async submit(): Promise<void> {
    if (this.loading || !this.canSubmit) {
      return;
    }
    this.loading = true;
    this.errorMessage = null;
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: async () => {
        this.loading = false;
        await this.router.navigate(['/inicio']);
      },
      error: async (err) => {
        this.loading = false;
        this.errorMessage = apiErrorMessage(err, 'No se pudo iniciar sesión. Revisa correo y contraseña.');
        const t = await this.toast.create({
          message: this.errorMessage,
          duration: 3200,
          color: 'danger',
          position: 'top',
        });
        await t.present();
      },
    });
  }
}
