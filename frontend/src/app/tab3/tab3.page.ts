import { Component, OnInit, inject } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { DATA_PROCESSING_POLICY } from '../constants/data-policy.constant';
import { AuthService } from '../services/auth.service';
import { ParkingApiService, ParkingInfo } from '../services/parking-api.service';
import { ThemeService } from '../services/theme.service';
import { apiErrorMessage } from '../utils/api-error-message';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ParkingApiService);
  private readonly toast = inject(ToastController);
  private readonly alertCtrl = inject(AlertController);
  readonly theme = inject(ThemeService);

  readonly policy = DATA_PROCESSING_POLICY;
  policyModalOpen = false;

  // Profile fields
  profileName = '';
  profileEmail = '';
  profilePassword = '';
  profilePasswordConfirm = '';
  savingProfile = false;
  deletingAccount = false;

  // Admin parking info fields
  loadingInfo = false;
  savingInfo = false;
  editName: string | null = null;
  editAddress: string | null = null;
  editCarCapacity: number | null = null;
  editMotoCapacity: number | null = null;

  displayRole(role: string): string {
    const roles: Record<string, string> = {
      admin: 'Administrador',
      operator: 'Operario',
      vehicle_owner: 'Usuario',
    };
    return roles[role] || role;
  }

  ngOnInit(): void {
    this.initProfileFields();
    if (this.auth.hasRole('admin')) {
      this.loadParkingInfo();
    }
  }

  ionViewWillEnter(): void {
    this.initProfileFields();
    if (this.auth.hasRole('admin')) {
      this.loadParkingInfo();
    }
  }

  private initProfileFields(): void {
    const u = this.auth.getUser();
    if (u) {
      this.profileName = u.name || '';
      this.profileEmail = u.email || '';
      this.profilePassword = '';
      this.profilePasswordConfirm = '';
    }
  }

  async saveProfile(): Promise<void> {
    const name = this.profileName.trim();
    const email = this.profileEmail.trim();

    if (!name || !email) {
      const t = await this.toast.create({
        message: 'Nombre y correo electrónico son requeridos.',
        duration: 2500,
        color: 'warning',
      });
      await t.present();
      return;
    }

    if (this.profilePassword) {
      if (this.profilePassword.length < 6) {
        const t = await this.toast.create({
          message: 'La nueva contraseña debe tener al menos 6 caracteres.',
          duration: 3000,
          color: 'warning',
        });
        await t.present();
        return;
      }
      if (this.profilePassword !== this.profilePasswordConfirm) {
        const t = await this.toast.create({
          message: 'Las contraseñas no coinciden.',
          duration: 3000,
          color: 'warning',
        });
        await t.present();
        return;
      }
    }

    this.savingProfile = true;
    this.auth
      .updateProfile({
        name,
        email,
        password: this.profilePassword || undefined,
      })
      .subscribe({
        next: async res => {
          this.savingProfile = false;
          this.profilePassword = '';
          this.profilePasswordConfirm = '';
          const t = await this.toast.create({
            message: res.message || 'Datos de cuenta actualizados correctamente.',
            duration: 2500,
            color: 'success',
          });
          await t.present();
        },
        error: async err => {
          this.savingProfile = false;
          const t = await this.toast.create({
            message: apiErrorMessage(err, 'No se pudo actualizar la cuenta.'),
            duration: 3500,
            color: 'danger',
          });
          await t.present();
        },
      });
  }

  async confirmDeleteAccount(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: '¿Eliminar tu cuenta?',
      subHeader: 'Esta acción no se puede deshacer',
      message:
        'Se eliminarán de forma definitiva tu perfil y tus credenciales de acceso al parqueadero. ¿Deseas continuar?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Eliminar mi cuenta',
          role: 'destructive',
          handler: () => {
            this.executeDeleteAccount();
          },
        },
      ],
    });

    await alert.present();
  }

  private executeDeleteAccount(): void {
    this.deletingAccount = true;
    this.auth.deleteAccount().subscribe({
      next: async () => {
        this.deletingAccount = false;
        const t = await this.toast.create({
          message: 'Tu cuenta ha sido eliminada exitosamente.',
          duration: 3500,
          color: 'success',
        });
        await t.present();
      },
      error: async err => {
        this.deletingAccount = false;
        const t = await this.toast.create({
          message: apiErrorMessage(err, 'No se pudo eliminar la cuenta.'),
          duration: 3500,
          color: 'danger',
        });
        await t.present();
      },
    });
  }

  loadParkingInfo(): void {
    this.loadingInfo = true;
    this.api.getAdminParkingInfo().subscribe({
      next: info => {
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
      next: async info => {
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

  logout(): void {
    this.auth.logout();
  }
}
