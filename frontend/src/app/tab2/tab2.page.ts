import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';
import {
  BILLING_OPTIONS,
  billingRateUnitSuffix,
  labelBillingMode as billingModeCatalogLabel,
  labelVehicleClassShort as vehicleClassCatalogShort,
  PARKING_DATETIME_FORMAT,
  PARKING_DISPLAY_LOCALE,
  PARKING_DISPLAY_TIMEZONE,
  VEHICLE_OPTIONS,
} from '../constants/parking-billing.catalog';
import { AuthService } from '../services/auth.service';
import {
  DailyHistoryResponse,
  OwnerActiveSession,
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
import {
  inferVehicleClassFromPlate,
  plateFormatHint,
  sanitizeOperatorPlateField,
  validateOperatorPlate,
} from '../utils/colombian-plate';
import {
  DOCUMENT_MAX_DIGITS,
  mergePastedDigitsOnly,
  preventNonDigitDocumentBeforeInput,
  preventNonDigitDocumentKeydown,
  sanitizeDocumentDigits,
} from '../utils/numeric-document';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page implements OnInit, OnDestroy {
  readonly documentMaxDigits = DOCUMENT_MAX_DIGITS;

  readonly billingModeLabel = billingModeCatalogLabel;

  readonly billingRateUnitSuffix = billingRateUnitSuffix;

  readonly vehicleClassLabelShort = vehicleClassCatalogShort;

  readonly coDateTimeFormat = PARKING_DATETIME_FORMAT;
  readonly coTimezone = PARKING_DISPLAY_TIMEZONE;
  readonly coLocale = PARKING_DISPLAY_LOCALE;

  plate = '';
  depositorDocument = '';
  vehicleClass: 'car' | 'motorcycle' = 'car';
  billingMode: 'minute' | 'hour' | 'day' | 'week' | 'month' = 'hour';

  readonly vehicleOptions = VEHICLE_OPTIONS;

  readonly billingOptions = BILLING_OPTIONS;

  activeSessions: ParkingSession[] = [];
  /** Filtro por placa (sesiones activas, operador/admin). */
  activeSessionsPlateFilter = '';
  vehicles: OwnerVehicle[] = [];
  loadingList = false;

  /** YYYY-MM-DD (local) para el informe diario */
  historyDate = this.isoDateLocal(new Date());
  dailyHistory: DailyHistoryResponse | null = null;
  loadingHistory = false;

  /** Modal unificado: ticket de ingreso o recibo de cobro. */
  ticketSheet: TicketSheetPayload | null = null;
  ticketSheetOpen = false;

  /** Reloj de UI para tiempo dentro del parqueadero (propietario). */
  ownerUiNowMs = Date.now();
  private ownerClockHandle: ReturnType<typeof setInterval> | null = null;
  private ownerMinuteRefreshHandle: ReturnType<typeof setInterval> | null = null;

  /** Acordeón parqueo cliente (misma estética que Inicio). */
  ownerParkingAccordionOpen: string | undefined = undefined;

  /** Solo `true` cuando el cierre lo pide el botón «Cerrar» (no el clic en la cabecera). */
  private ownerParkingAccordionAllowClose = false;

  private readonly destroy$ = new Subject<void>();

  /** Placa normalizada desde `?plate=` (QR / enlace profundo). */
  private plateFromRouteNormalized: string | null = null;

  constructor(
    readonly auth: AuthService,
    private readonly api: ParkingApiService,
    private readonly toast: ToastController,
    private readonly route: ActivatedRoute,
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

  /** Mensaje de error de formato de placa (operador/admin); vacío si aún no aplica. */
  get plateFieldError(): string | null {
    return validateOperatorPlate(this.plate, this.vehicleClass);
  }

  plateHintForClass(): string {
    return plateFormatHint(this.vehicleClass);
  }

  /** Deshabilita ingreso si hay texto en placa pero el formato aún no es válido. */
  get registerEntryDisabled(): boolean {
    const p = this.plate.trim();
    if (p.length === 0) {
      return false;
    }
    return this.plateFieldError !== null;
  }

  /** Sesiones activas filtradas por texto de placa (contiene, sin distinguir mayúsculas). */
  get filteredActiveSessions(): ParkingSession[] {
    const q = this.activeSessionsPlateFilter.replace(/\s+/g, '').toUpperCase();
    if (!q) {
      return this.activeSessions;
    }
    return this.activeSessions.filter((s) => {
      const plate = (s.vehicle?.plate ?? '').toUpperCase();
      return plate.includes(q);
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const raw = params.get('plate');
      this.plateFromRouteNormalized = this.normalizePlateQueryParam(raw);
      const role = this.auth.getUser()?.role;
      if (role === 'admin' || role === 'operator') {
        this.activeSessionsPlateFilter = raw?.trim() ?? '';
      }
      if (role === 'vehicle_owner' && !this.loadingList && this.vehicles.length > 0) {
        this.applyOwnerPlateFromRoute();
      }
    });
    this.refresh();
  }

  ngOnDestroy(): void {
    this.stopOwnerParkingTimers();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private normalizePlateQueryParam(raw: string | null): string | null {
    const p = raw?.trim().toUpperCase().replace(/\s+/g, '');
    return p && p.length > 0 ? p : null;
  }

  /** Propietario: abre el acordeón del vehículo indicado en la URL. */
  private applyOwnerPlateFromRoute(): void {
    if (this.auth.getUser()?.role !== 'vehicle_owner') {
      return;
    }
    const q = this.plateFromRouteNormalized;
    if (!q) {
      return;
    }
    const v = this.vehicles.find(
      (x) => x.plate.trim().toUpperCase().replace(/\s+/g, '') === q,
    );
    if (!v) {
      return;
    }
    this.ownerParkingAccordionOpen = this.ownerParkingAccordionKey(v.id);
    queueMicrotask(() => {
      document.getElementById(`pp-owner-park-${v.id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  }

  refresh(): void {
    const role = this.auth.getUser()?.role;
    if (role === 'vehicle_owner') {
      this.loadingList = true;
      this.api.getOwnerVehicles().subscribe({
        next: (v) => {
          this.vehicles = v;
          if (
            this.ownerParkingAccordionOpen !== undefined &&
            !v.some((x) => this.ownerParkingAccordionKey(x.id) === this.ownerParkingAccordionOpen)
          ) {
            this.ownerParkingAccordionOpen = undefined;
          }
          this.loadingList = false;
          this.startOwnerParkingTimers();
          this.applyOwnerPlateFromRoute();
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
    const plateNorm = sanitizeOperatorPlateField(this.plate);
    this.plate = plateNorm;
    const inferred = inferVehicleClassFromPlate(plateNorm);
    if (inferred !== null) {
      this.vehicleClass = inferred;
    }
    const docNorm = sanitizeDocumentDigits(this.depositorDocument);
    this.depositorDocument = docNorm;

    if (!plateNorm.length) {
      const t = await this.toast.create({
        message: 'Indica la placa del vehículo.',
        duration: 2500,
        color: 'warning',
      });
      await t.present();
      return;
    }

    const plateErr = validateOperatorPlate(plateNorm, this.vehicleClass);
    if (plateErr) {
      const t = await this.toast.create({
        message: plateErr,
        duration: 3500,
        color: 'warning',
      });
      await t.present();
      return;
    }

    if (!docNorm.length) {
      const t = await this.toast.create({
        message: 'Indica el documento de quien entrega el vehículo.',
        duration: 2500,
        color: 'warning',
      });
      await t.present();
      return;
    }

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
          this.vehicleClass = 'car';
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

  onPlateModelChange(value: string): void {
    this.plate = sanitizeOperatorPlateField(value);
    if (this.plate.length === 0) {
      this.vehicleClass = 'car';
      return;
    }
    const inferred = inferVehicleClassFromPlate(this.plate);
    if (inferred !== null) {
      this.vehicleClass = inferred;
    }
  }

  /** Solo dígitos, máximo 15. */
  onDocumentModelChange(value: string): void {
    this.depositorDocument = sanitizeDocumentDigits(value);
  }

  onDepositorDocumentKeydown(ev: KeyboardEvent): void {
    preventNonDigitDocumentKeydown(ev);
  }

  onDepositorDocumentBeforeInput(ev: Event): void {
    preventNonDigitDocumentBeforeInput(ev);
  }

  onDepositorDocumentPaste(ev: ClipboardEvent): void {
    ev.preventDefault();
    const el = ev.target as HTMLInputElement;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const pasted = ev.clipboardData?.getData('text') ?? '';
    const pastedDigits = pasted.replace(/\D/g, '');
    this.depositorDocument = mergePastedDigitsOnly(
      this.depositorDocument,
      pasted,
      start,
      end,
    );
    const cursor = Math.min(start + pastedDigits.length, this.depositorDocument.length);
    queueMicrotask(() => {
      el.setSelectionRange(cursor, cursor);
    });
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

  ownerParkingAccordionKey(vehicleId: number): string {
    return `park-v-${vehicleId}`;
  }

  onOwnerParkingAccordionChange(ev: Event): void {
    const next = (ev as CustomEvent<{ value: string | undefined }>).detail.value;
    const prev = this.ownerParkingAccordionOpen;
    if (next === undefined && prev !== undefined && !this.ownerParkingAccordionAllowClose) {
      queueMicrotask(() => {
        this.ownerParkingAccordionOpen = prev;
      });
      return;
    }
    this.ownerParkingAccordionOpen = next;
  }

  closeOwnerParkingAccordion(): void {
    this.ownerParkingAccordionAllowClose = true;
    this.ownerParkingAccordionOpen = undefined;
    queueMicrotask(() => {
      this.ownerParkingAccordionAllowClose = false;
    });
  }

  ownerParkingAccordionGlyph(vehicleId: number): string {
    return this.ownerParkingAccordionOpen === this.ownerParkingAccordionKey(vehicleId) ? '−' : '+';
  }

  /** Vuelve a pedir vehículos al servidor para actualizar `active_session` y el cobro dinámico. */
  refreshOwnerParkingFromApi(): void {
    if (this.auth.getUser()?.role !== 'vehicle_owner') {
      return;
    }
    this.api.getOwnerVehicles().subscribe({
      next: (list) => {
        this.vehicles = list;
        if (
          this.ownerParkingAccordionOpen !== undefined &&
          !list.some((x) => this.ownerParkingAccordionKey(x.id) === this.ownerParkingAccordionOpen)
        ) {
          this.ownerParkingAccordionOpen = undefined;
        }
        this.startOwnerParkingTimers();
      },
      error: async () => {
        const t = await this.toast.create({
          message: 'No se pudo actualizar el estado del parqueo.',
          duration: 2500,
          color: 'danger',
        });
        await t.present();
      },
    });
  }

  displayOwnerAmount(s: OwnerActiveSession | null): string {
    if (!s) {
      return '—';
    }
    if (s.uses_live_estimate) {
      return s.amount_due_live;
    }
    return s.amount_due;
  }

  /** Importe y moneda formateados (es-CO) para la fila «Valor del parqueo seleccionado». */
  rateDisplayParts(
    value: string | null | undefined,
    currency: string | undefined,
  ): { amount: string; currency: string } {
    if (value === null || value === undefined) {
      return { amount: '—', currency: '' };
    }
    const n = Number(value);
    const cur = currency && currency.length > 0 ? currency : 'COP';
    if (Number.isNaN(n)) {
      return { amount: String(value), currency: cur };
    }
    if (cur === 'COP') {
      return {
        amount: new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(n),
        currency: '',
      };
    }
    return {
      amount: new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n),
      currency: cur,
    };
  }

  /** Documento registrado al ingreso (cédula / CC). */
  sessionDepositorDocument(s: ParkingSession): string {
    const d = s.vehicle?.depositor_document?.trim();
    return d && d.length > 0 ? d : '—';
  }

  /** Nombre del usuario propietario vinculado al vehículo en la app, si existe. */
  sessionOwnerAppName(s: ParkingSession): string | null {
    const n = s.vehicle?.owner?.name?.trim();
    return n && n.length > 0 ? n : null;
  }

  /** Sin nombre en app: muestra la CC registrada al ingreso; si tampoco hay, «—». */
  sessionOwnerDocumentFallback(s: ParkingSession): string {
    const d = s.vehicle?.depositor_document?.trim();
    return d && d.length > 0 ? d : '—';
  }

  formatMoney(value: string | null | undefined): string {
    if (value === null || value === undefined) {
      return '—';
    }
    const n = Number(value);
    if (Number.isNaN(n)) {
      return String(value);
    }
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n);
  }

  parkingElapsedLabel(enteredAt: string): string {
    const ms = Math.max(0, this.ownerUiNowMs - new Date(enteredAt).getTime());
    const sec = Math.floor(ms / 1000);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
      return `${h} h ${m} min`;
    }
    if (m > 0) {
      return `${m} min ${s} s`;
    }
    return `${s} s`;
  }

  private startOwnerParkingTimers(): void {
    this.stopOwnerParkingTimers();
    if (this.auth.getUser()?.role !== 'vehicle_owner') {
      return;
    }

    this.ownerClockHandle = setInterval(() => {
      this.ownerUiNowMs = Date.now();
    }, 1000);

    const hasMinute = this.vehicles.some((v) => v.active_session?.billing_mode === 'minute');
    if (hasMinute) {
      this.ownerMinuteRefreshHandle = setInterval(() => this.refreshOwnerParkingFromApi(), 45000);
    }
  }

  private stopOwnerParkingTimers(): void {
    if (this.ownerClockHandle !== null) {
      clearInterval(this.ownerClockHandle);
      this.ownerClockHandle = null;
    }
    if (this.ownerMinuteRefreshHandle !== null) {
      clearInterval(this.ownerMinuteRefreshHandle);
      this.ownerMinuteRefreshHandle = null;
    }
  }

  private async presentToast(message: string, color: string): Promise<void> {
    const t = await this.toast.create({ message, duration: 2200, color });
    await t.present();
  }
}
