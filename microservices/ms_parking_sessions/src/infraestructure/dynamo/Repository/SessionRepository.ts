import { DynamoSessionItem } from '../Entity/SessionDynamoEntity';

export interface SessionRepository {
  findById(id: string): Promise<DynamoSessionItem | null>;
  findActiveByVehicleId(vehicleId: string): Promise<DynamoSessionItem | null>;
  findActiveSessions(): Promise<DynamoSessionItem[]>;
  countActiveByVehicleClass(vehicleClass: 'car' | 'motorcycle'): Promise<number>;
  findSessionsByVehicleId(vehicleId: string): Promise<DynamoSessionItem[]>;
  findCompletedSessions(fromDate?: string, toDate?: string): Promise<DynamoSessionItem[]>;
  findDailyCompleted(dateStr: string): Promise<DynamoSessionItem[]>;
  findOpenStays(endOfDayIso: string): Promise<DynamoSessionItem[]>;
  save(item: DynamoSessionItem): Promise<DynamoSessionItem>;
  ensureVehicle(data: {
    plate: string;
    vehicle_class: string;
    depositor_document: string;
    owner_user_id?: string | number | null;
  }): Promise<void>;
}
