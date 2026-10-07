import 'reflect-metadata';

import { Container } from 'inversify';

import { AdapterMapperImpl } from '../adapter/restful/v1/controller/Mapper/AdapterMapperImpl';
import { IAdapterMapper } from '../adapter/restful/v1/controller/Mapper/IAdapterMapper';
import { RatesConfigController } from '../adapter/restful/v1/controller/RatesConfigController';
import { RatesConfigControllerImpl } from '../adapter/restful/v1/controller/RatesConfigControllerImpl';
import { IRatesConfigService } from '../application/services/IRatesConfigService';
import { RatesConfigServiceImpl } from '../domain/RatesConfigServiceImpl';
import { IInfraestructureMapper } from '../infraestructure/dynamo/Mapper/IInfraestructureMapper';
import { InfraestructureMapperImpl } from '../infraestructure/dynamo/Mapper/InfraestructureMapperImpl';
import { RatesConfigRepository } from '../infraestructure/dynamo/Repository/RatesConfigRepository';
import { RatesConfigRepositoryImpl } from '../infraestructure/dynamo/Repository/RatesConfigRepositoryImpl';
import { TYPES } from './Types';

const container = new Container();

container.bind<RatesConfigRepository>(TYPES.RatesConfigRepository).to(RatesConfigRepositoryImpl);
container.bind<IInfraestructureMapper>(TYPES.IInfraestructureMapper).to(InfraestructureMapperImpl);
container.bind<IRatesConfigService>(TYPES.RatesConfigService).to(RatesConfigServiceImpl);
container.bind<IAdapterMapper>(TYPES.IAdapterMapper).to(AdapterMapperImpl);
container.bind<RatesConfigController>(TYPES.RatesConfigController).to(RatesConfigControllerImpl);

export { container };
