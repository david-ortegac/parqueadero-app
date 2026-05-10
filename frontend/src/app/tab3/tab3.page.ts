import { Component } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { AuthService } from '../services/auth.service';
import { ParkingApiService } from '../services/parking-api.service';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page {
  pushStatus = 'No inicializado';

  constructor(
    readonly auth: AuthService,
    private readonly api: ParkingApiService,
    private readonly toast: ToastController,
  ) {}

  async setupPush(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      this.pushStatus = 'Las push nativas requieren iOS/Android. En web usa PWA con soporte limitado.';
      const t = await this.toast.create({
        message: this.pushStatus,
        duration: 3000,
      });
      await t.present();
      return;
    }

    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') {
      this.pushStatus = 'Permisos denegados';
      return;
    }

    await PushNotifications.register();

    await PushNotifications.addListener('registration', (token) => {
      this.pushStatus = 'Token registrado en el dispositivo';
      const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
      this.api.registerPushDevice({ token: token.value, platform }).subscribe({
        error: async () => {
          const t = await this.toast.create({ message: 'No se pudo enviar el token al servidor', color: 'warning', duration: 2500 });
          await t.present();
        },
      });
    });

    await PushNotifications.addListener('registrationError', async (err) => {
      this.pushStatus = `Error: ${err.error}`;
    });
  }

  logout(): void {
    this.auth.logout();
  }
}
