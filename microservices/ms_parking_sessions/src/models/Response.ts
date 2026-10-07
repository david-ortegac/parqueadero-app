export interface Response {
  statusCode: number;
  headers?: Record<string, string | boolean>;
  body: string | any;
}
