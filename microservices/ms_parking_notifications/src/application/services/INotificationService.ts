import { DevicePlatform, DomainPushDeviceEntity } from '../../domain/Entities/DomainDeviceEntity';

export interface INotificationService {
  registerPushDevice(
    userId: string,
    token: string,
    platform: DevicePlatform
  ): Promise<DomainPushDeviceEntity>;

  sendNotificationToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<{ sent: number; failed: number }>;
}
