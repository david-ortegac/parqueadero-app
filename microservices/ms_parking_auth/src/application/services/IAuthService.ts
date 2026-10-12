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
    data_policy_accepted?: boolean;
    is_at_least_14?: boolean;
  }): Promise<{ message: string; user: DomainUserEntity }>;
  me(userId: string): Promise<DomainUserEntity>;
  updateProfile(
    userId: string,
    data: {
      name?: string;
      email?: string;
      password?: string;
    },
  ): Promise<{ user: DomainUserEntity; token: string }>;
  deleteAccount(userId: string): Promise<void>;

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
