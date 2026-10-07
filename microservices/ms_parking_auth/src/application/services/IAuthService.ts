import { DomainUserEntity, UserRole } from '../../domain/Entities/DomainUserEntity';

export interface IAuthService {
  login(credentials: {
    email: string;
    password: string;
  }): Promise<{ token: string; user: DomainUserEntity }>;
  register(data: {
    name: string;
    email: string;
    document: string;
    password: string;
  }): Promise<{ message: string; user: DomainUserEntity }>;
  me(userId: string): Promise<DomainUserEntity>;

  getUsers(): Promise<DomainUserEntity[]>;
  createUser(data: {
    name: string;
    email: string;
    document?: string;
    password: string;
    role: UserRole;
    is_active?: boolean;
  }): Promise<DomainUserEntity>;
  updateUser(
    userId: string,
    data: {
      name?: string;
      email?: string;
      document?: string;
      password?: string;
      role?: UserRole;
      is_active?: boolean;
    },
  ): Promise<DomainUserEntity>;

  getVehicleOwners(): Promise<DomainUserEntity[]>;
  updateVehicleOwnerActivation(userId: string, isActive: boolean): Promise<DomainUserEntity>;
}
