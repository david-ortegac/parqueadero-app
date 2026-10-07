import { inject, injectable } from 'inversify';

import { IAuthService } from '../application/services/IAuthService';
import { IInfraestructureMapper } from '../infraestructure/dynamo/Mapper/IInfraestructureMapper';
import { UserRepository } from '../infraestructure/dynamo/Repository/UserRepository';
import { TYPES } from '../ioc/Types';
import { JWTValidator } from '../utils/jwt-validator';
import { DomainUserEntity, UserRole } from './Entities/DomainUserEntity';

@injectable()
export class AuthServiceImpl implements IAuthService {
  private readonly jwtValidator: JWTValidator;

  constructor(
    @inject(TYPES.UserRepository)
    private readonly repository: UserRepository,
    @inject(TYPES.IInfraestructureMapper)
    private readonly mapper: IInfraestructureMapper,
  ) {
    this.jwtValidator = new JWTValidator();
  }

  async login(credentials: {
    email: string;
    password: string;
  }): Promise<{ token: string; user: DomainUserEntity }> {
    const item = await this.repository.findByEmail(credentials.email);
    if (!item) {
      throw new Error('Las credenciales no coinciden.');
    }

    const isMatch = await JWTValidator.comparePassword(credentials.password, item.password);
    if (!isMatch) {
      throw new Error('Las credenciales no coinciden.');
    }

    if (!item.is_active) {
      const error = Object.assign(new Error('Usuario inactivo. Contacte al administrador.'), {
        statusCode: 403,
      });
      throw error;
    }

    const domainUser = this.mapper.toDomain(item);
    const token = this.jwtValidator.generateToken({
      userId: domainUser.id,
      email: domainUser.email,
      name: domainUser.name,
      document: domainUser.document,
      role: domainUser.role,
      is_active: domainUser.is_active,
    });

    return { token, user: domainUser };
  }

  async register(data: {
    name: string;
    email: string;
    document: string;
    password: string;
  }): Promise<{ message: string; user: DomainUserEntity }> {
    const docDigits = data.document.replace(/\D+/g, '');
    if (!docDigits) {
      throw new Error('El documento debe contener al menos un dígito.');
    }
    if (docDigits.length > 15) {
      throw new Error('El documento admite como máximo 15 dígitos.');
    }

    const existingEmail = await this.repository.findByEmail(data.email);
    const existingDoc = await this.repository.findByDocument(docDigits);

    if (existingEmail || existingDoc) {
      throw new Error(
        'No fue posible completar el registro. Verifique sus datos o contacte al administrador.',
      );
    }

    const hashedPassword = await JWTValidator.hashPassword(data.password);
    const userId = Date.now().toString();

    const domainEntity: DomainUserEntity = {
      id: userId,
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      document: docDigits,
      password: hashedPassword,
      role: 'vehicle_owner',
      is_active: false,
    };

    const item = this.mapper.toEntity(domainEntity);
    const saved = await this.repository.create(item);
    const createdUser = this.mapper.toDomain(saved);

    return {
      message:
        'Registro recibido. Un administrador u operador debe activar tu cuenta para iniciar sesión.',
      user: createdUser,
    };
  }

  async me(userId: string): Promise<DomainUserEntity> {
    const item = await this.repository.findById(userId);
    if (!item) {
      throw new Error('Usuario no encontrado.');
    }
    return this.mapper.toDomain(item);
  }

  async getUsers(): Promise<DomainUserEntity[]> {
    const items = await this.repository.findAll();
    return this.mapper.toDomainList(items);
  }

  async createUser(data: {
    name: string;
    email: string;
    document?: string;
    password: string;
    role: UserRole;
    is_active?: boolean;
  }): Promise<DomainUserEntity> {
    const existingEmail = await this.repository.findByEmail(data.email);
    if (existingEmail) {
      throw new Error('El email ya se encuentra registrado.');
    }

    const doc = (data.document || '').replace(/\D+/g, '');
    const hashedPassword = await JWTValidator.hashPassword(data.password);
    const userId = Date.now().toString();

    const domainEntity: DomainUserEntity = {
      id: userId,
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      document: doc,
      password: hashedPassword,
      role: data.role,
      is_active: data.is_active !== undefined ? data.is_active : true,
    };

    const item = this.mapper.toEntity(domainEntity);
    const saved = await this.repository.create(item);
    return this.mapper.toDomain(saved);
  }

  async updateUser(
    userId: string,
    data: {
      name?: string;
      email?: string;
      document?: string;
      password?: string;
      role?: UserRole;
      is_active?: boolean;
    },
  ): Promise<DomainUserEntity> {
    const existing = await this.repository.findById(userId);
    if (!existing) {
      throw new Error('Usuario no encontrado.');
    }

    let hashedPassword = existing.password;
    if (data.password) {
      hashedPassword = await JWTValidator.hashPassword(data.password);
    }

    const doc = data.document !== undefined ? data.document.replace(/\D+/g, '') : existing.document;

    const updatedItem = {
      ...existing,
      name: data.name !== undefined ? data.name.trim() : existing.name,
      email: data.email !== undefined ? data.email.toLowerCase().trim() : existing.email,
      document: doc,
      password: hashedPassword,
      role: data.role !== undefined ? data.role : existing.role,
      is_active: data.is_active !== undefined ? data.is_active : existing.is_active,
      updated_at: new Date().toISOString(),
    };

    const saved = await this.repository.update(updatedItem);
    return this.mapper.toDomain(saved);
  }

  async getVehicleOwners(): Promise<DomainUserEntity[]> {
    const items = await this.repository.findByRole('vehicle_owner');
    return this.mapper.toDomainList(items);
  }

  async updateVehicleOwnerActivation(userId: string, isActive: boolean): Promise<DomainUserEntity> {
    const existing = await this.repository.findById(userId);
    if (!existing) {
      throw new Error('Usuario no encontrado.');
    }
    if (existing.role !== 'vehicle_owner') {
      throw new Error('Solo se pueden activar usuarios propietarios de vehículo.');
    }

    existing.is_active = isActive;
    existing.updated_at = new Date().toISOString();

    const saved = await this.repository.update(existing);
    return this.mapper.toDomain(saved);
  }
}
