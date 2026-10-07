import { Response } from '../../../../models/Response';

export interface AuthController {
  handleRequest(event: any): Promise<Response>;
}
