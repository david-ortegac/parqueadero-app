export interface PublicOccupancyClass {
  active: number;
  capacity: number | null;
  available: number | null;
}

export interface PublicOccupancy {
  car: PublicOccupancyClass;
  motorcycle: PublicOccupancyClass;
}

export interface PublicPlateLookup {
  plate: string;
  is_parked: boolean;
  vehicle_class?: string;
  billing_mode?: string;
  entered_at?: string;
  amount_due?: string;
  amount_due_live?: string;
  uses_live_estimate?: boolean;
  period_ends_at?: string | null;
  rate_currency?: string;
}
