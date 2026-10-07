import { DomainParkingSessionEntity } from '../../../../domain/Entities/DomainSessionEntity';
import { AdapterSessionDTO } from '../Entity/AdapterSessionDTO';

export interface IAdapterMapper {
  toDTO(domain: DomainParkingSessionEntity): AdapterSessionDTO;
  toDTOList(domains: DomainParkingSessionEntity[]): AdapterSessionDTO[];
}
