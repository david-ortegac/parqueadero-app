import 'reflect-metadata';

import { NotificationController } from './adapter/restful/v1/controller/NotificationController';
import { container } from './ioc/inversify.config';
import { TYPES } from './ioc/Types';
import { LambdaEvent } from './models/Response';

let controller: NotificationController;

export const handler = async (event: LambdaEvent) => {
  console.log('Incoming event to ms_parking_notifications:', JSON.stringify(event));

  try {
    if (!controller) {
      console.log('Resolviendo NotificationController desde contenedor IoC...');
      controller = container.get<NotificationController>(TYPES.NotificationController);
      console.log('NotificationController resuelto exitosamente');
    }

    const response = await controller.handleRequest(event);
    return response;
  } catch (error) {
    console.error('Error no capturado en handler ms_parking_notifications:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
