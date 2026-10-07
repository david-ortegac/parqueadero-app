export interface AdapterUserDTO {
  id: string | number;
  name: string;
  email: string;
  document?: string;
  role: string;
  is_active: boolean;
  created_at?: string;
}
