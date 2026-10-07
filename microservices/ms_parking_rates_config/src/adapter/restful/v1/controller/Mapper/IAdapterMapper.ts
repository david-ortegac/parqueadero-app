import {
  DomainCapacityEntity,
  DomainParkingInfoEntity,
  DomainRateEntity,
  DomainScheduleEntity,
} from '../../../../domain/Entities/DomainRatesConfigEntities';
import {
  AdapterCapacityDTO,
  AdapterParkingInfoDTO,
  AdapterRateDTO,
  AdapterScheduleDTO,
} from '../Entity/AdapterRatesConfigDTO';

export interface IAdapterMapper {
  rateToDTO(domain: DomainRateEntity): AdapterRateDTO;
  rateListToDTO(domains: DomainRateEntity[]): AdapterRateDTO[];

  capacityToDTO(domain: DomainCapacityEntity): AdapterCapacityDTO;
  capacityListToDTO(domains: DomainCapacityEntity[]): AdapterCapacityDTO[];

  scheduleToDTO(domain: DomainScheduleEntity): AdapterScheduleDTO;
  scheduleListToDTO(domains: DomainScheduleEntity[]): AdapterScheduleDTO[];

  parkingInfoToDTO(domain: DomainParkingInfoEntity): AdapterParkingInfoDTO;
}
