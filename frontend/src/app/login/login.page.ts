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

  async submit(): Promise<void> {
    this.loading = true;
    this.auth.login(this.email, this.password).subscribe({
      next: async () => {
        this.loading = false;
        await this.router.navigate(['/tabs/tab1']);
      },
      error: async (err) => {
        this.loading = false;
        const t = await this.toast.create({
          message: apiErrorMessage(err, 'Error al iniciar sesión'),
          duration: 3000,
          color: 'danger',
        });
        await t.present();
      },
    });
  }
}
