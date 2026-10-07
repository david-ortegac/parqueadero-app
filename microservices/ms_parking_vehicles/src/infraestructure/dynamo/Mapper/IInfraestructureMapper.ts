import { DomainVehicleEntity } from '../../../domain/Entities/DomainVehicleEntity';
import { DynamoVehicleItem } from '../Entity/VehicleDynamoEntity';

export interface IInfraestructureMapper {
  toDomain(item: DynamoVehicleItem): DomainVehicleEntity;
  toEntity(domain: DomainVehicleEntity): DynamoVehicleItem;
  toDomainList(items: DynamoVehicleItem[]): DomainVehicleEntity[];
}
