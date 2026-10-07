export interface AdapterRateDTO {
  id: string | number;
  vehicle_class: string;
  billing_mode: string;
  price: string;
  currency: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AdapterCapacityDTO {
  id: string | number;
  vehicle_class: string;
  max_slots: number;
}

export interface AdapterScheduleDTO {
  id: string | number;
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
}

export interface AdapterParkingInfoDTO {
  name: string | null;
  address: string | null;
  car_capacity: number | null;
  motorcycle_capacity: number | null;
}
