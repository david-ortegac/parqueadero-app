import { injectable } from 'inversify';

import { DomainParkingSessionEntity } from '../../../domain/Entities/DomainSessionEntity';
import { DynamoSessionItem } from '../Entity/SessionDynamoEntity';
import { IInfraestructureMapper } from './IInfraestructureMapper';

@injectable()
export class InfraestructureMapperImpl implements IInfraestructureMapper {
  toDomain(item: DynamoSessionItem): DomainParkingSessionEntity {
    return {
      id: item.id,
      vehicle_id: item.vehicle_id,
      billing_mode: item.billing_mode,
      entered_at: item.entered_at,
      exited_at: item.exited_at || null,
      status: item.status,
      amount_due: item.amount_due,
      amount_paid: item.amount_paid || null,
      period_starts_at: item.period_starts_at || null,
      period_ends_at: item.period_ends_at || null,
      subscription_entry_day: item.subscription_entry_day || null,
      subscription_period_days: item.subscription_period_days || null,
      registered_by_user_id: item.registered_by_user_id || null,
      vehicle: item.vehicle_plate
        ? {
            id: item.vehicle_id,
            plate: item.vehicle_plate,
            vehicle_class: item.vehicle_class || 'car',
            depositor_document: item.depositor_document || null,
            owner: item.owner_user_id
              ? {
                  id: item.owner_user_id,
                  name: item.owner_name || '',
                  document: item.owner_document || null,
                }
              : null,
          }
        : null,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }

  toEntity(domain: DomainParkingSessionEntity): DynamoSessionItem {
    const now = new Date().toISOString();
    let exitDate: string | null = null;
    if (domain.exited_at) {
      exitDate = domain.exited_at.split('T')[0];
    }

    return {
      id: domain.id,
      vehicle_id: domain.vehicle_id,
      status: domain.status,
      exit_date: exitDate,
      billing_mode: domain.billing_mode,
      entered_at: domain.entered_at,
      exited_at: domain.exited_at || null,
      amount_due: domain.amount_due,
      amount_paid: domain.amount_paid || null,
      period_starts_at: domain.period_starts_at || null,
      period_ends_at: domain.period_ends_at || null,
      subscription_entry_day: domain.subscription_entry_day || null,
      subscription_period_days: domain.subscription_period_days || null,
      registered_by_user_id: domain.registered_by_user_id || null,
      vehicle_plate: domain.vehicle?.plate,
      vehicle_class: domain.vehicle?.vehicle_class,
      depositor_document: domain.vehicle?.depositor_document || null,
      owner_user_id: domain.vehicle?.owner?.id ? String(domain.vehicle.owner.id) : null,
      owner_name: domain.vehicle?.owner?.name || null,
      owner_document: domain.vehicle?.owner?.document || null,
      created_at: domain.created_at || now,
      updated_at: now,
    };
  }

  toDomainList(items: DynamoSessionItem[]): DomainParkingSessionEntity[] {
    return items.map(i => this.toDomain(i));
  }
}
