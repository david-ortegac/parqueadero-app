import { Response } from '../../../../models/Response';

export interface NotificationController {
  handleRequest(event: any): Promise<Response>;
}
