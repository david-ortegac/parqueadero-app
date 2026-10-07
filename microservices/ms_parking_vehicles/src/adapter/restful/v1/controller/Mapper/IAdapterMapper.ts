import { DomainVehicleEntity } from '../../../../domain/Entities/DomainVehicleEntity';
import { AdapterVehicleDTO } from '../Entity/AdapterVehicleDTO';

export interface IAdapterMapper {
  toDTO(domain: DomainVehicleEntity): AdapterVehicleDTO;
  toDTOList(domains: DomainVehicleEntity[]): AdapterVehicleDTO[];
}
