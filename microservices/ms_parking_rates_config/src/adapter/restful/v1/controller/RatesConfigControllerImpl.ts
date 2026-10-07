import { inject, injectable } from 'inversify';

import { IRatesConfigService } from '../../../../application/services/IRatesConfigService';
import { TYPES } from '../../../../ioc/Types';
import { Response, LambdaEvent } from '../../../../models/Response';
import { hasRequiredRole, validateTokenFromEvent } from '../../../../utils/jwt-validator';
import { ResponseBuilder } from '../../../../utils/response-builder';
import { IAdapterMapper } from './Mapper/IAdapterMapper';
import { RatesConfigController } from './RatesConfigController';

@injectable()
export class RatesConfigControllerImpl implements RatesConfigController {
  constructor(
    @inject(TYPES.RatesConfigService)
    private readonly service: IRatesConfigService,
    @inject(TYPES.IAdapterMapper)
    private readonly mapper: IAdapterMapper,
  ) {}

  private parseBody(event: LambdaEvent): Record<string, unknown> {
    if (!event.body) return {};
    if (typeof event.body === 'object') return event.body as Record<string, unknown>;
    try {
      return JSON.parse(event.body);
    } catch {
      return {};
    }
  }

  private getMethod(event: LambdaEvent): string {
    return (event?.requestContext?.http?.method || event?.httpMethod || 'GET').toUpperCase();
  }

  private getPath(event: LambdaEvent): string {
    const raw = event?.rawPath || event?.requestContext?.http?.path || event?.path || '';
    // Remove query string and normalise leading /v1
    const clean = raw.split('?')[0];
    return clean.replace(/^\/api\/v1/, '').replace(/^\/v1/, '') || '/';
  }

  async handleRequest(event: LambdaEvent): Promise<Response> {
    const method = this.getMethod(event);
    const path = this.getPath(event);
    const body = this.parseBody(event);
    const pathParams = event?.pathParameters || {};

    console.log(`[RatesConfigController] ${method} ${path}`, { pathParams, body });

    // Handle OPTIONS for CORS preflight
    if (method === 'OPTIONS') {
      return ResponseBuilder.noContent();
    }

    try {
      // 1. RATES: /admin/rates
      if (path === '/admin/rates') {
        if (method === 'GET') {
          const rates = await this.service.getRates();
          return ResponseBuilder.success(this.mapper.rateListToDTO(rates));
        }

        if (method === 'POST') {
          const tokenRes = validateTokenFromEvent(event);
          if (!tokenRes.valid || !hasRequiredRole(tokenRes.payload!, ['admin'])) {
            return ResponseBuilder.forbidden('Se requiere rol de administrador.');
          }

          if (!body.vehicle_class || !body.billing_mode || body.price === undefined) {
            return ResponseBuilder.unprocessableEntity(
              'vehicle_class, billing_mode y price son requeridos.',
            );
          }

          const created = await this.service.saveRate({
            vehicle_class: body.vehicle_class,
            billing_mode: body.billing_mode,
            price: body.price,
            currency: body.currency || 'COP',
            is_active: body.is_active !== undefined ? body.is_active : true,
          });

          return ResponseBuilder.created(this.mapper.rateToDTO(created));
        }
      }

      // /admin/rates/{rateId}
      if (path.startsWith('/admin/rates/')) {
        const rateId = pathParams.rate || path.replace('/admin/rates/', '');

        if (method === 'PATCH') {
          const tokenRes = validateTokenFromEvent(event);
          if (!tokenRes.valid || !hasRequiredRole(tokenRes.payload!, ['admin'])) {
            return ResponseBuilder.forbidden('Se requiere rol de administrador.');
          }

          const updated = await this.service.updateRate(rateId, {
            price: body.price,
            currency: body.currency,
            is_active: body.is_active,
          });

          return ResponseBuilder.success(this.mapper.rateToDTO(updated));
        }

        if (method === 'DELETE') {
          const tokenRes = validateTokenFromEvent(event);
          if (!tokenRes.valid || !hasRequiredRole(tokenRes.payload!, ['admin'])) {
            return ResponseBuilder.forbidden('Se requiere rol de administrador.');
          }

          await this.service.deleteRate(rateId);
          return ResponseBuilder.noContent();
        }
      }

      // 2. SCHEDULES: /admin/schedules
      if (path === '/admin/schedules') {
        if (method === 'GET') {
          const schedules = await this.service.getSchedules();
          return ResponseBuilder.success(this.mapper.scheduleListToDTO(schedules));
        }

        if (method === 'POST') {
          const tokenRes = validateTokenFromEvent(event);
          if (!tokenRes.valid || !hasRequiredRole(tokenRes.payload!, ['admin'])) {
            return ResponseBuilder.forbidden('Se requiere rol de administrador.');
          }

          if (body.day_of_week === undefined) {
            return ResponseBuilder.unprocessableEntity('day_of_week es requerido.');
          }

          const saved = await this.service.saveSchedule(
            Number(body.day_of_week),
            body.opens_at ?? null,
            body.closes_at ?? null,
            body.is_closed ?? false,
          );

          return ResponseBuilder.created(this.mapper.scheduleToDTO(saved));
        }
      }

      // 3. CAPACITY: /admin/capacity
      if (path === '/admin/capacity') {
        if (method === 'GET') {
          const capacities = await this.service.getCapacities();
          return ResponseBuilder.success(this.mapper.capacityListToDTO(capacities));
        }

        if (method === 'POST') {
          const tokenRes = validateTokenFromEvent(event);
          if (!tokenRes.valid || !hasRequiredRole(tokenRes.payload!, ['admin'])) {
            return ResponseBuilder.forbidden('Se requiere rol de administrador.');
          }

          if (!body.vehicle_class || body.max_slots === undefined) {
            return ResponseBuilder.unprocessableEntity('vehicle_class y max_slots son requeridos.');
          }

          const saved = await this.service.saveCapacity(body.vehicle_class, Number(body.max_slots));
          return ResponseBuilder.created(this.mapper.capacityToDTO(saved));
        }
      }

      // 4. PARKING INFO: /admin/parking-info or /operator/parking-info
      if (path === '/admin/parking-info' || path === '/operator/parking-info') {
        if (method === 'GET') {
          const info = await this.service.getParkingInfo();
          return ResponseBuilder.success(this.mapper.parkingInfoToDTO(info));
        }

        if (method === 'PATCH') {
          const tokenRes = validateTokenFromEvent(event);
          if (!tokenRes.valid || !hasRequiredRole(tokenRes.payload!, ['admin'])) {
            return ResponseBuilder.forbidden('Se requiere rol de administrador.');
          }

          const updated = await this.service.updateParkingInfo({
            name: body.name,
            address: body.address,
            car_capacity:
              body.car_capacity !== undefined
                ? body.car_capacity === null
                  ? null
                  : Number(body.car_capacity)
                : undefined,
            motorcycle_capacity:
              body.motorcycle_capacity !== undefined
                ? body.motorcycle_capacity === null
                  ? null
                  : Number(body.motorcycle_capacity)
                : undefined,
          });

          return ResponseBuilder.success(this.mapper.parkingInfoToDTO(updated));
        }
      }

      return ResponseBuilder.notFound(`Ruta no encontrada: ${method} ${path}`);
    } catch (err: unknown) {
      console.error('Error handling request:', err);
      return ResponseBuilder.internalError(err);
    }
  }
}
