import { inject, injectable } from 'inversify';

import { ISessionService } from '../../../../application/services/ISessionService';
import { TYPES } from '../../../../ioc/Types';
import { Response, LambdaEvent } from '../../../../models/Response';
import { hasRequiredRole, validateTokenFromEvent } from '../../../../utils/jwt-validator';
import { ResponseBuilder } from '../../../../utils/response-builder';
import { IAdapterMapper } from './Mapper/IAdapterMapper';
import { SessionController } from './SessionController';
import { BillingMode, VehicleClass } from '../../../../domain/Entities/DomainSessionEntity';

@injectable()
export class SessionControllerImpl implements SessionController {
  constructor(
    @inject(TYPES.SessionService)
    private readonly service: ISessionService,
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
    const clean = raw.split('?')[0];
    return clean.replace(/^\/api\/v1/, '').replace(/^\/v1/, '') || '/';
  }

  async handleRequest(event: LambdaEvent): Promise<Response> {
    const method = this.getMethod(event);
    const path = this.getPath(event);
    const body = this.parseBody(event);
    const pathParams = event?.pathParameters || {};
    const queryParams = event?.queryStringParameters || {};

    console.log(`[SessionController] ${method} ${path}`, { pathParams, queryParams });

    if (method === 'OPTIONS') {
      return ResponseBuilder.noContent();
    }

    try {
      // 1. PUBLIC ENDPOINTS (No token required)
      if (path === '/public/occupancy' && method === 'GET') {
        const occupancy = await this.service.getPublicOccupancy();
        return ResponseBuilder.success(occupancy);
      }

      if (path.startsWith('/public/sessions/by-plate/')) {
        const plate = pathParams.plate || path.replace('/public/sessions/by-plate/', '');
        try {
          const result = await this.service.lookupPublicSessionByPlate(plate);
          return ResponseBuilder.success(result);
        } catch (err: unknown) {
          const error = err as Error;
          return ResponseBuilder.unprocessableEntity(error.message || 'Error al consultar placa.');
        }
      }

      // 2. OPERATOR CHECK-IN: POST /operator/check-in
      if (path === '/operator/check-in' && method === 'POST') {
        const tokenRes = validateTokenFromEvent(event);
        if (!tokenRes.valid || !hasRequiredRole(tokenRes.payload!, ['admin', 'operator'])) {
          return ResponseBuilder.forbidden('Se requiere rol de administrador u operador.');
        }

        if (!body.plate || !body.depositor_document || !body.vehicle_class || !body.billing_mode) {
          return ResponseBuilder.unprocessableEntity(
            'plate, depositor_document, vehicle_class y billing_mode son requeridos.',
          );
        }

        try {
          const session = await this.service.checkIn({
            plate: body.plate as string,
            depositor_document: body.depositor_document as string,
            vehicle_class: body.vehicle_class as VehicleClass,
            billing_mode: body.billing_mode as BillingMode,
            owner_user_id: body.owner_user_id as string,
            registered_by_user_id: String(tokenRes.payload!.userId),
          });

          return ResponseBuilder.created({
            session: this.mapper.toDTO(session),
          });
        } catch (err: unknown) {
          const error = err as Error;
          return ResponseBuilder.unprocessableEntity(error.message || 'Error en check-in.');
        }
      }

      // 3. OPERATOR CHECK-OUT: POST /operator/sessions/{sessionId}/check-out
      if (path.includes('/check-out') && method === 'POST') {
        const tokenRes = validateTokenFromEvent(event);
        if (!tokenRes.valid || !hasRequiredRole(tokenRes.payload!, ['admin', 'operator'])) {
          return ResponseBuilder.forbidden('Se requiere rol de administrador u operador.');
        }

        const match = path.match(/\/operator\/sessions\/([^/]+)\/check-out/);
        const sessionId = pathParams.session || (match ? match[1] : null);

        if (!sessionId) {
          return ResponseBuilder.unprocessableEntity('sessionId es requerido.');
        }

        try {
          const session = await this.service.checkOut(sessionId);
          return ResponseBuilder.success(this.mapper.toDTO(session));
        } catch (err: unknown) {
          const error = err as Error;
          return ResponseBuilder.unprocessableEntity(error.message || 'Error en check-out.');
        }
      }

      // 4. OPERATOR ACTIVE SESSIONS: GET /operator/sessions/active
      if (path === '/operator/sessions/active' && method === 'GET') {
        const tokenRes = validateTokenFromEvent(event);
        if (!tokenRes.valid || !hasRequiredRole(tokenRes.payload!, ['admin', 'operator'])) {
          return ResponseBuilder.forbidden('Se requiere rol de administrador u operador.');
        }

        const sessions = await this.service.getActiveSessions();
        return ResponseBuilder.success(this.mapper.toDTOList(sessions));
      }

      // 5. OPERATOR DASHBOARD: GET /operator/dashboard
      if (path === '/operator/dashboard' && method === 'GET') {
        const tokenRes = validateTokenFromEvent(event);
        if (!tokenRes.valid || !hasRequiredRole(tokenRes.payload!, ['admin', 'operator'])) {
          return ResponseBuilder.forbidden('Se requiere rol de administrador u operador.');
        }

        const dashboard = await this.service.getDashboard();
        return ResponseBuilder.success(dashboard);
      }

      // 6. OPERATOR REVENUE REPORT: GET /operator/reports/revenue
      if (path === '/operator/reports/revenue' && method === 'GET') {
        const tokenRes = validateTokenFromEvent(event);
        if (!tokenRes.valid || !hasRequiredRole(tokenRes.payload!, ['admin', 'operator'])) {
          return ResponseBuilder.forbidden('Se requiere rol de administrador u operador.');
        }

        const from = queryParams.from;
        const to = queryParams.to;
        const revenue = await this.service.getRevenueSummary(from, to);
        return ResponseBuilder.success(revenue);
      }

      // 7. OPERATOR DAILY HISTORY: GET /operator/reports/daily-history
      if (path === '/operator/reports/daily-history' && method === 'GET') {
        const tokenRes = validateTokenFromEvent(event);
        if (!tokenRes.valid || !hasRequiredRole(tokenRes.payload!, ['admin', 'operator'])) {
          return ResponseBuilder.forbidden('Se requiere rol de administrador u operador.');
        }

        const dateStr = queryParams.date || new Date().toISOString().split('T')[0];
        const history = await this.service.getDailyHistory(dateStr);
        return ResponseBuilder.success({
          date: history.date,
          timezone: history.timezone,
          completed_exits: this.mapper.toDTOList(history.completed_exits),
          open_stays: this.mapper.toDTOList(history.open_stays),
        });
      }

      // 8. OWNER VEHICLE ACTIVE SESSION: GET /owner/vehicles/{vehicleId}/active-session
      if (path.includes('/active-session') && method === 'GET') {
        const tokenRes = validateTokenFromEvent(event);
        if (!tokenRes.valid || !tokenRes.payload) {
          return ResponseBuilder.unauthorized('No autenticado.');
        }

        const match = path.match(/\/owner\/vehicles\/([^/]+)\/active-session/);
        const vehicleId = pathParams.vehicle || (match ? match[1] : null);

        if (!vehicleId) {
          return ResponseBuilder.unprocessableEntity('vehicleId es requerido.');
        }

        const activeSession = await this.service.getOwnerActiveSession(vehicleId);
        return ResponseBuilder.success(activeSession);
      }

      // 9. OWNER VEHICLE SESSIONS HISTORY: GET /owner/vehicles/{vehicleId}/sessions
      if (path.includes('/sessions') && path.startsWith('/owner/vehicles/') && method === 'GET') {
        const tokenRes = validateTokenFromEvent(event);
        if (!tokenRes.valid || !tokenRes.payload) {
          return ResponseBuilder.unauthorized('No autenticado.');
        }

        const match = path.match(/\/owner\/vehicles\/([^/]+)\/sessions/);
        const vehicleId = pathParams.vehicle || (match ? match[1] : null);

        if (!vehicleId) {
          return ResponseBuilder.unprocessableEntity('vehicleId es requerido.');
        }

        const sessions = await this.service.getOwnerVehicleSessions(vehicleId);
        return ResponseBuilder.success(this.mapper.toDTOList(sessions));
      }

      return ResponseBuilder.notFound(`Ruta no encontrada: ${method} ${path}`);
    } catch (err: unknown) {
      console.error('Error handling session request:', err);
      return ResponseBuilder.internalError(err);
    }
  }
}
