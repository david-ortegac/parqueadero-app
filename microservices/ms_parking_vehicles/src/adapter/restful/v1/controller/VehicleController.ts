import { Response } from '../../../../models/Response';

export interface VehicleController {
  handleRequest(event: any): Promise<Response>;
}
