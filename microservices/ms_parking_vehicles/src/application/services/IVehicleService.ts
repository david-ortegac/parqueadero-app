import { DomainVehicleEntity, VehicleClass } from '../../domain/Entities/DomainVehicleEntity';

export interface IVehicleService {
  getOwnerVehicles(ownerUserId: string, document?: string): Promise<DomainVehicleEntity[]>;
  getVehicleById(vehicleId: string, ownerUserId?: string): Promise<DomainVehicleEntity>;
  updateVehicleProfile(
    vehicleId: string,
    ownerUserId: string,
    data: {
      brand?: string | null;
      color?: string | null;
      cylinder_cc?: string | null;
      photo_path?: string | null;
    },
  ): Promise<DomainVehicleEntity>;
  findOrCreateVehicle(data: {
    plate: string;
    depositor_document: string;
    vehicle_class: VehicleClass;
    owner_user_id?: string | null;
    registered_by_user_id?: string | null;
  }): Promise<DomainVehicleEntity>;
  findByPlate(plate: string): Promise<DomainVehicleEntity | null>;
}
