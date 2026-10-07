import * as jwt from 'jsonwebtoken';
import { LambdaEvent } from '../models/Response';

export interface TokenPayload {
  userId: number | string;
  email: string;
  name?: string;
  document?: string;
  role: 'admin' | 'operator' | 'vehicle_owner';
  is_active?: boolean;
  iat?: number;
  exp?: number;
}

export interface JWTValidatorOptions {
  secretKey?: string;
  issuer?: string;
  audience?: string;
}

export interface TokenValidationResult {
  valid: boolean;
  payload?: TokenPayload;
  error?: string;
}

export class JWTValidator {
  private readonly secretKey: string;
  private readonly issuer: string;
  private readonly audience: string;

  constructor(options: JWTValidatorOptions = {}) {
    this.secretKey =
      options.secretKey ||
      process.env.JWT_SECRET_KEY ||
      process.env.APP_KEY ||
      'parqueadero-secret-key-change-in-production';
    this.issuer = options.issuer || process.env.JWT_ISSUER || 'parking-auth-service';
    this.audience = options.audience || process.env.JWT_AUDIENCE || 'parking-app';
  }

  generateToken(payload: Omit<TokenPayload, 'iat' | 'exp'>, expiresIn = '7d'): string {
    return jwt.sign(payload, this.secretKey, {
      expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
      issuer: this.issuer,
      audience: this.audience,
    });
  }

  verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.secretKey, {
        issuer: this.issuer,
        audience: this.audience,
      }) as TokenPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      throw new Error('Token verification failed');
    }
  }

  validateToken(token: string): TokenValidationResult {
    try {
      const payload = this.verifyToken(token);
      return {
        valid: true,
        payload,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export function extractTokenFromEvent(event: LambdaEvent): string | null {
  const headers = (event?.headers || {}) as Record<string, string | undefined>;
  const authHeader =
    headers.Authorization ||
    headers.authorization ||
    headers['Authorization'] ||
    headers['authorization'];

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  if (event?.queryStringParameters?.token) {
    return event.queryStringParameters.token;
  }

  return null;
}

export function validateTokenFromEvent(
  event: LambdaEvent,
  options?: JWTValidatorOptions,
): TokenValidationResult {
  const token = extractTokenFromEvent(event);
  if (!token) {
    return {
      valid: false,
      error: 'Token not found in request authorization header',
    };
  }

  const validator = new JWTValidator(options);
  return validator.validateToken(token);
}

export function hasRequiredRole(
  payload: TokenPayload,
  requiredRoles: Array<'admin' | 'operator' | 'vehicle_owner'>,
): boolean {
  if (!payload || !payload.role) {
    return false;
  }
  return requiredRoles.includes(payload.role);
}
