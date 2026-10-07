export interface Response {
  statusCode: number;
  headers?: Record<string, string | boolean>;
  body: string;
}

export interface LambdaEvent {
  headers?: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string | undefined> | null;
  pathParameters?: Record<string, string | undefined> | null;
  rawPath?: string;
  path?: string;
  httpMethod?: string;
  requestContext?: {
    http?: {
      method?: string;
      path?: string;
    };
  };
  body?: string | Record<string, unknown> | null;
}
