export interface AdapterActiveSessionDTO {
  id: string | number;
  billing_mode: string;
  entered_at: string;
  amount_due: string;
  amount_due_live: string;
  uses_live_estimate: boolean;
  period_starts_at?: string | null;
  period_ends_at?: string | null;
  subscription_entry_day?: number | null;
  subscription_period_days?: number | null;
  rate_unit_price: string | null;
  rate_currency: string;
}

export interface AdapterVehicleDTO {
  id: string | number;
  plate: string;
  depositor_document?: string | null;
  vehicle_class: string;
  owner_user_id?: string | null;
  brand?: string | null;
  color?: string | null;
  cylinder_cc?: string | null;
  photo_url?: string | null;
  created_at?: string;
  active_session?: AdapterActiveSessionDTO | null;
}
