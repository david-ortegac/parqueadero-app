/** Modelos de dominio del parqueadero (compartidos entre servicios y componentes). */

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
  subscription_entry_day?: number | null;
  subscription_period_days?: number | null;
  vehicle?: {
    plate: string;
    vehicle_class: string;
    depositor_document?: string | null;
    owner?: { id: number; name: string; document?: string | null } | null;
  };
}

export interface DailyHistoryResponse {
  date: string;
  timezone: string;
  completed_exits: ParkingSession[];
  open_stays: ParkingSession[];
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
  rate_unit_price: string | null;
  rate_currency: string;
}

export interface OwnerVehicle {
  id: number;
  plate: string;
  vehicle_class: string;
  brand: string | null;
  color: string | null;
  cylinder_cc: string | null;
  photo_url: string | null;
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

export interface OwnerSessionHistoryRow {
  id: number;
  billing_mode: string;
  entered_at: string;
  exited_at: string | null;
  amount_due: string;
  amount_paid: string | null;
}

export interface RevenueSummary {
  total: string;
  by_vehicle_class: Record<string, string>;
  by_billing_mode: Record<string, string>;
}
