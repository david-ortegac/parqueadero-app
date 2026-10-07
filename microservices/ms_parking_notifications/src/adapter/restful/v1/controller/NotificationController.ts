import { Response, LambdaEvent } from '../../../../models/Response';

export interface NotificationController {
  handleRequest(event: LambdaEvent): Promise<Response>;
}
