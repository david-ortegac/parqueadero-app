import { inject, injectable } from 'inversify';

import { IAuthService } from '../../../../application/services/IAuthService';
import { TYPES } from '../../../../ioc/Types';
import { Response, LambdaEvent } from '../../../../models/Response';
import { hasRequiredRole, validateTokenFromEvent } from '../../../../utils/jwt-validator';
import { ResponseBuilder } from '../../../../utils/response-builder';
import { IAdapterMapper } from './Mapper/IAdapterMapper';
import { AuthController } from './AuthController';

@injectable()
export class AuthControllerImpl implements AuthController {
  constructor(
    @inject(TYPES.AuthService)
    private readonly service: IAuthService,
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

    console.log(`[AuthController] ${method} ${path}`, { pathParams, body });

    if (method === 'OPTIONS') {
      return ResponseBuilder.noContent();
    }

    try {
      // 1. POST /login
      if (path === '/login' && method === 'POST') {
        if (!body.email || !body.password) {
          return ResponseBuilder.unprocessableEntity('Email y contraseña son requeridos.');
        }

        try {
          const result = await this.service.login({
            email: body.email,
            password: body.password,
          });

          return ResponseBuilder.success({
            token: result.token,
            user: this.mapper.toDTO(result.user),
          });
        } catch (err: unknown) {
          const error = err as { statusCode?: number; message?: string };
          if (error.statusCode === 403) {
            return ResponseBuilder.forbidden(error.message || 'Acceso denegado.');
          }
          return ResponseBuilder.unprocessableEntity(error.message || 'Credenciales inválidas.');
        }
      }

      // 2. POST /register
      if (path === '/register' && method === 'POST') {
        if (!body.name || !body.email || !body.document || !body.password) {
          return ResponseBuilder.unprocessableEntity(
            'Nombre, email, documento y contraseña son requeridos.',
          );
        }

        try {
          const result = await this.service.register({
            name: body.name,
            email: body.email,
            document: body.document,
            password: body.password,
          });

          return ResponseBuilder.created({
            message: result.message,
            user: this.mapper.toDTO(result.user),
          });
        } catch (err: unknown) {
          const error = err as Error;
          return ResponseBuilder.unprocessableEntity(error.message || 'Error en registro.');
        }
      }

      // 3. POST /logout
      if (path === '/logout' && method === 'POST') {
        return ResponseBuilder.success({ message: 'Sesión cerrada.' });
      }

      // 4. GET /me
      if (path === '/me' && method === 'GET') {
        const tokenRes = validateTokenFromEvent(event);
        if (!tokenRes.valid || !tokenRes.payload) {
          return ResponseBuilder.unauthorized('No autenticado.');
        }

        const user = await this.service.me(String(tokenRes.payload.userId));
        return ResponseBuilder.success(this.mapper.toDTO(user));
      }

      // 5. ADMIN USERS: /admin/users
      if (path === '/admin/users') {
        const tokenRes = validateTokenFromEvent(event);
        if (!tokenRes.valid || !hasRequiredRole(tokenRes.payload!, ['admin'])) {
          return ResponseBuilder.forbidden('Se requiere rol de administrador.');
        }

        if (method === 'GET') {
          const users = await this.service.getUsers();
          return ResponseBuilder.success(this.mapper.toDTOList(users));
        }

        if (method === 'POST') {
          if (!body.name || !body.email || !body.password || !body.role) {
            return ResponseBuilder.unprocessableEntity(
              'name, email, password y role son requeridos.',
            );
          }

          const created = await this.service.createUser({
            name: body.name,
            email: body.email,
            document: body.document,
            password: body.password,
            role: body.role,
            is_active: body.is_active,
          });

          return ResponseBuilder.created(this.mapper.toDTO(created));
        }
      }

      // /admin/users/{userId}
      if (path.startsWith('/admin/users/')) {
        const tokenRes = validateTokenFromEvent(event);
        if (!tokenRes.valid || !hasRequiredRole(tokenRes.payload!, ['admin'])) {
          return ResponseBuilder.forbidden('Se requiere rol de administrador.');
        }

        const userId = pathParams.user || path.replace('/admin/users/', '');

        if (method === 'PATCH') {
          if (body.is_active === false && String(tokenRes.payload!.userId) === String(userId)) {
            return ResponseBuilder.forbidden('No puedes desactivar tu propia cuenta.');
          }

          const updated = await this.service.updateUser(userId, {
            name: body.name,
            email: body.email,
            document: body.document,
            password: body.password,
            role: body.role,
            is_active: body.is_active,
          });

          return ResponseBuilder.success(this.mapper.toDTO(updated));
        }
      }

      // 6. OPERATOR VEHICLE OWNERS: /operator/vehicle-owners
      if (path === '/operator/vehicle-owners') {
        const tokenRes = validateTokenFromEvent(event);
        if (!tokenRes.valid || !hasRequiredRole(tokenRes.payload!, ['admin', 'operator'])) {
          return ResponseBuilder.forbidden('Se requiere rol de administrador u operador.');
        }

        if (method === 'GET') {
          const owners = await this.service.getVehicleOwners();
          return ResponseBuilder.success(this.mapper.toDTOList(owners));
        }
      }

      // /operator/vehicle-owners/{userId}
      if (path.startsWith('/operator/vehicle-owners/')) {
        const tokenRes = validateTokenFromEvent(event);
        if (!tokenRes.valid || !hasRequiredRole(tokenRes.payload!, ['admin', 'operator'])) {
          return ResponseBuilder.forbidden('Se requiere rol de administrador u operador.');
        }

        const userId = pathParams.user || path.replace('/operator/vehicle-owners/', '');

        if (method === 'PATCH') {
          if (body.is_active === undefined) {
            return ResponseBuilder.unprocessableEntity('is_active es requerido.');
          }

          if (body.is_active === false && String(tokenRes.payload!.userId) === String(userId)) {
            return ResponseBuilder.forbidden('No puedes desactivar tu propia cuenta.');
          }

          const updated = await this.service.updateVehicleOwnerActivation(
            userId,
            Boolean(body.is_active),
          );
          return ResponseBuilder.success({
            id: updated.id,
            is_active: updated.is_active,
          });
        }
      }

      return ResponseBuilder.notFound(`Ruta no encontrada: ${method} ${path}`);
    } catch (err: unknown) {
      console.error('Error handling request:', err);
      return ResponseBuilder.internalError(err);
    }
  }
}
