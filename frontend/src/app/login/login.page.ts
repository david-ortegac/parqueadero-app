import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage {
  email = 'admin@parqueadero.local';
  password = 'password';
  loading = false;

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly toast: ToastController,
  ) {}

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
          message: err.error?.message ?? 'Error al iniciar sesión',
          duration: 3000,
          color: 'danger',
        });
        await t.present();
      },
    });
  }
}
