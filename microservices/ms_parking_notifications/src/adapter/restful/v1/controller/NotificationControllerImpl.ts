import { inject, injectable } from 'inversify';

import { INotificationService } from '../../../../application/services/INotificationService';
import { TYPES } from '../../../../ioc/Types';
import { Response } from '../../../../models/Response';
import { validateTokenFromEvent } from '../../../../utils/jwt-validator';
import { ResponseBuilder } from '../../../../utils/response-builder';
import { NotificationController } from './NotificationController';

@injectable()
export class NotificationControllerImpl implements NotificationController {
  constructor(
    @inject(TYPES.NotificationService)
    private readonly service: INotificationService
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

    console.log(`[NotificationController] ${method} ${path}`, { body });

    if (method === 'OPTIONS') {
      return ResponseBuilder.noContent();
    }

    try {
      // 1. POST /push-devices
      if (path === '/push-devices' && method === 'POST') {
        const tokenRes = validateTokenFromEvent(event);
        if (!tokenRes.valid || !tokenRes.payload) {
          return ResponseBuilder.unauthorized('No autenticado.');
        }

        if (!body.token || !body.platform) {
          return ResponseBuilder.unprocessableEntity('token y platform son requeridos.');
        }

        if (!['ios', 'android', 'web'].includes(body.platform)) {
          return ResponseBuilder.unprocessableEntity('platform debe ser ios, android o web.');
        }

        await this.service.registerPushDevice(
          String(tokenRes.payload.userId),
          body.token,
          body.platform
        );

        return ResponseBuilder.success({ message: 'Token registrado.' });
      }

      // 2. POST /notifications/send (Internal or event-triggered)
      if (path === '/notifications/send' && method === 'POST') {
        if (!body.userId || !body.title || !body.body) {
          return ResponseBuilder.unprocessableEntity('userId, title y body son requeridos.');
        }

        const result = await this.service.sendNotificationToUser(
          body.userId,
          body.title,
          body.body,
          body.data
        );

        return ResponseBuilder.success({
          message: 'Notificación procesada.',
          ...result,
        });
      }

      return ResponseBuilder.notFound(`Ruta no encontrada: ${method} ${path}`);
    } catch (err: any) {
      console.error('Error handling notification request:', err);
      return ResponseBuilder.internalError(err);
    }
  }
}
