export type BillingMode = 'minute' | 'hour' | 'day' | 'week' | 'month';
export type VehicleClass = 'car' | 'motorcycle';
export type SessionStatus = 'active' | 'completed';

export interface SessionVehicleInfo {
  id?: string;
  plate: string;
  vehicle_class: VehicleClass;
  depositor_document?: string | null;
  owner?: {
    id: string | number;
    name: string;
    document?: string | null;
  } | null;
}

export interface DomainParkingSessionEntity {
  id: string;
  vehicle_id: string;
  billing_mode: BillingMode;
  entered_at: string;
  exited_at?: string | null;
  status: SessionStatus;
  amount_due: string;
  amount_paid?: string | null;
  period_starts_at?: string | null;
  period_ends_at?: string | null;
  subscription_entry_day?: number | null;
  subscription_period_days?: number | null;
  registered_by_user_id?: string | null;
  vehicle?: SessionVehicleInfo | null;
  created_at?: string;
  updated_at?: string;
}
