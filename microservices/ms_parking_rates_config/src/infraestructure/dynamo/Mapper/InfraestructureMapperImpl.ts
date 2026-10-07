import { injectable } from 'inversify';

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
import { IInfraestructureMapper } from './IInfraestructureMapper';

@injectable()
export class InfraestructureMapperImpl implements IInfraestructureMapper {
  rateToDomain(item: DynamoRateItem): DomainRateEntity {
    return {
      id: item.id || `${item.vehicle_class}_${item.billing_mode}`,
      vehicle_class: item.vehicle_class,
      billing_mode: item.billing_mode,
      price: item.price,
      currency: item.currency || 'COP',
      is_active: item.is_active !== undefined ? item.is_active : true,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }

  rateToEntity(domain: DomainRateEntity): DynamoRateItem {
    const now = new Date().toISOString();
    return {
      pk: 'RATE',
      sk: `${domain.vehicle_class}#${domain.billing_mode}`,
      id: domain.id || `${domain.vehicle_class}_${domain.billing_mode}`,
      vehicle_class: domain.vehicle_class,
      billing_mode: domain.billing_mode,
      price: domain.price,
      currency: domain.currency || 'COP',
      is_active: domain.is_active !== undefined ? domain.is_active : true,
      created_at: domain.created_at || now,
      updated_at: now,
    };
  }

  rateListToDomain(items: DynamoRateItem[]): DomainRateEntity[] {
    return items.map(item => this.rateToDomain(item));
  }

  capacityToDomain(item: DynamoCapacityItem): DomainCapacityEntity {
    return {
      id: item.id || item.vehicle_class,
      vehicle_class: item.vehicle_class,
      max_slots: Number(item.max_slots),
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }

  capacityToEntity(domain: DomainCapacityEntity): DynamoCapacityItem {
    const now = new Date().toISOString();
    return {
      pk: 'CAPACITY',
      sk: domain.vehicle_class,
      id: domain.id || domain.vehicle_class,
      vehicle_class: domain.vehicle_class,
      max_slots: domain.max_slots,
      created_at: domain.created_at || now,
      updated_at: now,
    };
  }

  capacityListToDomain(items: DynamoCapacityItem[]): DomainCapacityEntity[] {
    return items.map(item => this.capacityToDomain(item));
  }

  scheduleToDomain(item: DynamoScheduleItem): DomainScheduleEntity {
    return {
      id: item.id || `schedule_${item.day_of_week}`,
      day_of_week: Number(item.day_of_week),
      opens_at: item.opens_at,
      closes_at: item.closes_at,
      is_closed: Boolean(item.is_closed),
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }

  scheduleToEntity(domain: DomainScheduleEntity): DynamoScheduleItem {
    const now = new Date().toISOString();
    return {
      pk: 'SCHEDULE',
      sk: `DAY#${domain.day_of_week}`,
      id: domain.id || `schedule_${domain.day_of_week}`,
      day_of_week: domain.day_of_week,
      opens_at: domain.opens_at,
      closes_at: domain.closes_at,
      is_closed: domain.is_closed,
      created_at: domain.created_at || now,
      updated_at: now,
    };
  }

  scheduleListToDomain(items: DynamoScheduleItem[]): DomainScheduleEntity[] {
    return items.map(item => this.scheduleToDomain(item));
  }
}
