import { Response, LambdaEvent } from '../../../../models/Response';

export interface VehicleController {
  handleRequest(event: LambdaEvent): Promise<Response>;
}
