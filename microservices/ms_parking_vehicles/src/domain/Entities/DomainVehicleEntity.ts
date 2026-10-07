export type VehicleClass = 'car' | 'motorcycle';

export interface DomainVehicleEntity {
  id: string;
  plate: string;
  depositor_document: string;
  vehicle_class: VehicleClass;
  owner_user_id?: string | null;
  brand?: string | null;
  color?: string | null;
  cylinder_cc?: string | null;
  photo_path?: string | null;
  registered_by_user_id?: string | null;
  created_at?: string;
  updated_at?: string;
}
