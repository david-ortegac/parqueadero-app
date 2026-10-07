import { inject, injectable } from 'inversify';

import { IRatesConfigService } from '../application/services/IRatesConfigService';
import { IInfraestructureMapper } from '../infraestructure/dynamo/Mapper/IInfraestructureMapper';
import { RatesConfigRepository } from '../infraestructure/dynamo/Repository/RatesConfigRepository';
import { TYPES } from '../ioc/Types';
import {
  BillingMode,
  DomainCapacityEntity,
  DomainParkingInfoEntity,
  DomainRateEntity,
  DomainScheduleEntity,
  VehicleClass,
} from './Entities/DomainRatesConfigEntities';

@injectable()
export class RatesConfigServiceImpl implements IRatesConfigService {
  constructor(
    @inject(TYPES.RatesConfigRepository)
    private readonly repository: RatesConfigRepository,
    @inject(TYPES.IInfraestructureMapper)
    private readonly mapper: IInfraestructureMapper,
  ) {}

  async getRates(): Promise<DomainRateEntity[]> {
    const items = await this.repository.findAllRates();
    return this.mapper.rateListToDomain(items);
  }

  async saveRate(data: {
    vehicle_class: VehicleClass;
    billing_mode: BillingMode;
    price: string | number;
    currency?: string;
    is_active?: boolean;
  }): Promise<DomainRateEntity> {
    const domainEntity: DomainRateEntity = {
      id: `${data.vehicle_class}_${data.billing_mode}`,
      vehicle_class: data.vehicle_class,
      billing_mode: data.billing_mode,
      price: String(data.price),
      currency: data.currency || 'COP',
      is_active: data.is_active !== undefined ? data.is_active : true,
    };

    const item = this.mapper.rateToEntity(domainEntity);
    const saved = await this.repository.saveRate(item);
    return this.mapper.rateToDomain(saved);
  }

  async updateRate(
    rateId: string,
    data: { price?: number | string; currency?: string; is_active?: boolean },
  ): Promise<DomainRateEntity> {
    // Parse rateId, e.g. "car_minute" or from query/path
    let [vClass, bMode] = rateId.split('_') as [VehicleClass, BillingMode];
    if (!bMode && rateId.includes('#')) {
      [vClass, bMode] = rateId.split('#') as [VehicleClass, BillingMode];
    }

    let existing = await this.repository.findRate(vClass, bMode);
    if (!existing) {
      // Try finding by ID if passed as numeric or different string
      const all = await this.repository.findAllRates();
      const match = all.find(
        r => r.id === rateId || `${r.vehicle_class}_${r.billing_mode}` === rateId,
      );
      if (match) {
        existing = match;
        vClass = match.vehicle_class;
        bMode = match.billing_mode;
      }
    }

    if (!existing) {
      throw new Error(`Tarifa no encontrada: ${rateId}`);
    }

    const updatedItem = {
      ...existing,
      ...(data.price !== undefined ? { price: String(data.price) } : {}),
      ...(data.currency !== undefined ? { currency: data.currency } : {}),
      ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
      updated_at: new Date().toISOString(),
    };

    const saved = await this.repository.saveRate(updatedItem);
    return this.mapper.rateToDomain(saved);
  }

  async deleteRate(rateId: string): Promise<void> {
    let [vClass, bMode] = rateId.split('_');
    if (!bMode && rateId.includes('#')) {
      [vClass, bMode] = rateId.split('#');
    }

    const existing = await this.repository.findRate(vClass, bMode);
    if (!existing) {
      const all = await this.repository.findAllRates();
      const match = all.find(
        r => r.id === rateId || `${r.vehicle_class}_${r.billing_mode}` === rateId,
      );
      if (match) {
        vClass = match.vehicle_class;
        bMode = match.billing_mode;
      }
    }

    if (vClass && bMode) {
      await this.repository.deleteRate(vClass, bMode);
    }
  }

  async getCapacities(): Promise<DomainCapacityEntity[]> {
    const items = await this.repository.findAllCapacities();
    return this.mapper.capacityListToDomain(items);
  }

  async saveCapacity(vehicleClass: VehicleClass, maxSlots: number): Promise<DomainCapacityEntity> {
    const domainEntity: DomainCapacityEntity = {
      id: vehicleClass,
      vehicle_class: vehicleClass,
      max_slots: maxSlots,
    };

    const item = this.mapper.capacityToEntity(domainEntity);
    const saved = await this.repository.saveCapacity(item);
    return this.mapper.capacityToDomain(saved);
  }

  async getSchedules(): Promise<DomainScheduleEntity[]> {
    const items = await this.repository.findAllSchedules();
    return this.mapper.scheduleListToDomain(items);
  }

  async saveSchedule(
    dayOfWeek: number,
    opensAt: string | null,
    closesAt: string | null,
    isClosed?: boolean,
  ): Promise<DomainScheduleEntity> {
    const domainEntity: DomainScheduleEntity = {
      id: `schedule_${dayOfWeek}`,
      day_of_week: dayOfWeek,
      opens_at: opensAt,
      closes_at: closesAt,
      is_closed: isClosed ?? false,
    };

    const item = this.mapper.scheduleToEntity(domainEntity);
    const saved = await this.repository.saveSchedule(item);
    return this.mapper.scheduleToDomain(saved);
  }

  async getParkingInfo(): Promise<DomainParkingInfoEntity> {
    const [info, carCap, motoCap] = await Promise.all([
      this.repository.getParkingInfo(),
      this.repository.findCapacity('car'),
      this.repository.findCapacity('motorcycle'),
    ]);

    return {
      name: info.name,
      address: info.address,
      car_capacity: carCap ? carCap.max_slots : null,
      motorcycle_capacity: motoCap ? motoCap.max_slots : null,
    };
  }

  async updateParkingInfo(data: {
    name?: string | null;
    address?: string | null;
    car_capacity?: number | null;
    motorcycle_capacity?: number | null;
  }): Promise<DomainParkingInfoEntity> {
    if (data.name !== undefined || data.address !== undefined) {
      await this.repository.saveParkingInfo(data.name, data.address);
    }

    if (data.car_capacity !== undefined) {
      if (data.car_capacity === null) {
        await this.repository.deleteCapacity('car');
      } else {
        await this.saveCapacity('car', data.car_capacity);
      }
    }

    if (data.motorcycle_capacity !== undefined) {
      if (data.motorcycle_capacity === null) {
        await this.repository.deleteCapacity('motorcycle');
      } else {
        await this.saveCapacity('motorcycle', data.motorcycle_capacity);
      }
    }

    return this.getParkingInfo();
  }
}
