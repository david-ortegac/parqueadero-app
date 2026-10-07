import { Response, LambdaEvent } from '../../../../models/Response';

export interface AuthController {
  handleRequest(event: LambdaEvent): Promise<Response>;
}
