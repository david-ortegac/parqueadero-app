import { DomainParkingSessionEntity } from '../../../domain/Entities/DomainSessionEntity';
import { DynamoSessionItem } from '../Entity/SessionDynamoEntity';

export interface IInfraestructureMapper {
  toDomain(item: DynamoSessionItem): DomainParkingSessionEntity;
  toEntity(domain: DomainParkingSessionEntity): DynamoSessionItem;
  toDomainList(items: DynamoSessionItem[]): DomainParkingSessionEntity[];
}
