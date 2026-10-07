import {
  DynamoCapacityItem,
  DynamoRateItem,
  DynamoScheduleItem,
} from '../Entity/RatesConfigDynamoEntities';

export interface RatesConfigRepository {
  findAllRates(): Promise<DynamoRateItem[]>;
  findRate(vehicleClass: string, billingMode: string): Promise<DynamoRateItem | null>;
  saveRate(item: DynamoRateItem): Promise<DynamoRateItem>;
  deleteRate(vehicleClass: string, billingMode: string): Promise<void>;

  findAllCapacities(): Promise<DynamoCapacityItem[]>;
  findCapacity(vehicleClass: string): Promise<DynamoCapacityItem | null>;
  saveCapacity(item: DynamoCapacityItem): Promise<DynamoCapacityItem>;
  deleteCapacity(vehicleClass: string): Promise<void>;

  findAllSchedules(): Promise<DynamoScheduleItem[]>;
  findSchedule(dayOfWeek: number): Promise<DynamoScheduleItem | null>;
  saveSchedule(item: DynamoScheduleItem): Promise<DynamoScheduleItem>;

  getParkingInfo(): Promise<{ name: string | null; address: string | null }>;
  saveParkingInfo(name?: string | null, address?: string | null): Promise<void>;
}
