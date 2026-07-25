import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  BILLING_MODE_LABEL,
  BillingModeId,
  PARKING_DISPLAY_LOCALE,
  PARKING_DISPLAY_TIMEZONE,
  VEHICLE_CLASS_LABEL_SHORT,
  VehicleClassId,
} from '../constants/parking-billing.catalog';
import { AuthService } from '../services/auth.service';
import { ParkingApiService } from '../services/parking-api.service';
import { PublicOccupancy, PublicPlateLookup } from '../services/public-plate-lookup.model';
import { apiErrorMessage } from '../utils/api-error-message';
import { formatCop, parkingElapsedLabel } from '../utils/format.utils';

@Component({
  selector: 'app-plate-lookup',
  templateUrl: './plate-lookup.page.html',
  styleUrls: ['./plate-lookup.page.scss'],
  standalone: false,
})
export class PlateLookupPage implements OnInit, OnDestroy {
  private readonly api = inject(ParkingApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly coTimezone = PARKING_DISPLAY_TIMEZONE;
  readonly coLocale = PARKING_DISPLAY_LOCALE;

  plate = '';
  loading = false;
  loadingOccupancy = false;
  errorMessage: string | null = null;
  result: PublicPlateLookup | null = null;
  occupancy: PublicOccupancy | null = null;
  searched = false;
  nowMs = Date.now();

  private elapsedTimer: ReturnType<typeof setInterval> | null = null;

  get isLoggedIn(): boolean {
    return this.auth.isLoggedIn();
  }

  get canSearch(): boolean {
    return this.normalizePlate(this.plate).length >= 5;
  }

  get showCarSpaces(): boolean {
    return this.occupancy?.car.capacity !== null && this.occupancy?.car.available !== null;
  }

  get showMotorcycleSpaces(): boolean {
    return (
      this.occupancy?.motorcycle.capacity !== null && this.occupancy?.motorcycle.available !== null
    );
  }

  get hasAvailableSpaces(): boolean {
    return this.showCarSpaces || this.showMotorcycleSpaces;
  }

  get entryTimeLabel(): string {
    if (!this.result?.entered_at) {
      return '';
    }
    return parkingElapsedLabel(this.result.entered_at, this.nowMs);
  }

  get entryClockParts(): { time: string; date: string } | null {
    if (!this.result?.entered_at) {
      return null;
    }
    try {
      const d = new Date(this.result.entered_at);
      const time = d.toLocaleTimeString(this.coLocale, {
        timeZone: this.coTimezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const date = d.toLocaleDateString(this.coLocale, {
        timeZone: this.coTimezone,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      return { time, date };
    } catch {
      return null;
    }
  }

  ngOnInit(): void {
    this.loadOccupancy();
    const fromQuery = this.route.snapshot.queryParamMap.get('plate');
    if (fromQuery) {
      this.plate = this.normalizePlate(fromQuery);
      if (this.canSearch) {
        void this.search();
      }
    }
    this.elapsedTimer = setInterval(() => {
      this.nowMs = Date.now();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.elapsedTimer !== null) {
      clearInterval(this.elapsedTimer);
      this.elapsedTimer = null;
    }
  }

  onPlateInput(value: string): void {
    this.plate = this.normalizePlate(value);
    this.errorMessage = null;
  }

  vehicleClassLabel(value: string | undefined): string {
    if (!value) {
      return '—';
    }
    return VEHICLE_CLASS_LABEL_SHORT[value as VehicleClassId] ?? value;
  }

  billingModeLabel(value: string | undefined): string {
    if (!value) {
      return '—';
    }
    return BILLING_MODE_LABEL[value as BillingModeId] ?? value;
  }

  amountLabel(row: PublicPlateLookup): string {
    const raw = row.uses_live_estimate ? row.amount_due_live : row.amount_due;
    return formatCop(raw ?? null);
  }

  async search(): Promise<void> {
    if (this.loading || !this.canSearch) {
      return;
    }
    const plate = this.normalizePlate(this.plate);
    this.loading = true;
    this.errorMessage = null;
    this.searched = true;
    this.result = null;
    this.plate = '';
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { plate },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.api.lookupPublicSessionByPlate(plate).subscribe({
      next: (row) => {
        this.loading = false;
        this.result = row;
        this.nowMs = Date.now();
        this.loadOccupancy();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = apiErrorMessage(err, 'No se pudo consultar la placa. Intenta de nuevo.');
      },
    });
  }

  goPanel(): void {
    void this.router.navigate(['/inicio']);
  }

  private loadOccupancy(): void {
    this.loadingOccupancy = true;
    this.api.getPublicOccupancy().subscribe({
      next: (row) => {
        this.occupancy = row;
        this.loadingOccupancy = false;
      },
      error: () => {
        this.loadingOccupancy = false;
      },
    });
  }

  private normalizePlate(value: string): string {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  }
}
