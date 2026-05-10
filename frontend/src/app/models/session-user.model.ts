export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'operator' | 'vehicle_owner';
}
