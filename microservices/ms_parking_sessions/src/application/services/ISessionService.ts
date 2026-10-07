import {
  BillingMode,
  DomainParkingSessionEntity,
  VehicleClass,
} from '../../domain/Entities/DomainSessionEntity';

export interface ISessionService {
  checkIn(data: {
    plate: string;
    depositor_document: string;
    vehicle_class: VehicleClass;
    billing_mode: BillingMode;
    owner_user_id?: string | number;
    registered_by_user_id?: string;
  }): Promise<DomainParkingSessionEntity>;

  checkOut(sessionId: string): Promise<DomainParkingSessionEntity>;

  getActiveSessions(): Promise<DomainParkingSessionEntity[]>;

  getDashboard(): Promise<{
    occupancy: {
      car: { active: number; capacity: number | null };
      motorcycle: { active: number; capacity: number | null };
    };
  }>;

  getRevenueSummary(
    from?: string,
    to?: string,
  ): Promise<{
    total: string;
    by_vehicle_class: Record<string, string>;
    by_billing_mode: Record<string, string>;
  }>;

  getDailyHistory(dateStr: string): Promise<{
    date: string;
    timezone: string;
    completed_exits: DomainParkingSessionEntity[];
    open_stays: DomainParkingSessionEntity[];
  }>;

  lookupPublicSessionByPlate(plate: string): Promise<Record<string, unknown>>;

  getPublicOccupancy(): Promise<{
    car: { active: number; capacity: number | null; available: number | null };
    motorcycle: { active: number; capacity: number | null; available: number | null };
  }>;

  getOwnerActiveSession(vehicleId: string): Promise<Record<string, unknown> | null>;

  getOwnerVehicleSessions(vehicleId: string): Promise<DomainParkingSessionEntity[]>;
}
