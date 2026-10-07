export interface DynamoRateItem {
  pk: string; // 'RATE'
  sk: string; // '<vehicle_class>#<billing_mode>'
  id: string;
  vehicle_class: 'car' | 'motorcycle';
  billing_mode: 'minute' | 'hour' | 'day' | 'week' | 'month';
  price: string;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DynamoCapacityItem {
  pk: string; // 'CAPACITY'
  sk: string; // '<vehicle_class>'
  id: string;
  vehicle_class: 'car' | 'motorcycle';
  max_slots: number;
  created_at: string;
  updated_at: string;
}

export interface DynamoScheduleItem {
  pk: string; // 'SCHEDULE'
  sk: string; // 'DAY#<day_of_week>'
  id: string;
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
  created_at: string;
  updated_at: string;
}

export interface DynamoSettingItem {
  pk: string; // 'SETTING'
  sk: string; // 'PARKING_INFO'
  name: string | null;
  address: string | null;
  updated_at: string;
}
