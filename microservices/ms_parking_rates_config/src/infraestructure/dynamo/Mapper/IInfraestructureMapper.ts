import {
  DomainCapacityEntity,
  DomainRateEntity,
  DomainScheduleEntity,
} from '../../../domain/Entities/DomainRatesConfigEntities';
import {
  DynamoCapacityItem,
  DynamoRateItem,
  DynamoScheduleItem,
} from '../Entity/RatesConfigDynamoEntities';

export interface IInfraestructureMapper {
  rateToDomain(item: DynamoRateItem): DomainRateEntity;
  rateToEntity(domain: DomainRateEntity): DynamoRateItem;
  rateListToDomain(items: DynamoRateItem[]): DomainRateEntity[];

  capacityToDomain(item: DynamoCapacityItem): DomainCapacityEntity;
  capacityToEntity(domain: DomainCapacityEntity): DynamoCapacityItem;
  capacityListToDomain(items: DynamoCapacityItem[]): DomainCapacityEntity[];

  scheduleToDomain(item: DynamoScheduleItem): DomainScheduleEntity;
  scheduleToEntity(domain: DomainScheduleEntity): DynamoScheduleItem;
  scheduleListToDomain(items: DynamoScheduleItem[]): DomainScheduleEntity[];
}
