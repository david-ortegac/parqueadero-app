import { Response, LambdaEvent } from '../../../../models/Response';

export interface SessionController {
  handleRequest(event: LambdaEvent): Promise<Response>;
}
