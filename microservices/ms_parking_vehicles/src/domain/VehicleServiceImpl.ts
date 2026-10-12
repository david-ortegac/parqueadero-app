import { inject, injectable } from 'inversify';

import { IVehicleService } from '../application/services/IVehicleService';
import { IInfraestructureMapper } from '../infraestructure/dynamo/Mapper/IInfraestructureMapper';
import { DynamoVehicleItem } from '../infraestructure/dynamo/Entity/VehicleDynamoEntity';
import { VehicleRepository } from '../infraestructure/dynamo/Repository/VehicleRepository';
import { TYPES } from '../ioc/Types';
import { ColombianPlateValidator } from '../utils/plate-validator';
import {
  DomainActiveSessionEntity,
  DomainVehicleEntity,
  VehicleClass,
} from './Entities/DomainVehicleEntity';

@injectable()
export class VehicleServiceImpl implements IVehicleService {
  constructor(
    @inject(TYPES.VehicleRepository)
    private readonly repository: VehicleRepository,
    @inject(TYPES.IInfraestructureMapper)
    private readonly mapper: IInfraestructureMapper,
  ) {}

  private calculateLiveAmount(enteredAtIso: string, mode: string, unitPrice: number): string {
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
      default:
        total = unitPrice;
        break;
    }

    return total.toFixed(2);
  }

  private async resolveActiveSession(
    plate: string,
    vehicleId: string,
    vehicleClass: VehicleClass,
  ): Promise<DomainActiveSessionEntity | null> {
    try {
      const session = await this.repository.findActiveSession(plate, vehicleId);
      if (!session) {
        return null;
      }

      const mode = session.billing_mode;
      const rate = await this.repository.findRate(vehicleClass, mode);
      const unitPrice = rate ? parseFloat(rate.price) || 0 : 0;

      let amountLive = session.amount_due || '0.00';
      let usesLiveEstimate = false;

      if (['minute', 'hour', 'day'].includes(mode)) {
        amountLive = this.calculateLiveAmount(session.entered_at, mode, unitPrice);
        usesLiveEstimate = true;
      }

      return {
        id: session.id,
        billing_mode: mode,
        entered_at: session.entered_at,
        amount_due: session.amount_due || '0.00',
        amount_due_live: amountLive,
        uses_live_estimate: usesLiveEstimate,
        period_starts_at: session.period_starts_at || null,
        period_ends_at: session.period_ends_at || null,
        subscription_entry_day:
          session.subscription_entry_day != null ? Number(session.subscription_entry_day) : null,
        subscription_period_days:
          session.subscription_period_days != null ? Number(session.subscription_period_days) : null,
        rate_unit_price: rate?.price != null ? String(rate.price) : null,
        rate_currency: rate?.currency || 'COP',
      };
    } catch (err) {
      console.warn('[VehicleServiceImpl] Error resolving active session:', err);
      return null;
    }
  }

  async getOwnerVehicles(ownerUserId: string, document?: string): Promise<DomainVehicleEntity[]> {
    const cleanDoc = document ? document.replace(/\D+/g, '') : '';

    // 1. Vincular vehículos no reclamados en ParkingVehicles
    if (cleanDoc) {
      const unclaimed = await this.repository.findByDocument(cleanDoc);
      for (const item of unclaimed) {
        if (!item.owner_user_id) {
          item.owner_user_id = ownerUserId;
          item.updated_at = new Date().toISOString();
          await this.repository.save(item);
        }
      }
    }

    // 2. Descubrir vehículos desde ParkingSessions si aún no están en ParkingVehicles
    if (cleanDoc || ownerUserId) {
      const sessions = await this.repository.findSessionsByDocumentOrOwner(cleanDoc, ownerUserId);
      for (const s of sessions) {
        if (s.vehicle_plate) {
          const plate = s.vehicle_plate.toUpperCase().trim();
          const existing = await this.repository.findByPlate(plate);
          if (!existing) {
            const now = new Date().toISOString();
            const newItem: DynamoVehicleItem = {
              id: s.vehicle_id || `VEH_${plate}`,
              plate,
              depositor_document: s.depositor_document || cleanDoc,
              vehicle_class: s.vehicle_class || 'car',
              owner_user_id: ownerUserId,
              brand: null,
              color: null,
              cylinder_cc: null,
              photo_path: null,
              created_at: s.entered_at || now,
              updated_at: now,
            };
            await this.repository.save(newItem);
          } else if (!existing.owner_user_id) {
            existing.owner_user_id = ownerUserId;
            existing.updated_at = new Date().toISOString();
            await this.repository.save(existing);
          }
        }
      }
    }

    // 3. Obtener vehículos del propietario
    let items = await this.repository.findByOwnerId(ownerUserId);

    if (items.length === 0 && cleanDoc) {
      items = await this.repository.findByDocument(cleanDoc);
    }

    // 4. Adjuntar sesión activa a cada vehículo
    const result: DomainVehicleEntity[] = [];
    for (const item of items) {
      const domain = this.mapper.toDomain(item);
      domain.active_session = await this.resolveActiveSession(
        domain.plate,
        domain.id,
        domain.vehicle_class,
      );
      result.push(domain);
    }

    return result;
  }

  async getVehicleById(vehicleId: string, ownerUserId?: string): Promise<DomainVehicleEntity> {
    const item = await this.repository.findById(vehicleId);
    if (!item) {
      throw new Error('Vehículo no encontrado.');
    }

    if (ownerUserId && item.owner_user_id && item.owner_user_id !== ownerUserId) {
      const err = Object.assign(new Error('No autorizado para ver este vehículo.'), {
        statusCode: 403,
      });
      throw err;
    }

    const domain = this.mapper.toDomain(item);
    domain.active_session = await this.resolveActiveSession(
      domain.plate,
      domain.id,
      domain.vehicle_class,
    );
    return domain;
  }

  async updateVehicleProfile(
    vehicleId: string,
    ownerUserId: string,
    data: {
      brand?: string | null;
      color?: string | null;
      cylinder_cc?: string | null;
      photo_path?: string | null;
    },
  ): Promise<DomainVehicleEntity> {
    const item = await this.repository.findById(vehicleId);
    if (!item) {
      throw new Error('Vehículo no encontrado.');
    }

    if (item.owner_user_id && item.owner_user_id !== ownerUserId) {
      const err = Object.assign(new Error('No autorizado para modificar este vehículo.'), {
        statusCode: 403,
      });
      throw err;
    }

    const updatedItem = {
      ...item,
      brand: data.brand !== undefined ? data.brand : item.brand,
      color: data.color !== undefined ? data.color : item.color,
      cylinder_cc: data.cylinder_cc !== undefined ? data.cylinder_cc : item.cylinder_cc,
      photo_path: data.photo_path !== undefined ? data.photo_path : item.photo_path,
      owner_user_id: item.owner_user_id || ownerUserId,
      updated_at: new Date().toISOString(),
    };

    const saved = await this.repository.save(updatedItem);
    return this.mapper.toDomain(saved);
  }

  async findOrCreateVehicle(data: {
    plate: string;
    depositor_document: string;
    vehicle_class: VehicleClass;
    owner_user_id?: string | null;
    registered_by_user_id?: string | null;
  }): Promise<DomainVehicleEntity> {
    const normalizedPlate = ColombianPlateValidator.normalize(data.plate);
    if (!ColombianPlateValidator.isValid(normalizedPlate, data.vehicle_class)) {
      throw new Error(ColombianPlateValidator.messageFor(data.vehicle_class));
    }

    const docDigits = data.depositor_document.replace(/\D+/g, '');
    if (!docDigits || docDigits.length > 15) {
      throw new Error('El documento debe contener solo números y como máximo 15 dígitos.');
    }

    const existing = await this.repository.findByPlate(normalizedPlate);
    if (existing) {
      const updatedItem = {
        ...existing,
        depositor_document: docDigits,
        vehicle_class: data.vehicle_class,
        owner_user_id: data.owner_user_id || existing.owner_user_id || null,
        updated_at: new Date().toISOString(),
      };
      const saved = await this.repository.save(updatedItem);
      return this.mapper.toDomain(saved);
    }

    const vehicleId = Date.now().toString();
    const newItem = {
      id: vehicleId,
      plate: normalizedPlate,
      depositor_document: docDigits,
      vehicle_class: data.vehicle_class,
      owner_user_id: data.owner_user_id || null,
      registered_by_user_id: data.registered_by_user_id || null,
      brand: null,
      color: null,
      cylinder_cc: null,
      photo_path: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const saved = await this.repository.save(newItem);
    return this.mapper.toDomain(saved);
  }

  async findByPlate(plate: string): Promise<DomainVehicleEntity | null> {
    const normalizedPlate = ColombianPlateValidator.normalize(plate);
    const item = await this.repository.findByPlate(normalizedPlate);
    return item ? this.mapper.toDomain(item) : null;
  }
}
