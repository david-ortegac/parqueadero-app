import { injectable } from 'inversify';

import { DomainUserEntity } from '../../../../domain/Entities/DomainUserEntity';
import { AdapterUserDTO } from '../Entity/AdapterUserDTO';
import { IAdapterMapper } from './IAdapterMapper';

@injectable()
export class AdapterMapperImpl implements IAdapterMapper {
  toDTO(domain: DomainUserEntity): AdapterUserDTO {
    return {
      id: domain.id,
      name: domain.name,
      email: domain.email,
      document: domain.document,
      role: domain.role,
      is_active: domain.is_active,
      created_at: domain.created_at,
    };
  }

  toDTOList(domains: DomainUserEntity[]): AdapterUserDTO[] {
    return domains.map((d) => this.toDTO(d));
  }
}
