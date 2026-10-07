import {
  BillingMode,
  DomainCapacityEntity,
  DomainParkingInfoEntity,
  DomainRateEntity,
  DomainScheduleEntity,
  VehicleClass,
} from '../../domain/Entities/DomainRatesConfigEntities';

export interface IRatesConfigService {
  getRates(): Promise<DomainRateEntity[]>;
  saveRate(data: {
    vehicle_class: VehicleClass;
    billing_mode: BillingMode;
    price: string | number;
    currency?: string;
    is_active?: boolean;
  }): Promise<DomainRateEntity>;
  updateRate(
    rateId: string,
    data: { price?: number | string; currency?: string; is_active?: boolean }
  ): Promise<DomainRateEntity>;
  deleteRate(rateId: string): Promise<void>;

  getCapacities(): Promise<DomainCapacityEntity[]>;
  saveCapacity(vehicleClass: VehicleClass, maxSlots: number): Promise<DomainCapacityEntity>;

  getSchedules(): Promise<DomainScheduleEntity[]>;
  saveSchedule(
    dayOfWeek: number,
    opensAt: string | null,
    closesAt: string | null,
    isClosed?: boolean
  ): Promise<DomainScheduleEntity>;

  getParkingInfo(): Promise<DomainParkingInfoEntity>;
  updateParkingInfo(data: {
    name?: string | null;
    address?: string | null;
    car_capacity?: number | null;
    motorcycle_capacity?: number | null;
  }): Promise<DomainParkingInfoEntity>;
}
