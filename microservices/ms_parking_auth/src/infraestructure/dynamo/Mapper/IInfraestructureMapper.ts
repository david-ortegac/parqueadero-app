import { DomainUserEntity } from '../../../domain/Entities/DomainUserEntity';
import { DynamoUserItem } from '../Entity/UserDynamoEntity';

export interface IInfraestructureMapper {
  toDomain(item: DynamoUserItem): DomainUserEntity;
  toEntity(domain: DomainUserEntity): DynamoUserItem;
  toDomainList(items: DynamoUserItem[]): DomainUserEntity[];
}
