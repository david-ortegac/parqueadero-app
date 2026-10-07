export type UserRole = 'admin' | 'operator' | 'vehicle_owner';

export interface DomainUserEntity {
  id: string; // e.g. "1" or uuid
  name: string;
  email: string;
  document: string;
  password?: string;
  role: UserRole;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}
