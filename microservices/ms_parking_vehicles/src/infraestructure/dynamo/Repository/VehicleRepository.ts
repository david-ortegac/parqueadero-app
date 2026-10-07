import { DynamoVehicleItem } from '../Entity/VehicleDynamoEntity';

export interface VehicleRepository {
  findById(id: string): Promise<DynamoVehicleItem | null>;
  findByPlate(plate: string): Promise<DynamoVehicleItem | null>;
  findByOwnerId(ownerUserId: string): Promise<DynamoVehicleItem[]>;
  findByDocument(document: string): Promise<DynamoVehicleItem[]>;
  save(item: DynamoVehicleItem): Promise<DynamoVehicleItem>;
  delete(id: string): Promise<void>;
}
