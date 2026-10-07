import { Response, LambdaEvent } from '../../../../models/Response';

export interface RatesConfigController {
  handleRequest(event: LambdaEvent): Promise<Response>;
}
