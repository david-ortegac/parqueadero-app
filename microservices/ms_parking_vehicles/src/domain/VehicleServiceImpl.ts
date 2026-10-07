import { inject, injectable } from 'inversify';

import { IVehicleService } from '../application/services/IVehicleService';
import { IInfraestructureMapper } from '../infraestructure/dynamo/Mapper/IInfraestructureMapper';
import { VehicleRepository } from '../infraestructure/dynamo/Repository/VehicleRepository';
import { TYPES } from '../ioc/Types';
import { ColombianPlateValidator } from '../utils/plate-validator';
import { DomainVehicleEntity, VehicleClass } from './Entities/DomainVehicleEntity';

@injectable()
export class VehicleServiceImpl implements IVehicleService {
  constructor(
    @inject(TYPES.VehicleRepository)
    private readonly repository: VehicleRepository,
    @inject(TYPES.IInfraestructureMapper)
    private readonly mapper: IInfraestructureMapper,
  ) {}

  async getOwnerVehicles(ownerUserId: string, document?: string): Promise<DomainVehicleEntity[]> {
    if (document) {
      const cleanDoc = document.replace(/\D+/g, '');
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
    }

    const items = await this.repository.findByOwnerId(ownerUserId);
    return this.mapper.toDomainList(items);
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

    return this.mapper.toDomain(item);
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
