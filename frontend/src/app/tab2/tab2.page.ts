import { Component, OnInit } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import {
  BILLING_OPTIONS,
  labelBillingMode as billingModeCatalogLabel,
  labelVehicleClassShort as vehicleClassCatalogShort,
  VEHICLE_OPTIONS,
} from '../constants/parking-billing.catalog';
import { AuthService } from '../services/auth.service';
import {
  DailyHistoryResponse,
  OwnerVehicle,
  ParkingApiService,
  ParkingSession,
} from '../services/parking-api.service';
import {
  EntryTicketData,
  SaleReceiptData,
  TicketSheetPayload,
  buildEntryTicketFromSession,
  buildSaleReceiptFromSession,
} from '../shared/sale-receipt.model';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page implements OnInit {
  readonly billingModeLabel = billingModeCatalogLabel;

  readonly vehicleClassLabelShort = vehicleClassCatalogShort;

  plate = '';
  depositorDocument = '';
  vehicleClass: 'car' | 'motorcycle' = 'car';
  billingMode: 'minute' | 'hour' | 'day' | 'week' | 'month' = 'hour';

  readonly vehicleOptions = VEHICLE_OPTIONS;

  readonly billingOptions = BILLING_OPTIONS;

  activeSessions: ParkingSession[] = [];
  vehicles: OwnerVehicle[] = [];
  loadingList = false;

  /** YYYY-MM-DD (local) para el informe diario */
  historyDate = this.isoDateLocal(new Date());
  dailyHistory: DailyHistoryResponse | null = null;
  loadingHistory = false;

  /** Modal unificado: ticket de ingreso o recibo de cobro. */
  ticketSheet: TicketSheetPayload | null = null;
  ticketSheetOpen = false;

  constructor(
    readonly auth: AuthService,
    private readonly api: ParkingApiService,
    private readonly toast: ToastController,
    private readonly alertCtrl: AlertController,
  ) {}

  /** Tipado explícito para el modal (evita errores de narrowing en la plantilla). */
  get receiptForSheet(): SaleReceiptData | null {
    const p = this.ticketSheet;
    return p?.mode === 'sale' ? p.data : null;
  }

  get entryTicketForSheet(): EntryTicketData | null {
    const p = this.ticketSheet;
    return p?.mode === 'entry' ? p.data : null;
  }

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    const role = this.auth.getUser()?.role;
    if (role === 'vehicle_owner') {
      this.loadingList = true;
      this.api.getOwnerVehicles().subscribe({
        next: (v) => {
          this.vehicles = v;
          this.loadingList = false;
        },
        error: async () => {
          this.loadingList = false;
          const t = await this.toast.create({ message: 'No se pudieron cargar tus vehículos', duration: 2500, color: 'danger' });
          await t.present();
        },
      });
      return;
    }

    if (role === 'admin' || role === 'operator') {
      this.loadingList = true;
      this.api.getActiveSessions().subscribe({
        next: (s) => {
          this.activeSessions = s;
          this.loadingList = false;
        },
        error: async () => {
          this.loadingList = false;
          const t = await this.toast.create({ message: 'No se pudieron cargar las sesiones', duration: 2500, color: 'danger' });
          await t.present();
        },
      });
      this.loadDailyHistory();
    }
  }

  private isoDateLocal(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  loadDailyHistory(): void {
    const role = this.auth.getUser()?.role;
    if (role !== 'admin' && role !== 'operator') {
      return;
    }
    this.loadingHistory = true;
    this.api.getDailyHistory(this.historyDate).subscribe({
      next: (h) => {
        this.dailyHistory = h;
        this.loadingHistory = false;
      },
      error: async () => {
        this.loadingHistory = false;
        this.dailyHistory = null;
        const t = await this.toast.create({
          message: 'No se pudo cargar el historial del día',
          duration: 2500,
          color: 'danger',
        });
        await t.present();
      },
    });
  }

  onHistoryDateChange(): void {
    this.loadDailyHistory();
  }

  async registerEntry(): Promise<void> {
    const plateNorm = this.plate.replace(/\s+/g, '').toUpperCase();
    const docNorm = this.depositorDocument.replace(/\D/g, '');
    this.plate = plateNorm;
    this.depositorDocument = docNorm;

    this.api
      .checkIn({
        plate: plateNorm,
        depositor_document: docNorm,
        vehicle_class: this.vehicleClass,
        billing_mode: this.billingMode,
      })
      .subscribe({
        next: async (res) => {
          const t = await this.toast.create({ message: 'Ingreso registrado', duration: 2000, color: 'success' });
          await t.present();
          this.ticketSheet = { mode: 'entry', data: buildEntryTicketFromSession(res.session) };
          this.ticketSheetOpen = true;
          this.plate = '';
          this.depositorDocument = '';
          this.refresh();
        },
        error: async (err) => {
          const t = await this.toast.create({
            message: err.error?.message ?? 'Error en ingreso',
            duration: 3000,
            color: 'danger',
          });
          await t.present();
        },
      });
  }

  onTicketSheetClosed(): void {
    this.ticketSheetOpen = false;
    this.ticketSheet = null;
  }

  /** Reimprime el ticket de ingreso (ej. ticket perdido). */
  reprintEntryTicket(session: ParkingSession): void {
    this.ticketSheet = { mode: 'entry', data: buildEntryTicketFromSession(session) };
    this.ticketSheetOpen = true;
  }

  /** Sin espacios, siempre mayúsculas (UI + envío). */
  onPlateModelChange(value: string): void {
    this.plate = value.replace(/\s+/g, '').toUpperCase();
  }

  /** Solo dígitos (cédula / documento sin letras ni espacios). */
  onDocumentModelChange(value: string): void {
    this.depositorDocument = value.replace(/\D/g, '');
  }

  openReceiptForSale(session: ParkingSession): void {
    this.ticketSheet = { mode: 'sale', data: buildSaleReceiptFromSession(session) };
    this.ticketSheetOpen = true;
  }

  async checkout(session: ParkingSession): Promise<void> {
    this.api.checkOut(session.id).subscribe({
      next: async (res) => {
        const t = await this.toast.create({
          message: `Cobro registrado: ${res.amount_paid ?? res.amount_due} COP`,
          duration: 2500,
          color: 'success',
        });
        await t.present();
        this.openReceiptForSale(res);
        this.refresh();
      },
      error: async (err) => {
        const t = await this.toast.create({
          message: err.error?.message ?? 'Error al cerrar sesión',
          duration: 2500,
          color: 'danger',
        });
        await t.present();
      },
    });
  }

  async openVehicleDetail(v: OwnerVehicle): Promise<void> {
    this.api.getOwnerActiveSession(v.id).subscribe({
      next: async (s) => {
        const entered = new Date(s.entered_at);
        const modeLabel = billingModeCatalogLabel(s.billing_mode);
        const msg =
          s.billing_mode === 'week' || s.billing_mode === 'month'
            ? `Modalidad: ${modeLabel}. Fin período: ${
                s.period_ends_at ? new Date(s.period_ends_at).toLocaleString('es-CO') : '—'
              }`
            : `Entrada: ${entered.toLocaleString('es-CO')} · Modalidad: ${modeLabel}`;

        const alert = await this.alertCtrl.create({
          header: v.plate,
          message: `${msg}\nSaldo estimado: ${s.amount_due} COP`,
          buttons: ['OK'],
        });
        await alert.present();
      },
      error: async () => {
        const alert = await this.alertCtrl.create({
          header: v.plate,
          message: 'No hay sesión activa para este vehículo.',
          buttons: ['OK'],
        });
        await alert.present();
      },
    });
  }
}
