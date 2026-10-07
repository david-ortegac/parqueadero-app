import 'reflect-metadata';

import { RatesConfigController } from './adapter/restful/v1/controller/RatesConfigController';
import { container } from './ioc/inversify.config';
import { TYPES } from './ioc/Types';

let controller: RatesConfigController;

export const handler = async (event: any) => {
  console.log('Incoming event:', JSON.stringify(event));

  try {
    if (!controller) {
      console.log('Resolviendo controller desde contenedor IoC...');
      controller = container.get<RatesConfigController>(TYPES.RatesConfigController);
      console.log('Controller resuelto exitosamente');
    }

    const response = await controller.handleRequest(event);
    return response;
  } catch (error) {
    console.error('Error no capturado en handler:', error);
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
