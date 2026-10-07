import { DomainPushDeviceEntity } from '../../../domain/Entities/DomainDeviceEntity';
import { DynamoPushDeviceItem } from '../Entity/DeviceDynamoEntity';

export interface IInfraestructureMapper {
  toDomain(item: DynamoPushDeviceItem): DomainPushDeviceEntity;
  toEntity(domain: DomainPushDeviceEntity): DynamoPushDeviceItem;
  toDomainList(items: DynamoPushDeviceItem[]): DomainPushDeviceEntity[];
}
