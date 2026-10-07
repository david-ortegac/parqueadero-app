import 'reflect-metadata';

import { Container } from 'inversify';

import { NotificationController } from '../adapter/restful/v1/controller/NotificationController';
import { NotificationControllerImpl } from '../adapter/restful/v1/controller/NotificationControllerImpl';
import { INotificationService } from '../application/services/INotificationService';
import { NotificationServiceImpl } from '../domain/NotificationServiceImpl';
import { IInfraestructureMapper } from '../infraestructure/dynamo/Mapper/IInfraestructureMapper';
import { InfraestructureMapperImpl } from '../infraestructure/dynamo/Mapper/InfraestructureMapperImpl';
import { NotificationRepository } from '../infraestructure/dynamo/Repository/NotificationRepository';
import { NotificationRepositoryImpl } from '../infraestructure/dynamo/Repository/NotificationRepositoryImpl';
import { TYPES } from './Types';

const container = new Container();

container.bind<NotificationRepository>(TYPES.NotificationRepository).to(NotificationRepositoryImpl);
container.bind<IInfraestructureMapper>(TYPES.IInfraestructureMapper).to(InfraestructureMapperImpl);
container.bind<INotificationService>(TYPES.NotificationService).to(NotificationServiceImpl);
container.bind<NotificationController>(TYPES.NotificationController).to(NotificationControllerImpl);

export { container };
