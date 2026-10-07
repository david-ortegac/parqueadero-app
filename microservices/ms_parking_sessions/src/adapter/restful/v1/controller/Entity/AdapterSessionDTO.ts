export interface AdapterSessionVehicleDTO {
  plate: string;
  vehicle_class: string;
  depositor_document?: string | null;
  owner?: {
    id: string | number;
    name: string;
    document?: string | null;
  } | null;
}

export interface AdapterSessionDTO {
  id: string | number;
  vehicle_id: string | number;
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
  vehicle?: AdapterSessionVehicleDTO | null;
}
