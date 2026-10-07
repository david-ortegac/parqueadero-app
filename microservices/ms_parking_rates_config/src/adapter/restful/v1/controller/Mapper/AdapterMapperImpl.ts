import { injectable } from 'inversify';

import {
  DomainCapacityEntity,
  DomainParkingInfoEntity,
  DomainRateEntity,
  DomainScheduleEntity,
} from '../../../../domain/Entities/DomainRatesConfigEntities';
import {
  AdapterCapacityDTO,
  AdapterParkingInfoDTO,
  AdapterRateDTO,
  AdapterScheduleDTO,
} from '../Entity/AdapterRatesConfigDTO';
import { IAdapterMapper } from './IAdapterMapper';

@injectable()
export class AdapterMapperImpl implements IAdapterMapper {
  rateToDTO(domain: DomainRateEntity): AdapterRateDTO {
    return {
      id: domain.id,
      vehicle_class: domain.vehicle_class,
      billing_mode: domain.billing_mode,
      price: domain.price,
      currency: domain.currency,
      is_active: domain.is_active,
      created_at: domain.created_at,
      updated_at: domain.updated_at,
    };
  }

  rateListToDTO(domains: DomainRateEntity[]): AdapterRateDTO[] {
    return domains.map(d => this.rateToDTO(d));
  }

  capacityToDTO(domain: DomainCapacityEntity): AdapterCapacityDTO {
    return {
      id: domain.id,
      vehicle_class: domain.vehicle_class,
      max_slots: domain.max_slots,
    };
  }

  capacityListToDTO(domains: DomainCapacityEntity[]): AdapterCapacityDTO[] {
    return domains.map(d => this.capacityToDTO(d));
  }

  scheduleToDTO(domain: DomainScheduleEntity): AdapterScheduleDTO {
    return {
      id: domain.id,
      day_of_week: domain.day_of_week,
      opens_at: domain.opens_at,
      closes_at: domain.closes_at,
      is_closed: domain.is_closed,
    };
  }

  scheduleListToDTO(domains: DomainScheduleEntity[]): AdapterScheduleDTO[] {
    return domains.map(d => this.scheduleToDTO(d));
  }

  parkingInfoToDTO(domain: DomainParkingInfoEntity): AdapterParkingInfoDTO {
    return {
      name: domain.name,
      address: domain.address,
      car_capacity: domain.car_capacity,
      motorcycle_capacity: domain.motorcycle_capacity,
    };
  }
}
