export interface DynamoUserItem {
  id: string;
  name: string;
  email: string;
  document: string;
  password: string;
  role: 'admin' | 'operator' | 'vehicle_owner';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
