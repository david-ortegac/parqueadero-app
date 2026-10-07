import { DomainUserEntity } from '../../../../domain/Entities/DomainUserEntity';
import { AdapterUserDTO } from '../Entity/AdapterUserDTO';

export interface IAdapterMapper {
  toDTO(domain: DomainUserEntity): AdapterUserDTO;
  toDTOList(domains: DomainUserEntity[]): AdapterUserDTO[];
}
