import { DynamoVehicleItem } from '../Entity/VehicleDynamoEntity';

export interface VehicleRepository {
  findById(id: string): Promise<DynamoVehicleItem | null>;
  findByPlate(plate: string): Promise<DynamoVehicleItem | null>;
  findByOwnerId(ownerUserId: string): Promise<DynamoVehicleItem[]>;
  findByDocument(document: string): Promise<DynamoVehicleItem[]>;
  findSessionsByDocumentOrOwner(document?: string, ownerUserId?: string): Promise<Record<string, any>[]>;
  findActiveSession(plate: string, vehicleId?: string): Promise<Record<string, any> | null>;
  findRate(vehicleClass: string, billingMode: string): Promise<Record<string, any> | null>;
  save(item: DynamoVehicleItem): Promise<DynamoVehicleItem>;
  delete(id: string): Promise<void>;
}
