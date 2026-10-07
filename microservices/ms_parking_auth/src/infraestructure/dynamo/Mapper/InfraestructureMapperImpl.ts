import { injectable } from 'inversify';

import { DomainUserEntity } from '../../../domain/Entities/DomainUserEntity';
import { DynamoUserItem } from '../Entity/UserDynamoEntity';
import { IInfraestructureMapper } from './IInfraestructureMapper';

@injectable()
export class InfraestructureMapperImpl implements IInfraestructureMapper {
  toDomain(item: DynamoUserItem): DomainUserEntity {
    return {
      id: item.id,
      name: item.name,
      email: item.email,
      document: item.document,
      password: item.password,
      role: item.role,
      is_active: item.is_active !== undefined ? item.is_active : true,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }

  toEntity(domain: DomainUserEntity): DynamoUserItem {
    const now = new Date().toISOString();
    return {
      id: domain.id,
      name: domain.name,
      email: domain.email,
      document: domain.document,
      password: domain.password || '',
      role: domain.role,
      is_active: domain.is_active !== undefined ? domain.is_active : false,
      created_at: domain.created_at || now,
      updated_at: now,
    };
  }

  toDomainList(items: DynamoUserItem[]): DomainUserEntity[] {
    return items.map(item => this.toDomain(item));
  }
}
