import { DynamoUserItem } from '../Entity/UserDynamoEntity';

export interface UserRepository {
  findById(id: string): Promise<DynamoUserItem | null>;
  findByEmail(email: string): Promise<DynamoUserItem | null>;
  findByDocument(document: string): Promise<DynamoUserItem | null>;
  findAll(): Promise<DynamoUserItem[]>;
  findByRole(role: string): Promise<DynamoUserItem[]>;
  create(item: DynamoUserItem): Promise<DynamoUserItem>;
  update(item: DynamoUserItem): Promise<DynamoUserItem>;
  delete(id: string): Promise<void>;
}
