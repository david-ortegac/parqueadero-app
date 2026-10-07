import { injectable } from 'inversify';

import { DomainParkingSessionEntity } from '../../../../../domain/Entities/DomainSessionEntity';
import { AdapterSessionDTO } from '../Entity/AdapterSessionDTO';
import { IAdapterMapper } from './IAdapterMapper';

@injectable()
export class AdapterMapperImpl implements IAdapterMapper {
  toDTO(domain: DomainParkingSessionEntity): AdapterSessionDTO {
    return {
      id: domain.id,
      vehicle_id: domain.vehicle_id,
      billing_mode: domain.billing_mode,
      entered_at: domain.entered_at,
      exited_at: domain.exited_at,
      status: domain.status,
      amount_due: domain.amount_due,
      amount_paid: domain.amount_paid,
      period_starts_at: domain.period_starts_at,
      period_ends_at: domain.period_ends_at,
      subscription_entry_day: domain.subscription_entry_day,
      subscription_period_days: domain.subscription_period_days,
      vehicle: domain.vehicle
        ? {
            plate: domain.vehicle.plate,
            vehicle_class: domain.vehicle.vehicle_class,
            depositor_document: domain.vehicle.depositor_document,
            owner: domain.vehicle.owner,
          }
        : null,
    };
  }

  toDTOList(domains: DomainParkingSessionEntity[]): AdapterSessionDTO[] {
    return domains.map(d => this.toDTO(d));
  }
}
