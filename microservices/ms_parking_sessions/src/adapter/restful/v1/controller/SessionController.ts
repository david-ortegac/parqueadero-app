import { Response } from '../../../../models/Response';

export interface SessionController {
  handleRequest(event: any): Promise<Response>;
}
