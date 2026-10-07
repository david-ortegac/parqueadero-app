import 'reflect-metadata';

import { AuthController } from './adapter/restful/v1/controller/AuthController';
import { container } from './ioc/inversify.config';
import { TYPES } from './ioc/Types';

let controller: AuthController;

export const handler = async (event: any) => {
  console.log('Incoming event to ms_parking_auth:', JSON.stringify(event));

  try {
    if (!controller) {
      console.log('Resolviendo AuthController desde contenedor IoC...');
      controller = container.get<AuthController>(TYPES.AuthController);
      console.log('AuthController resuelto exitosamente');
    }

    const response = await controller.handleRequest(event);
    return response;
  } catch (error) {
    console.error('Error no capturado en handler ms_parking_auth:', error);
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
