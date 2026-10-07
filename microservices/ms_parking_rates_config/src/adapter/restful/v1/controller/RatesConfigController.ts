import { Response } from '../../../../models/Response';

export interface RatesConfigController {
  handleRequest(event: any): Promise<Response>;
}
