import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { AuthService } from '../services/auth.service';
import { ParkingApiService, ParkingInfo } from '../services/parking-api.service';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page implements OnInit {
  pushStatus = 'No inicializado';

  loadingInfo = false;
  savingInfo = false;

  editName: string | null = null;
  editAddress: string | null = null;
  editCarCapacity: number | null = null;
  editMotoCapacity: number | null = null;

  constructor(
    readonly auth: AuthService,
    private readonly api: ParkingApiService,
    private readonly toast: ToastController,
  ) {}

  ngOnInit(): void {
    if (this.auth.hasRole('admin')) {
      this.loadParkingInfo();
    }
  }

  loadParkingInfo(): void {
    this.loadingInfo = true;
    this.api.getAdminParkingInfo().subscribe({
      next: (info) => {
        this.editName = info.name;
        this.editAddress = info.address;
        this.editCarCapacity = info.car_capacity;
        this.editMotoCapacity = info.motorcycle_capacity;
        this.loadingInfo = false;
      },
      error: async () => {
        this.loadingInfo = false;
        const t = await this.toast.create({
          message: 'No se pudo cargar la información del parqueadero.',
          duration: 2500,
          color: 'warning',
        });
        await t.present();
      },
    });
  }

  saveParkingInfo(): void {
    this.savingInfo = true;
    const body: Partial<ParkingInfo> = {
      name: this.editName?.trim() || null,
      address: this.editAddress?.trim() || null,
      car_capacity: this.editCarCapacity ?? null,
      motorcycle_capacity: this.editMotoCapacity ?? null,
    };
    this.api.patchAdminParkingInfo(body).subscribe({
      next: async (info) => {
        this.editName = info.name;
        this.editAddress = info.address;
        this.editCarCapacity = info.car_capacity;
        this.editMotoCapacity = info.motorcycle_capacity;
        this.savingInfo = false;
        const t = await this.toast.create({
          message: 'Información del parqueadero actualizada.',
          duration: 2000,
          color: 'success',
        });
        await t.present();
      },
      error: async () => {
        this.savingInfo = false;
        const t = await this.toast.create({
          message: 'No se pudo guardar la información.',
          duration: 2500,
          color: 'danger',
        });
        await t.present();
      },
    });
  }

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
