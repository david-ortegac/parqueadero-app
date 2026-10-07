import 'reflect-metadata';

import { SessionController } from './adapter/restful/v1/controller/SessionController';
import { container } from './ioc/inversify.config';
import { TYPES } from './ioc/Types';

let controller: SessionController;

export const handler = async (event: any) => {
  console.log('Incoming event to ms_parking_sessions:', JSON.stringify(event));

  try {
    if (!controller) {
      console.log('Resolviendo SessionController desde contenedor IoC...');
      controller = container.get<SessionController>(TYPES.SessionController);
      console.log('SessionController resuelto exitosamente');
    }

    const response = await controller.handleRequest(event);
    return response;
  } catch (error) {
    console.error('Error no capturado en handler ms_parking_sessions:', error);
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
