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
  vehicle?: { plate: string; vehicle_class: string; depositor_document?: string | null };
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
  photo_url: string | null;
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

  getOwnerActiveSession(vehicleId: number): Observable<{
    id: number;
    billing_mode: string;
    entered_at: string;
    amount_due: string;
    period_starts_at: string | null;
    period_ends_at: string | null;
  }> {
    return this.http.get<{
      id: number;
      billing_mode: string;
      entered_at: string;
      amount_due: string;
      period_starts_at: string | null;
      period_ends_at: string | null;
    }>(`${this.base}/owner/vehicles/${vehicleId}/active-session`);
  }
}
