export interface DynamoSessionItem {
  id: string;
  vehicle_id: string;
  status: 'active' | 'completed';
  exit_date?: string | null; // Format "YYYY-MM-DD" for DateIndex
  billing_mode: 'minute' | 'hour' | 'day' | 'week' | 'month';
  entered_at: string;
  exited_at?: string | null;
  amount_due: string;
  amount_paid?: string | null;
  period_starts_at?: string | null;
  period_ends_at?: string | null;
  subscription_entry_day?: number | null;
  subscription_period_days?: number | null;
  registered_by_user_id?: string | null;
  vehicle_plate?: string;
  vehicle_class?: 'car' | 'motorcycle';
  depositor_document?: string | null;
  owner_user_id?: string | null;
  owner_name?: string | null;
  owner_document?: string | null;
  created_at: string;
  updated_at: string;
}
