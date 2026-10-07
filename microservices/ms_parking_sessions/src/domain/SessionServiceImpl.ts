import { inject, injectable } from 'inversify';

import { ISessionService } from '../application/services/ISessionService';
import { IInfraestructureMapper } from '../infraestructure/dynamo/Mapper/IInfraestructureMapper';
import { RatesConfigReader } from '../infraestructure/dynamo/RatesConfigReader';
import { SessionRepository } from '../infraestructure/dynamo/Repository/SessionRepository';
import { TYPES } from '../ioc/Types';
import { ColombianPlateValidator } from '../utils/plate-validator';
import {
  BillingMode,
  DomainParkingSessionEntity,
  VehicleClass,
} from './Entities/DomainSessionEntity';

@injectable()
export class SessionServiceImpl implements ISessionService {
  constructor(
    @inject(TYPES.SessionRepository)
    private readonly repository: SessionRepository,
    @inject(TYPES.IInfraestructureMapper)
    private readonly mapper: IInfraestructureMapper,
    @inject(TYPES.RatesConfigReader)
    private readonly ratesReader: RatesConfigReader,
  ) {}

  private calculateAmount(enteredAtIso: string, mode: BillingMode, unitPrice: number): string {
    const entry = new Date(enteredAtIso).getTime();
    const exit = Date.now();
    const diffMs = Math.max(0, exit - entry);
    const diffMinutes = Math.max(1, Math.ceil(diffMs / (1000 * 60)));
    const diffHours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
    const diffDays = Math.max(1, Math.ceil(diffMinutes / (24 * 60)));

    let total = 0;
    switch (mode) {
      case 'minute':
        total = diffMinutes * unitPrice;
        break;
      case 'hour':
        total = diffHours * unitPrice;
        break;
      case 'day':
        total = diffDays * unitPrice;
        break;
      case 'week':
      case 'month':
        total = unitPrice;
        break;
    }

    return total.toFixed(2);
  }

  async checkIn(data: {
    plate: string;
    depositor_document: string;
    vehicle_class: VehicleClass;
    billing_mode: BillingMode;
    owner_user_id?: string | number;
    registered_by_user_id?: string;
  }): Promise<DomainParkingSessionEntity> {
    const normalizedPlate = ColombianPlateValidator.normalize(data.plate);
    if (!ColombianPlateValidator.isValid(normalizedPlate, data.vehicle_class)) {
      throw new Error(ColombianPlateValidator.messageFor(data.vehicle_class));
    }

    const docDigits = data.depositor_document.replace(/\D+/g, '');
    if (!docDigits || docDigits.length > 15) {
      throw new Error('El documento debe contener solo números y como máximo 15 dígitos.');
    }

    // Check rate active
    const rate = await this.ratesReader.getRate(data.vehicle_class, data.billing_mode);
    if (!rate || !rate.is_active) {
      throw new Error('No existe tarifa activa para esta combinación.');
    }

    // Check capacity
    const capacity = await this.ratesReader.getCapacity(data.vehicle_class);
    if (capacity && capacity.max_slots > 0) {
      const activeCount = await this.repository.countActiveByVehicleClass(data.vehicle_class);
      if (activeCount >= capacity.max_slots) {
        throw new Error('Capacidad máxima alcanzada para esta clase de vehículo.');
      }
    }

    // Check if vehicle already has active session
    const vehicleId = `VEH_${normalizedPlate}`;
    const existingActive = await this.repository.findActiveByVehicleId(vehicleId);
    if (existingActive) {
      throw new Error('Este vehículo ya tiene una sesión activa.');
    }

    const now = new Date();
    const nowIso = now.toISOString();
    let amountDue = '0.00';
    let periodStart: string | null = null;
    let periodEnd: string | null = null;
    let subEntryDay: number | null = null;
    let subPeriodDays: number | null = null;

    if (data.billing_mode === 'week' || data.billing_mode === 'month') {
      const priceNum = parseFloat(rate.price) || 0;
      amountDue = priceNum.toFixed(2);
      periodStart = nowIso;
      const days = data.billing_mode === 'month' ? 30 : 7;
      const endD = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      periodEnd = endD.toISOString();
      subEntryDay = now.getDate();
      subPeriodDays = days;
    }

    const sessionId = Date.now().toString();

    const domainEntity: DomainParkingSessionEntity = {
      id: sessionId,
      vehicle_id: vehicleId,
      billing_mode: data.billing_mode,
      entered_at: nowIso,
      status: 'active',
      amount_due: amountDue,
      period_starts_at: periodStart,
      period_ends_at: periodEnd,
      subscription_entry_day: subEntryDay,
      subscription_period_days: subPeriodDays,
      registered_by_user_id: data.registered_by_user_id || null,
      vehicle: {
        id: vehicleId,
        plate: normalizedPlate,
        vehicle_class: data.vehicle_class,
        depositor_document: docDigits,
        owner: data.owner_user_id ? { id: data.owner_user_id, name: '' } : null,
      },
    };

    const item = this.mapper.toEntity(domainEntity);
    const saved = await this.repository.save(item);
    return this.mapper.toDomain(saved);
  }

  async checkOut(sessionId: string): Promise<DomainParkingSessionEntity> {
    const item = await this.repository.findById(sessionId);
    if (!item) {
      throw new Error('Sesión no encontrada.');
    }

    if (item.status !== 'active') {
      throw new Error('La sesión no está activa.');
    }

    let finalAmount = item.amount_due;
    if (['minute', 'hour', 'day'].includes(item.billing_mode)) {
      const rate = await this.ratesReader.getRate(item.vehicle_class || 'car', item.billing_mode);
      const unitPrice = rate ? parseFloat(rate.price) || 0 : 0;
      finalAmount = this.calculateAmount(item.entered_at, item.billing_mode, unitPrice);
    }

    const nowIso = new Date().toISOString();
    item.status = 'completed';
    item.exited_at = nowIso;
    item.exit_date = nowIso.split('T')[0];
    item.amount_due = finalAmount;
    item.amount_paid = finalAmount;
    item.updated_at = nowIso;

    const saved = await this.repository.save(item);
    return this.mapper.toDomain(saved);
  }

  async getActiveSessions(): Promise<DomainParkingSessionEntity[]> {
    const items = await this.repository.findActiveSessions();
    return this.mapper.toDomainList(items);
  }

  async getDashboard(): Promise<{
    occupancy: {
      car: { active: number; capacity: number | null };
      motorcycle: { active: number; capacity: number | null };
    };
  }> {
    const [activeCars, activeMotos, capCar, capMoto] = await Promise.all([
      this.repository.countActiveByVehicleClass('car'),
      this.repository.countActiveByVehicleClass('motorcycle'),
      this.ratesReader.getCapacity('car'),
      this.ratesReader.getCapacity('motorcycle'),
    ]);

    return {
      occupancy: {
        car: { active: activeCars, capacity: capCar ? capCar.max_slots : null },
        motorcycle: { active: activeMotos, capacity: capMoto ? capMoto.max_slots : null },
      },
    };
  }

  async getRevenueSummary(
    from?: string,
    to?: string,
  ): Promise<{
    total: string;
    by_vehicle_class: Record<string, string>;
    by_billing_mode: Record<string, string>;
  }> {
    const items = await this.repository.findCompletedSessions(from, to);

    let total = 0;
    const byClass: Record<string, number> = {};
    const byMode: Record<string, number> = {};

    for (const item of items) {
      const amt = parseFloat(item.amount_paid || '0') || 0;
      total += amt;

      const vClass = item.vehicle_class || 'car';
      byClass[vClass] = (byClass[vClass] || 0) + amt;

      const bMode = item.billing_mode || 'minute';
      byMode[bMode] = (byMode[bMode] || 0) + amt;
    }

    const byClassFormatted: Record<string, string> = {};
    for (const [k, v] of Object.entries(byClass)) {
      byClassFormatted[k] = v.toFixed(2);
    }

    const byModeFormatted: Record<string, string> = {};
    for (const [k, v] of Object.entries(byMode)) {
      byModeFormatted[k] = v.toFixed(2);
    }

    return {
      total: total.toFixed(2),
      by_vehicle_class: byClassFormatted,
      by_billing_mode: byModeFormatted,
    };
  }

  async getDailyHistory(dateStr: string): Promise<{
    date: string;
    timezone: string;
    completed_exits: DomainParkingSessionEntity[];
    open_stays: DomainParkingSessionEntity[];
  }> {
    const endOfDayIso = `${dateStr}T23:59:59.999Z`;

    const [completedItems, openStayItems] = await Promise.all([
      this.repository.findDailyCompleted(dateStr),
      this.repository.findOpenStays(endOfDayIso),
    ]);

    return {
      date: dateStr,
      timezone: 'America/Bogota',
      completed_exits: this.mapper.toDomainList(completedItems),
      open_stays: this.mapper.toDomainList(openStayItems),
    };
  }

  async lookupPublicSessionByPlate(plate: string): Promise<Record<string, unknown>> {
    const normalized = ColombianPlateValidator.normalize(plate);
    if (!normalized || !ColombianPlateValidator.isValidAnyClass(normalized)) {
      throw new Error(
        'Formato de placa no válido. Usa el formato colombiano (ej. ABC123 o ABC12A).',
      );
    }

    const vehicleId = `VEH_${normalized}`;
    const session = await this.repository.findActiveByVehicleId(vehicleId);

    if (!session) {
      return {
        plate: normalized,
        is_parked: false,
      };
    }

    const vClass = session.vehicle_class || 'car';
    const rate = await this.ratesReader.getRate(vClass, session.billing_mode);
    const unitPrice = rate ? parseFloat(rate.price) || 0 : 0;

    let amountLive = session.amount_due;
    let usesLiveEstimate = false;

    if (['minute', 'hour', 'day'].includes(session.billing_mode)) {
      amountLive = this.calculateAmount(session.entered_at, session.billing_mode, unitPrice);
      usesLiveEstimate = true;
    }

    return {
      plate: normalized,
      is_parked: true,
      vehicle_class: vClass,
      billing_mode: session.billing_mode,
      entered_at: session.entered_at,
      amount_due: session.amount_due,
      amount_due_live: amountLive,
      uses_live_estimate: usesLiveEstimate,
      period_ends_at: session.period_ends_at,
      rate_currency: rate?.currency || 'COP',
    };
  }

  async getPublicOccupancy(): Promise<{
    car: { active: number; capacity: number | null; available: number | null };
    motorcycle: { active: number; capacity: number | null; available: number | null };
  }> {
    const [activeCars, activeMotos, capCar, capMoto] = await Promise.all([
      this.repository.countActiveByVehicleClass('car'),
      this.repository.countActiveByVehicleClass('motorcycle'),
      this.ratesReader.getCapacity('car'),
      this.ratesReader.getCapacity('motorcycle'),
    ]);

    const maxCar = capCar ? capCar.max_slots : null;
    const maxMoto = capMoto ? capMoto.max_slots : null;

    return {
      car: {
        active: activeCars,
        capacity: maxCar,
        available: maxCar !== null ? Math.max(0, maxCar - activeCars) : null,
      },
      motorcycle: {
        active: activeMotos,
        capacity: maxMoto,
        available: maxMoto !== null ? Math.max(0, maxMoto - activeMotos) : null,
      },
    };
  }

  async getOwnerActiveSession(vehicleId: string): Promise<Record<string, unknown> | null> {
    const session = await this.repository.findActiveByVehicleId(vehicleId);
    if (!session) {
      return null;
    }

    const vClass = session.vehicle_class || 'car';
    const rate = await this.ratesReader.getRate(vClass, session.billing_mode);
    const unitPrice = rate ? parseFloat(rate.price) || 0 : 0;

    let amountLive = session.amount_due;
    let usesLiveEstimate = false;

    if (['minute', 'hour', 'day'].includes(session.billing_mode)) {
      amountLive = this.calculateAmount(session.entered_at, session.billing_mode, unitPrice);
      usesLiveEstimate = true;
    }

    return {
      id: session.id,
      billing_mode: session.billing_mode,
      entered_at: session.entered_at,
      amount_due: session.amount_due,
      amount_due_live: amountLive,
      uses_live_estimate: usesLiveEstimate,
      period_starts_at: session.period_starts_at,
      period_ends_at: session.period_ends_at,
      subscription_entry_day: session.subscription_entry_day,
      subscription_period_days: session.subscription_period_days,
      rate_unit_price: rate?.price || null,
      rate_currency: rate?.currency || 'COP',
    };
  }

  async getOwnerVehicleSessions(vehicleId: string): Promise<DomainParkingSessionEntity[]> {
    const items = await this.repository.findSessionsByVehicleId(vehicleId);
    return this.mapper.toDomainList(items);
  }
}
