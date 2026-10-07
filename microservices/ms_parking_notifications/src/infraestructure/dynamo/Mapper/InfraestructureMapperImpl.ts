import { injectable } from 'inversify';

import { DomainPushDeviceEntity } from '../../../domain/Entities/DomainDeviceEntity';
import { DynamoPushDeviceItem } from '../Entity/DeviceDynamoEntity';
import { IInfraestructureMapper } from './IInfraestructureMapper';

@injectable()
export class InfraestructureMapperImpl implements IInfraestructureMapper {
  toDomain(item: DynamoPushDeviceItem): DomainPushDeviceEntity {
    return {
      token: item.token,
      user_id: item.user_id,
      platform: item.platform,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }

  toEntity(domain: DomainPushDeviceEntity): DynamoPushDeviceItem {
    const now = new Date().toISOString();
    return {
      token: domain.token,
      user_id: domain.user_id,
      platform: domain.platform,
      created_at: domain.created_at || now,
      updated_at: now,
    };
  }

  toDomainList(items: DynamoPushDeviceItem[]): DomainPushDeviceEntity[] {
    return items.map(i => this.toDomain(i));
  }
}
