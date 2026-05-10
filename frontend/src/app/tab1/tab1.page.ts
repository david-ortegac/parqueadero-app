import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import {
  groupRatesByVehicleClass,
  labelBillingMode as billingModeCatalogLabel,
  OCCUPANCY_CHART_COLORS,
  OCCUPANCY_CHART_LABELS,
} from '../constants/parking-billing.catalog';
import { AuthService } from '../services/auth.service';
import { ParkingApiService, DashboardResponse, Rate } from '../services/parking-api.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit {
  readonly billingModeLabel = billingModeCatalogLabel;

  dashboard: DashboardResponse | null = null;
  rates: Rate[] = [];
  /** Borradores locales por id de tarifa (solo admin). */
  rateDrafts: Record<number, { price: number; is_active: boolean }> = {};
  savingRateId: number | null = null;
  revenueTotal: string | null = null;
  loading = true;
  error: string | null = null;

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

  constructor(
    readonly auth: AuthService,
    private readonly api: ParkingApiService,
    private readonly toast: ToastController,
  ) {}

  ngOnInit(): void {
    this.chartOptions = {
      plugins: {
        legend: {
          position: 'bottom',
          labels: { usePointStyle: true, padding: 16 },
        },
      },
      cutout: '68%',
      maintainAspectRatio: false,
    };
    this.load();
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
      return;
    }

    this.api.getDashboard().subscribe({
      next: (d) => {
        this.dashboard = d;
        this.syncChart();
        this.loading = false;
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
    if (!this.dashboard) {
      return;
    }
    const c = this.dashboard.occupancy.car.active;
    const m = this.dashboard.occupancy.motorcycle.active;
    const total = c + m;
    if (total === 0) {
      this.chartData = {
        labels: ['Sin vehículos'],
        datasets: [
          {
            data: [1],
            backgroundColor: ['#e2e8f0'],
            hoverBackgroundColor: ['#cbd5e1'],
          },
        ],
      };
      return;
    }
    this.chartData = {
      labels: [...OCCUPANCY_CHART_LABELS],
      datasets: [
        {
          data: [c, m],
          backgroundColor: [OCCUPANCY_CHART_COLORS.car.fill, OCCUPANCY_CHART_COLORS.motorcycle.fill],
          hoverBackgroundColor: [
            OCCUPANCY_CHART_COLORS.car.hover,
            OCCUPANCY_CHART_COLORS.motorcycle.hover,
          ],
        },
      ],
    };
  }

  get totalActive(): number {
    if (!this.dashboard) {
      return 0;
    }
    return (
      this.dashboard.occupancy.car.active + this.dashboard.occupancy.motorcycle.active
    );
  }

  shareCar(): number {
    if (!this.dashboard || this.totalActive === 0) {
      return 0;
    }
    return Math.round((this.dashboard.occupancy.car.active / this.totalActive) * 1000) / 10;
  }

  shareMoto(): number {
    if (!this.dashboard || this.totalActive === 0) {
      return 0;
    }
    return Math.round((this.dashboard.occupancy.motorcycle.active / this.totalActive) * 1000) / 10;
  }

  pct(active: number, cap: number | null): number {
    if (!cap || cap <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((active / cap) * 100));
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

  formatMoney(value: string | null): string {
    if (value === null || value === undefined) {
      return '—';
    }
    const n = Number(value);
    if (Number.isNaN(n)) {
      return String(value);
    }
    return new Intl.NumberFormat('es-CO', {
      maximumFractionDigits: 0,
    }).format(n);
  }
}
