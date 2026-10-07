import { injectable } from 'inversify';

import { DomainVehicleEntity } from '../../../../../domain/Entities/DomainVehicleEntity';
import { AdapterVehicleDTO } from '../Entity/AdapterVehicleDTO';
import { IAdapterMapper } from './IAdapterMapper';

@injectable()
export class AdapterMapperImpl implements IAdapterMapper {
  toDTO(domain: DomainVehicleEntity): AdapterVehicleDTO {
    return {
      id: domain.id,
      plate: domain.plate,
      depositor_document: domain.depositor_document,
      vehicle_class: domain.vehicle_class,
      owner_user_id: domain.owner_user_id,
      brand: domain.brand,
      color: domain.color,
      cylinder_cc: domain.cylinder_cc,
      photo_url: domain.photo_path,
      created_at: domain.created_at,
    };
  }

  toDTOList(domains: DomainVehicleEntity[]): AdapterVehicleDTO[] {
    return domains.map(d => this.toDTO(d));
  }
}
