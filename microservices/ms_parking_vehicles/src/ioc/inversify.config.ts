import 'reflect-metadata';

import { Container } from 'inversify';

import { AdapterMapperImpl } from '../adapter/restful/v1/controller/Mapper/AdapterMapperImpl';
import { IAdapterMapper } from '../adapter/restful/v1/controller/Mapper/IAdapterMapper';
import { VehicleController } from '../adapter/restful/v1/controller/VehicleController';
import { VehicleControllerImpl } from '../adapter/restful/v1/controller/VehicleControllerImpl';
import { IVehicleService } from '../application/services/IVehicleService';
import { VehicleServiceImpl } from '../domain/VehicleServiceImpl';
import { IInfraestructureMapper } from '../infraestructure/dynamo/Mapper/IInfraestructureMapper';
import { InfraestructureMapperImpl } from '../infraestructure/dynamo/Mapper/InfraestructureMapperImpl';
import { VehicleRepository } from '../infraestructure/dynamo/Repository/VehicleRepository';
import { VehicleRepositoryImpl } from '../infraestructure/dynamo/Repository/VehicleRepositoryImpl';
import { TYPES } from './Types';

const container = new Container();

container.bind<VehicleRepository>(TYPES.VehicleRepository).to(VehicleRepositoryImpl);
container.bind<IInfraestructureMapper>(TYPES.IInfraestructureMapper).to(InfraestructureMapperImpl);
container.bind<IVehicleService>(TYPES.VehicleService).to(VehicleServiceImpl);
container.bind<IAdapterMapper>(TYPES.IAdapterMapper).to(AdapterMapperImpl);
container.bind<VehicleController>(TYPES.VehicleController).to(VehicleControllerImpl);

export { container };
