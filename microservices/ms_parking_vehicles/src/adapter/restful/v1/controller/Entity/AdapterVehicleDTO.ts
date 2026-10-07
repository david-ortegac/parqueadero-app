export interface AdapterVehicleDTO {
  id: string | number;
  plate: string;
  depositor_document?: string | null;
  vehicle_class: string;
  owner_user_id?: string | null;
  brand?: string | null;
  color?: string | null;
  cylinder_cc?: string | null;
  photo_url?: string | null;
  created_at?: string;
}
