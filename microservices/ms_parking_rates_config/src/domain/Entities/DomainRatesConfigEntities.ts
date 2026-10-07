export type VehicleClass = 'car' | 'motorcycle';
export type BillingMode = 'minute' | 'hour' | 'day' | 'week' | 'month';

export interface DomainRateEntity {
  id: string; // e.g. "car_minute"
  vehicle_class: VehicleClass;
  billing_mode: BillingMode;
  price: string;
  currency: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DomainCapacityEntity {
  id: string;
  vehicle_class: VehicleClass;
  max_slots: number;
  created_at?: string;
  updated_at?: string;
}

export interface DomainScheduleEntity {
  id: string;
  day_of_week: number; // 0 (Sunday) - 6 (Saturday)
  opens_at: string | null; // "06:00"
  closes_at: string | null; // "22:00"
  is_closed: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DomainParkingInfoEntity {
  name: string | null;
  address: string | null;
  car_capacity: number | null;
  motorcycle_capacity: number | null;
}
