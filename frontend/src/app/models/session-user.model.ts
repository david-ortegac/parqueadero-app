export interface SessionUser {
  id: number;
  name: string;
  email: string;
  /** Cédula normalizada (solo dígitos), solo aplica a propietarios. */
  document?: string | null;
  role: 'admin' | 'operator' | 'vehicle_owner';
}
