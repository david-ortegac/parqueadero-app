import { injectable } from 'inversify';

import { DomainVehicleEntity } from '../../../domain/Entities/DomainVehicleEntity';
import { DynamoVehicleItem } from '../Entity/VehicleDynamoEntity';
import { IInfraestructureMapper } from './IInfraestructureMapper';

@injectable()
export class InfraestructureMapperImpl implements IInfraestructureMapper {
  toDomain(item: DynamoVehicleItem): DomainVehicleEntity {
    return {
      id: item.id,
      plate: item.plate,
      depositor_document: item.depositor_document,
      vehicle_class: item.vehicle_class,
      owner_user_id: item.owner_user_id || null,
      brand: item.brand || null,
      color: item.color || null,
      cylinder_cc: item.cylinder_cc || null,
      photo_path: item.photo_path || null,
      registered_by_user_id: item.registered_by_user_id || null,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }

  toEntity(domain: DomainVehicleEntity): DynamoVehicleItem {
    const now = new Date().toISOString();
    return {
      id: domain.id,
      plate: domain.plate,
      depositor_document: domain.depositor_document,
      vehicle_class: domain.vehicle_class,
      owner_user_id: domain.owner_user_id || null,
      brand: domain.brand || null,
      color: domain.color || null,
      cylinder_cc: domain.cylinder_cc || null,
      photo_path: domain.photo_path || null,
      registered_by_user_id: domain.registered_by_user_id || null,
      created_at: domain.created_at || now,
      updated_at: now,
    };
  }

  toDomainList(items: DynamoVehicleItem[]): DomainVehicleEntity[] {
    return items.map((item) => this.toDomain(item));
  }
}
