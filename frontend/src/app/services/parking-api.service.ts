import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Rate {
  id: number;
  vehicle_class: string;
  billing_mode: string;
  price: string;
  currency: string;
  is_active: boolean;
}

export interface DashboardResponse {
  occupancy: {
    car: { active: number; capacity: number | null };
    motorcycle: { active: number; capacity: number | null };
  };
}

export interface ParkingSession {
  id: number;
  vehicle_id: number;
  billing_mode: string;
  entered_at: string;
  exited_at?: string | null;
  status: string;
  amount_due: string;
  amount_paid?: string | null;
  period_starts_at?: string | null;
  period_ends_at?: string | null;
  /** Día del mes (1–31) en America/Bogotá al ingreso; semana/mes prepago. */
  subscription_entry_day?: number | null;
  /** Duración del período prepago: 7 (semana) o 30 (mes). */
  subscription_period_days?: number | null;
  vehicle?: {
    plate: string;
    vehicle_class: string;
    depositor_document?: string | null;
    /** Usuario propietario vinculado al vehículo en la app, si existe. */
    owner?: { id: number; name: string; document?: string | null } | null;
  };
}

export interface DailyHistoryResponse {
  date: string;
  timezone: string;
  completed_exits: ParkingSession[];
  open_stays: ParkingSession[];
}

export interface OwnerVehicle {
  id: number;
  plate: string;
  vehicle_class: string;
  brand: string | null;
  color: string | null;
  cylinder_cc: string | null;
  photo_url: string | null;
  /** Sesión activa en el parqueadero, si existe (incluye cobro y tarifa vigente). */
  active_session?: OwnerActiveSession | null;
}

export interface OperatorVehicleOwnerRow {
  id: number;
  name: string;
  email: string;
  document: string | null;
  is_active: boolean;
  created_at: string;
}

export interface OwnerActiveSession {
  id: number;
  billing_mode: string;
  entered_at: string;
  amount_due: string;
  amount_due_live: string;
  uses_live_estimate: boolean;
  period_starts_at: string | null;
  period_ends_at: string | null;
  subscription_entry_day?: number | null;
  subscription_period_days?: number | null;
  /** Precio unitario de la tarifa aplicada (minuto, hora, día, semana o mes). */
  rate_unit_price: string | null;
  rate_currency: string;
}

export interface OwnerSessionHistoryRow {
  id: number;
  billing_mode: string;
  entered_at: string;
  exited_at: string | null;
  amount_due: string;
  amount_paid: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ParkingApiService {
  private readonly base = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  getDashboard(): Observable<DashboardResponse> {
    return this.http.get<DashboardResponse>(`${this.base}/operator/dashboard`);
  }

  getActiveSessions(): Observable<ParkingSession[]> {
    return this.http.get<ParkingSession[]>(`${this.base}/operator/sessions/active`);
  }

  checkIn(body: {
    plate: string;
    depositor_document: string;
    vehicle_class: string;
    billing_mode: string;
    owner_user_id?: number;
  }): Observable<{ session: ParkingSession }> {
    return this.http.post<{ session: ParkingSession }>(`${this.base}/operator/check-in`, body);
  }

  checkOut(sessionId: number): Observable<ParkingSession> {
    return this.http.post<ParkingSession>(`${this.base}/operator/sessions/${sessionId}/check-out`, {});
  }

  getDailyHistory(date: string): Observable<DailyHistoryResponse> {
    const params = new HttpParams().set('date', date);
    return this.http.get<DailyHistoryResponse>(`${this.base}/operator/reports/daily-history`, { params });
  }

  getRevenueSummary(from?: string, to?: string): Observable<{
    total: string;
    by_vehicle_class: Record<string, string>;
    by_billing_mode: Record<string, string>;
  }> {
    let params = new HttpParams();
    if (from) {
      params = params.set('from', from);
    }
    if (to) {
      params = params.set('to', to);
    }
    return this.http.get<{
      total: string;
      by_vehicle_class: Record<string, string>;
      by_billing_mode: Record<string, string>;
    }>(`${this.base}/operator/reports/revenue`, { params });
  }

  getAdminRates(): Observable<Rate[]> {
    return this.http.get<Rate[]>(`${this.base}/admin/rates`);
  }

  patchAdminRate(
    rateId: number,
    body: { price?: number; currency?: string; is_active?: boolean },
  ): Observable<Rate> {
    return this.http.patch<Rate>(`${this.base}/admin/rates/${rateId}`, body);
  }

  getOwnerVehicles(): Observable<OwnerVehicle[]> {
    return this.http.get<OwnerVehicle[]>(`${this.base}/owner/vehicles`);
  }

  registerPushDevice(body: { token: string; platform: 'ios' | 'android' | 'web' }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/push-devices`, body);
  }

  getOwnerActiveSession(vehicleId: number): Observable<OwnerActiveSession> {
    return this.http.get<OwnerActiveSession>(`${this.base}/owner/vehicles/${vehicleId}/active-session`);
  }

  getOwnerVehicleSessions(vehicleId: number): Observable<OwnerSessionHistoryRow[]> {
    return this.http.get<OwnerSessionHistoryRow[]>(`${this.base}/owner/vehicles/${vehicleId}/sessions`);
  }

  patchOwnerVehicle(
    vehicleId: number,
    body: { brand?: string | null; color?: string | null; cylinder_cc?: string | null },
  ): Observable<OwnerVehicle> {
    return this.http.patch<OwnerVehicle>(`${this.base}/owner/vehicles/${vehicleId}`, body);
  }

  getOperatorVehicleOwners(): Observable<OperatorVehicleOwnerRow[]> {
    return this.http.get<OperatorVehicleOwnerRow[]>(`${this.base}/operator/vehicle-owners`);
  }

  patchVehicleOwnerActivation(userId: number, body: { is_active: boolean }): Observable<{ id: number; is_active: boolean }> {
    return this.http.patch<{ id: number; is_active: boolean }>(
      `${this.base}/operator/vehicle-owners/${userId}`,
      body,
    );
  }
}
