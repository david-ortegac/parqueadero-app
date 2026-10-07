import { Response } from '../models/Response';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
};

export class ResponseBuilder {
  static success(data: unknown, statusCode = 200): Response {
    return {
      statusCode,
      headers: CORS_HEADERS,
      body: JSON.stringify(data),
    };
  }

  static created(data: unknown): Response {
    return this.success(data, 201);
  }

  static noContent(): Response {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  static badRequest(message: string, errors?: unknown): Response {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message, errors }),
    };
  }

  static unauthorized(message = 'Unauthorized', error?: string): Response {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message, error }),
    };
  }

  static forbidden(message = 'Forbidden'): Response {
    return {
      statusCode: 403,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message }),
    };
  }

  static notFound(message = 'Resource not found'): Response {
    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message }),
    };
  }

  static unprocessableEntity(message: string, errors?: unknown): Response {
    return {
      statusCode: 422,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message, errors }),
    };
  }

  static internalError(error: unknown): Response {
    console.error('Internal Error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}
