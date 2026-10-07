import { inject, injectable } from 'inversify';

import { IVehicleService } from '../../../../application/services/IVehicleService';
import { TYPES } from '../../../../ioc/Types';
import { Response } from '../../../../models/Response';
import { hasRequiredRole, validateTokenFromEvent } from '../../../../utils/jwt-validator';
import { ResponseBuilder } from '../../../../utils/response-builder';
import { IAdapterMapper } from './Mapper/IAdapterMapper';
import { VehicleController } from './VehicleController';

@injectable()
export class VehicleControllerImpl implements VehicleController {
  constructor(
    @inject(TYPES.VehicleService)
    private readonly service: IVehicleService,
    @inject(TYPES.IAdapterMapper)
    private readonly mapper: IAdapterMapper
  ) {}

  private parseBody(event: any): any {
    if (!event.body) return {};
    if (typeof event.body === 'object') return event.body;
    try {
      return JSON.parse(event.body);
    } catch {
      return {};
    }
  }

  private getMethod(event: any): string {
    return (
      event?.requestContext?.http?.method ||
      event?.httpMethod ||
      'GET'
    ).toUpperCase();
  }

  private getPath(event: any): string {
    const raw =
      event?.rawPath ||
      event?.requestContext?.http?.path ||
      event?.path ||
      '';
    const clean = raw.split('?')[0];
    return clean.replace(/^\/api\/v1/, '').replace(/^\/v1/, '') || '/';
  }

  async handleRequest(event: any): Promise<Response> {
    const method = this.getMethod(event);
    const path = this.getPath(event);
    const body = this.parseBody(event);
    const pathParams = event?.pathParameters || {};

    console.log(`[VehicleController] ${method} ${path}`, { pathParams, body });

    if (method === 'OPTIONS') {
      return ResponseBuilder.noContent();
    }

    try {
      // 1. GET /owner/vehicles
      if (path === '/owner/vehicles' && method === 'GET') {
        const tokenRes = validateTokenFromEvent(event);
        if (!tokenRes.valid || !tokenRes.payload) {
          return ResponseBuilder.unauthorized('No autenticado.');
        }

        const vehicles = await this.service.getOwnerVehicles(
          String(tokenRes.payload.userId),
          tokenRes.payload.document
        );

        return ResponseBuilder.success(this.mapper.toDTOList(vehicles));
      }

      // 2. /owner/vehicles/{vehicleId}
      if (path.startsWith('/owner/vehicles/')) {
        const tokenRes = validateTokenFromEvent(event);
        if (!tokenRes.valid || !tokenRes.payload) {
          return ResponseBuilder.unauthorized('No autenticado.');
        }

        const vehicleId = pathParams.vehicle || path.replace('/owner/vehicles/', '');

        if (method === 'GET') {
          try {
            const vehicle = await this.service.getVehicleById(
              vehicleId,
              String(tokenRes.payload.userId)
            );
            return ResponseBuilder.success(this.mapper.toDTO(vehicle));
          } catch (err: any) {
            if (err.statusCode === 403) return ResponseBuilder.forbidden(err.message);
            return ResponseBuilder.notFound(err.message || 'Vehículo no encontrado.');
          }
        }

        if (method === 'PATCH') {
          try {
            const updated = await this.service.updateVehicleProfile(
              vehicleId,
              String(tokenRes.payload.userId),
              {
                brand: body.brand,
                color: body.color,
                cylinder_cc: body.cylinder_cc,
                photo_path: body.photo_url || body.photo_path,
              }
            );
            return ResponseBuilder.success(this.mapper.toDTO(updated));
          } catch (err: any) {
            if (err.statusCode === 403) return ResponseBuilder.forbidden(err.message);
            return ResponseBuilder.notFound(err.message || 'Vehículo no encontrado.');
          }
        }
      }

      // 3. /vehicles/by-plate/{plate} (Public or Operator/System)
      if (path.startsWith('/vehicles/by-plate/')) {
        const plate = pathParams.plate || path.replace('/vehicles/by-plate/', '');
        const vehicle = await this.service.findByPlate(plate);
        if (!vehicle) {
          return ResponseBuilder.notFound('Vehículo no encontrado.');
        }
        return ResponseBuilder.success(this.mapper.toDTO(vehicle));
      }

      // 4. POST /vehicles (Create or Register Vehicle)
      if (path === '/vehicles' && method === 'POST') {
        if (!body.plate || !body.vehicle_class || !body.depositor_document) {
          return ResponseBuilder.unprocessableEntity('plate, vehicle_class y depositor_document son requeridos.');
        }

        const tokenRes = validateTokenFromEvent(event);
        const registeredBy = tokenRes.valid ? String(tokenRes.payload?.userId) : undefined;

        try {
          const vehicle = await this.service.findOrCreateVehicle({
            plate: body.plate,
            depositor_document: body.depositor_document,
            vehicle_class: body.vehicle_class,
            owner_user_id: body.owner_user_id,
            registered_by_user_id: registeredBy,
          });

          return ResponseBuilder.created(this.mapper.toDTO(vehicle));
        } catch (err: any) {
          return ResponseBuilder.unprocessableEntity(err.message || 'Error al registrar vehículo.');
        }
      }

      return ResponseBuilder.notFound(`Ruta no encontrada: ${method} ${path}`);
    } catch (err: any) {
      console.error('Error handling vehicle request:', err);
      return ResponseBuilder.internalError(err);
    }
  }
}
