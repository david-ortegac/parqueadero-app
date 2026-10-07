import 'reflect-metadata';

import { Container } from 'inversify';

import { AdapterMapperImpl } from '../adapter/restful/v1/controller/Mapper/AdapterMapperImpl';
import { IAdapterMapper } from '../adapter/restful/v1/controller/Mapper/IAdapterMapper';
import { SessionController } from '../adapter/restful/v1/controller/SessionController';
import { SessionControllerImpl } from '../adapter/restful/v1/controller/SessionControllerImpl';
import { ISessionService } from '../application/services/ISessionService';
import { SessionServiceImpl } from '../domain/SessionServiceImpl';
import { IInfraestructureMapper } from '../infraestructure/dynamo/Mapper/IInfraestructureMapper';
import { InfraestructureMapperImpl } from '../infraestructure/dynamo/Mapper/InfraestructureMapperImpl';
import { RatesConfigReader } from '../infraestructure/dynamo/RatesConfigReader';
import { SessionRepository } from '../infraestructure/dynamo/Repository/SessionRepository';
import { SessionRepositoryImpl } from '../infraestructure/dynamo/Repository/SessionRepositoryImpl';
import { TYPES } from './Types';

const container = new Container();

container.bind<SessionRepository>(TYPES.SessionRepository).to(SessionRepositoryImpl);
container.bind<IInfraestructureMapper>(TYPES.IInfraestructureMapper).to(InfraestructureMapperImpl);
container.bind<RatesConfigReader>(TYPES.RatesConfigReader).to(RatesConfigReader);
container.bind<ISessionService>(TYPES.SessionService).to(SessionServiceImpl);
container.bind<IAdapterMapper>(TYPES.IAdapterMapper).to(AdapterMapperImpl);
container.bind<SessionController>(TYPES.SessionController).to(SessionControllerImpl);

export { container };
