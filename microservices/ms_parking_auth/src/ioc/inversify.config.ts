import 'reflect-metadata';

import { Container } from 'inversify';

import { AuthController } from '../adapter/restful/v1/controller/AuthController';
import { AuthControllerImpl } from '../adapter/restful/v1/controller/AuthControllerImpl';
import { AdapterMapperImpl } from '../adapter/restful/v1/controller/Mapper/AdapterMapperImpl';
import { IAdapterMapper } from '../adapter/restful/v1/controller/Mapper/IAdapterMapper';
import { IAuthService } from '../application/services/IAuthService';
import { AuthServiceImpl } from '../domain/AuthServiceImpl';
import { IInfraestructureMapper } from '../infraestructure/dynamo/Mapper/IInfraestructureMapper';
import { InfraestructureMapperImpl } from '../infraestructure/dynamo/Mapper/InfraestructureMapperImpl';
import { UserRepository } from '../infraestructure/dynamo/Repository/UserRepository';
import { UserRepositoryImpl } from '../infraestructure/dynamo/Repository/UserRepositoryImpl';
import { TYPES } from './Types';

const container = new Container();

container.bind<UserRepository>(TYPES.UserRepository).to(UserRepositoryImpl);
container.bind<IInfraestructureMapper>(TYPES.IInfraestructureMapper).to(InfraestructureMapperImpl);
container.bind<IAuthService>(TYPES.AuthService).to(AuthServiceImpl);
container.bind<IAdapterMapper>(TYPES.IAdapterMapper).to(AdapterMapperImpl);
container.bind<AuthController>(TYPES.AuthController).to(AuthControllerImpl);

export { container };
