import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import {
  groupRatesByVehicleClass,
  labelBillingMode as billingModeCatalogLabel,
  labelVehicleClassShort as vehicleClassCatalogShort,
  PARKING_DATETIME_FORMAT,
  PARKING_DISPLAY_LOCALE,
  PARKING_DISPLAY_TIMEZONE,
} from '../constants/parking-billing.catalog';
import { AuthService } from '../services/auth.service';
import { DashboardService } from '../services/dashboard.service';
import {
  OperatorVehicleOwnerRow,
  OwnerSessionHistoryRow,
  OwnerVehicle,
  ParkingApiService,
  DashboardResponse,
  Rate,
} from '../services/parking-api.service';
import { ThemeService } from '../services/theme.service';
import { AccordionController } from '../utils/accordion.utils';
import { formatCop, formatMoney as formatMoneyUtil } from '../utils/format.utils';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  private readonly api = inject(ParkingApiService);
  private readonly dashboardCharts = inject(DashboardService);
  private readonly toast = inject(ToastController);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly theme = inject(ThemeService);

  readonly billingModeLabel = billingModeCatalogLabel;

  readonly vehicleClassLabelShort = vehicleClassCatalogShort;

  readonly coDateTimeFormat = PARKING_DATETIME_FORMAT;
  readonly coTimezone = PARKING_DISPLAY_TIMEZONE;
  readonly coLocale = PARKING_DISPLAY_LOCALE;

  dashboard: DashboardResponse | null = null;
  rates: Rate[] = [];
  /** Borradores locales por id de tarifa (solo admin). */
  rateDrafts: Record<number, { price: number; is_active: boolean }> = {};
  savingRateId: number | null = null;
  revenueTotal: string | null = null;
  loading = true;
  error: string | null = null;

  vehicleOwners: OperatorVehicleOwnerRow[] = [];
  loadingOwners = false;
  savingOwnerId: number | null = null;

  /** Propietario: vehículos y edición en Inicio. */
  ownerVehicles: OwnerVehicle[] = [];
  loadingOwnerVehicles = false;
  ownerEditDrafts: Record<number, { brand: string; color: string; cylinder_cc: string }> = {};
  savingOwnerVehicleId: number | null = null;
  ownerHistoryVisible = false;
  ownerHistoryLoading = false;
  ownerHistoryByVehicleId: Record<number, OwnerSessionHistoryRow[]> = {};

  /** Acordeón vehículos (una sección abierta a la vez). */
  readonly ownerAccordion = new AccordionController();

  /** Acordeón tarifas admin (carros / motos). */
  readonly ratesAccordion = new AccordionController();

  /** Acordeón de cuentas de propietarios para admin y operador. */
  readonly vehicleOwnersAccordion = new AccordionController();

  expandedRows: { [key: string]: boolean } = {};

  isRowExpanded(id: number | string): boolean {
    return !!this.expandedRows[String(id)];
  }

  toggleRowExpansion(id: number | string): void {
    const key = String(id);
    if (this.expandedRows[key]) {
      delete this.expandedRows[key];
    } else {
      this.expandedRows[key] = true;
    }
    this.expandedRows = { ...this.expandedRows };
  }

  private readonly destroy$ = new Subject<void>();

  /** Placa normalizada desde `?plate=` (deep link / QR del ticket). */
  private ownerPlateQueryNormalized: string | null = null;

  /** PrimeNG Chart (doughnut) */
  chartData: { labels: string[]; datasets: { data: number[]; backgroundColor: string[]; hoverBackgroundColor: string[] }[] } =
    {
      labels: [],
      datasets: [{ data: [], backgroundColor: [], hoverBackgroundColor: [] }],
    };

  chartOptions: Record<string, unknown> = {};

  /** Texto tipo filtro de período (demo visual; enlazar a API después). */
  readonly periodLabel = new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.ownerPlateQueryNormalized = this.normalizeOwnerPlateQuery(params.get('plate'));
      const isOwner = this.auth.getUser()?.role === 'vehicle_owner';
      if (isOwner && !this.loadingOwnerVehicles && this.ownerVehicles.length > 0) {
        this.applyOwnerPlateQueryToAccordion();
      }
    });
    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      spacing: 2,
      borderWidth: 0,
      layout: {
        padding: 0,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: { label?: string; parsed?: number }) => {
              const value = ctx.parsed ?? 0;
              const total = this.totalActive;
              const pct = total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
              return `${ctx.label ?? ''}: ${value} (${pct}%)`;
            },
          },
        },
      },
    };
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Tarifas admin agrupadas por carros / motos (orden de modalidades centralizado en el catálogo). */
  get rateGroups(): ReturnType<typeof groupRatesByVehicleClass> {
    return groupRatesByVehicleClass(this.rates);
  }

  load(): void {
    this.loading = true;
    this.error = null;

    const user = this.auth.getUser();
    if (!user) {
      this.loading = false;
      return;
    }

    if (user.role === 'vehicle_owner') {
      this.loading = false;
      this.loadOwnerVehicles();
      return;
    }

    this.api.getDashboard().subscribe({
      next: (d) => {
        this.dashboard = d;
        this.syncChart();
        this.loading = false;
        this.loadVehicleOwnersIfStaff();
      },
      error: (err: unknown) => {
        this.error = this.dashboardLoadErrorMessage(err);
        this.loading = false;
      },
    });

    if (user.role === 'admin') {
      this.api.getAdminRates().subscribe({
        next: (r) => {
          this.rates = r;
          this.syncRateDraftsFromRates();
          this.syncRatesAccordionOpenWithGroups();
        },
      });
    }

    this.api.getRevenueSummary().subscribe({
      next: (rep) => {
        this.revenueTotal = rep.total;
      },
      error: () => {
        this.revenueTotal = null;
      },
    });
  }

  private syncChart(): void {
    this.chartData = this.dashboardCharts.buildChartData(this.dashboard);
  }

  get totalActive(): number {
    return this.dashboardCharts.totalActive(this.dashboard);
  }

  shareCar(): number {
    return this.dashboardCharts.sharePercent(this.dashboard?.occupancy.car.active ?? 0, this.totalActive);
  }

  shareMoto(): number {
    return this.dashboardCharts.sharePercent(
      this.dashboard?.occupancy.motorcycle.active ?? 0,
      this.totalActive,
    );
  }

  pct(active: number, cap: number | null): number {
    return this.dashboardCharts.occupancyPct(active, cap);
  }

  /**
   * Mensaje útil cuando GET /operator/dashboard falla (401, 403, red, URL incorrecta).
   */
  private dashboardLoadErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const apiMsg =
        err.error &&
        typeof err.error === 'object' &&
        'message' in err.error &&
        typeof (err.error as { message: unknown }).message === 'string'
          ? (err.error as { message: string }).message
          : null;

      if (err.status === 0) {
        return (
          'No hay conexión con el servidor. Comprueba que la API esté en marcha, la IP/puerto en el build ' +
          '(environment) y que el teléfono y el PC estén en la misma red.'
        );
      }
      if (err.status === 401) {
        return apiMsg ?? 'Sesión no válida o token ausente. Cierra sesión y vuelve a entrar.';
      }
      if (err.status === 403) {
        return apiMsg ?? 'No tienes permiso para ver el tablero (rol operador o administrador).';
      }
      if (err.status >= 500) {
        return 'No se pudo cargar el tablero. Intente de nuevo más tarde.';
      }
      if (apiMsg) {
        return apiMsg;
      }
      return `No se pudo cargar el tablero (HTTP ${err.status}).`;
    }
    return 'No se pudo cargar el tablero.';
  }

  private syncRateDraftsFromRates(): void {
    const next: Record<number, { price: number; is_active: boolean }> = {};
    for (const r of this.rates) {
      next[r.id] = {
        price: Number(r.price),
        is_active: r.is_active,
      };
    }
    this.rateDrafts = next;
  }

  private syncRatesAccordionOpenWithGroups(): void {
    this.ratesAccordion.syncWithValues(this.rateGroups.map((g) => this.ratesAccordionKey(g.vehicleClass)));
  }

  ratesAccordionKey(vehicleClass: string): string {
    return `rates-${vehicleClass}`;
  }

  get ratesAccordionOpen(): string | undefined {
    return this.ratesAccordion.open;
  }

  onRatesAccordionChange(ev: Event): void {
    this.ratesAccordion.onChange(ev);
  }

  closeRatesAccordion(): void {
    this.ratesAccordion.close();
  }

  ratesAccordionToggleGlyph(vehicleClass: string): string {
    return this.ratesAccordion.toggleGlyph(this.ratesAccordionKey(vehicleClass));
  }

  ratesVehicleIcon(vehicleClass: string): string {
    return vehicleClass === 'car' ? 'car-outline' : 'bicycle-outline';
  }

  async saveRate(rate: Rate): Promise<void> {
    const draft = this.rateDrafts[rate.id];
    if (!draft || Number.isNaN(draft.price) || draft.price < 0) {
      const t = await this.toast.create({
        message: 'Indica un precio válido (mayor o igual a 0).',
        duration: 2500,
        color: 'warning',
      });
      await t.present();
      return;
    }

    this.savingRateId = rate.id;
    this.api
      .patchAdminRate(rate.id, {
        price: draft.price,
        is_active: draft.is_active,
      })
      .subscribe({
        next: (updated) => {
          const i = this.rates.findIndex((x) => x.id === rate.id);
          if (i >= 0) {
            this.rates[i] = updated;
          }
          this.syncRateDraftsFromRates();
          this.savingRateId = null;
          void this.presentToast('Tarifa actualizada.', 'success');
        },
        error: async (err: unknown) => {
          this.savingRateId = null;
          const t = await this.toast.create({
            message: this.apiErrorMessage(err, 'No se pudo guardar la tarifa.'),
            duration: 3000,
            color: 'danger',
          });
          await t.present();
        },
      });
  }

  private apiErrorMessage(err: unknown, fallback: string): string {
    if (!(err instanceof HttpErrorResponse) || !err.error || typeof err.error !== 'object') {
      return fallback;
    }
    const body = err.error as { message?: string; errors?: Record<string, string[]> };
    if (typeof body.message === 'string' && body.message.length > 0) {
      return body.message;
    }
    if (body.errors) {
      const first = Object.values(body.errors)[0]?.[0];
      if (first) {
        return first;
      }
    }
    return fallback;
  }

  private async presentToast(message: string, color: string): Promise<void> {
    const t = await this.toast.create({ message, duration: 2000, color });
    await t.present();
  }

  private loadVehicleOwnersIfStaff(): void {
    const u = this.auth.getUser();
    if (!u || (u.role !== 'admin' && u.role !== 'operator')) {
      return;
    }
    this.loadingOwners = true;
    this.api.getOperatorVehicleOwners().subscribe({
      next: (rows) => {
        this.vehicleOwners = rows;
        this.vehicleOwnersAccordion.syncWithValues(
          rows.map((owner) => this.vehicleOwnerAccordionKey(owner.id)),
        );
        this.loadingOwners = false;
      },
      error: () => {
        this.loadingOwners = false;
      },
    });
  }

  /** En la lista de propietarios no se puede desactivar la propia cuenta (sigue permitiendo activarse si estuviera inactivo). */
  isOwnActiveVehicleOwnerRow(owner: OperatorVehicleOwnerRow): boolean {
    const u = this.auth.getUser();
    return u !== null && u.id === owner.id && owner.is_active;
  }

  vehicleOwnerAccordionKey(ownerId: number): string {
    return `vehicle-owner-${ownerId}`;
  }

  get vehicleOwnersAccordionOpen(): string | undefined {
    return this.vehicleOwnersAccordion.open;
  }

  onVehicleOwnersAccordionChange(event: Event): void {
    this.vehicleOwnersAccordion.onChange(event);
  }

  closeVehicleOwnersAccordion(): void {
    this.vehicleOwnersAccordion.close();
  }

  vehicleOwnerAccordionToggleGlyph(ownerId: number): string {
    return this.vehicleOwnersAccordion.toggleGlyph(this.vehicleOwnerAccordionKey(ownerId));
  }

  async setVehicleOwnerActive(owner: OperatorVehicleOwnerRow, isActive: boolean): Promise<void> {
    if (!isActive && this.auth.getUser()?.id === owner.id) {
      const t = await this.toast.create({
        message: 'No puedes desactivar tu propia cuenta.',
        duration: 2800,
        color: 'warning',
      });
      await t.present();
      return;
    }

    this.savingOwnerId = owner.id;
    this.api.patchVehicleOwnerActivation(owner.id, { is_active: isActive }).subscribe({
      next: (res) => {
        owner.is_active = res.is_active;
        this.savingOwnerId = null;
        void this.presentToast(
          res.is_active ? 'Propietario activado. Vehículos con su cédula quedan vinculados.' : 'Cuenta desactivada.',
          'success',
        );
      },
      error: async (err: unknown) => {
        this.savingOwnerId = null;
        const t = await this.toast.create({
          message: this.apiErrorMessage(err, 'No se pudo actualizar el propietario.'),
          duration: 3000,
          color: 'danger',
        });
        await t.present();
      },
    });
  }

  formatMoney(value: string | number | null | undefined): string {
    return formatMoneyUtil(value);
  }

  /** Precio de tarifa en pesos colombianos (símbolo y separadores es-CO). */
  formatRateMoneyCop(value: number | string | null | undefined): string {
    return formatCop(value);
  }

  goToParkingTab(): void {
    void this.router.navigate(['/parqueo']);
  }

  private normalizeOwnerPlateQuery(raw: string | null): string | null {
    const p = raw?.trim().toUpperCase().replace(/\s+/g, '');
    return p && p.length > 0 ? p : null;
  }

  /** Abre el acordeón del vehículo cuya placa coincide con `?plate=` (p. ej. desde QR del ticket). */
  private applyOwnerPlateQueryToAccordion(): void {
    if (this.auth.getUser()?.role !== 'vehicle_owner') {
      return;
    }
    const q = this.ownerPlateQueryNormalized;
    if (!q) {
      return;
    }
    const v = this.ownerVehicles.find(
      (x) => x.plate.trim().toUpperCase().replace(/\s+/g, '') === q,
    );
    if (!v) {
      return;
    }
    this.ownerAccordion.openSection(this.ownerAccordionKey(v.id));
    queueMicrotask(() => {
      document.getElementById(`pp-owner-veh-${v.id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  }

  ownerAccordionKey(vehicleId: number): string {
    return `owner-v-${vehicleId}`;
  }

  get ownerAccordionOpen(): string | undefined {
    return this.ownerAccordion.open;
  }

  onOwnerAccordionChange(ev: Event): void {
    this.ownerAccordion.onChange(ev);
  }

  closeOwnerVehicleAccordion(): void {
    this.ownerAccordion.close();
  }

  ownerAccordionToggleGlyph(vehicleId: number): string {
    return this.ownerAccordion.toggleGlyph(this.ownerAccordionKey(vehicleId));
  }

  loadOwnerVehicles(): void {
    this.loadingOwnerVehicles = true;
    this.api.getOwnerVehicles().subscribe({
      next: (list) => {
        this.ownerVehicles = list;
        this.syncOwnerEditDrafts();
        this.ownerAccordion.syncWithValues(list.map((x) => this.ownerAccordionKey(x.id)));
        this.loadingOwnerVehicles = false;
        this.applyOwnerPlateQueryToAccordion();
      },
      error: async () => {
        this.loadingOwnerVehicles = false;
        const t = await this.toast.create({
          message: 'No se pudieron cargar tus vehículos.',
          duration: 2800,
          color: 'danger',
        });
        await t.present();
      },
    });
  }

  private syncOwnerEditDrafts(): void {
    const next: Record<number, { brand: string; color: string; cylinder_cc: string }> = {};
    for (const v of this.ownerVehicles) {
      next[v.id] = {
        brand: v.brand ?? '',
        color: v.color ?? '',
        cylinder_cc: v.cylinder_cc ?? '',
      };
    }
    this.ownerEditDrafts = next;
  }

  async saveOwnerVehicle(v: OwnerVehicle): Promise<void> {
    const d = this.ownerEditDrafts[v.id];
    if (!d) {
      return;
    }
    this.savingOwnerVehicleId = v.id;
    this.api
      .patchOwnerVehicle(v.id, {
        brand: d.brand.trim() || null,
        color: d.color.trim() || null,
        cylinder_cc: d.cylinder_cc.trim() || null,
      })
      .subscribe({
        next: (updated) => {
          const i = this.ownerVehicles.findIndex((x) => x.id === updated.id);
          if (i >= 0) {
            this.ownerVehicles[i] = updated;
          }
          this.syncOwnerEditDrafts();
          this.savingOwnerVehicleId = null;
          void this.presentToast('Vehículo actualizado.', 'success');
        },
        error: async (err: unknown) => {
          this.savingOwnerVehicleId = null;
          const t = await this.toast.create({
            message: this.apiErrorMessage(err, 'No se pudo guardar.'),
            duration: 3000,
            color: 'danger',
          });
          await t.present();
        },
      });
  }

  openOwnerHistory(): void {
    this.ownerHistoryVisible = true;
    if (!this.ownerVehicles.length) {
      return;
    }
    this.ownerHistoryLoading = true;
    forkJoin(this.ownerVehicles.map((v) => this.api.getOwnerVehicleSessions(v.id))).subscribe({
      next: (all) => {
        const map: Record<number, OwnerSessionHistoryRow[]> = {};
        this.ownerVehicles.forEach((v, i) => {
          map[v.id] = all[i] ?? [];
        });
        this.ownerHistoryByVehicleId = map;
        this.ownerHistoryLoading = false;
      },
      error: async () => {
        this.ownerHistoryLoading = false;
        const t = await this.toast.create({
          message: 'No se pudo cargar el historial.',
          duration: 2800,
          color: 'danger',
        });
        await t.present();
      },
    });
  }
}
