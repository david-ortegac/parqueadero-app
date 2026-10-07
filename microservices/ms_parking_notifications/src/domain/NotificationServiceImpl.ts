import axios from 'axios';
import { inject, injectable } from 'inversify';

import { INotificationService } from '../application/services/INotificationService';
import { DevicePlatform, DomainPushDeviceEntity } from './Entities/DomainDeviceEntity';
import { IInfraestructureMapper } from '../infraestructure/dynamo/Mapper/IInfraestructureMapper';
import { NotificationRepository } from '../infraestructure/dynamo/Repository/NotificationRepository';
import { TYPES } from '../ioc/Types';

@injectable()
export class NotificationServiceImpl implements INotificationService {
  constructor(
    @inject(TYPES.NotificationRepository)
    private readonly repository: NotificationRepository,
    @inject(TYPES.IInfraestructureMapper)
    private readonly mapper: IInfraestructureMapper,
  ) {}

  async registerPushDevice(
    userId: string,
    token: string,
    platform: DevicePlatform,
  ): Promise<DomainPushDeviceEntity> {
    const domainEntity: DomainPushDeviceEntity = {
      token: token.trim(),
      user_id: String(userId),
      platform,
    };

    const item = this.mapper.toEntity(domainEntity);
    const saved = await this.repository.saveDevice(item);
    return this.mapper.toDomain(saved);
  }

  async sendNotificationToUser(
    userId: string,
    title: string,
    body: string,
    data: Record<string, string> = {},
  ): Promise<{ sent: number; failed: number }> {
    const devices = await this.repository.findDevicesByUserId(String(userId));

    if (devices.length === 0) {
      console.log(`[NotificationService] No push devices found for user ${userId}`);
      return { sent: 0, failed: 0 };
    }

    const fcmServerKey = process.env.FCM_SERVER_KEY;
    let sent = 0;
    let failed = 0;

    for (const dev of devices) {
      try {
        if (!fcmServerKey) {
          console.log(
            `[FCM Mock / DryRun] Send to token ${dev.token.substring(0, 15)}...: ${title} - ${body}`,
          );
          sent++;
          continue;
        }

        // Firebase Cloud Messaging Legacy HTTP or HTTP v1
        const response = await axios.post(
          'https://fcm.googleapis.com/fcm/send',
          {
            to: dev.token,
            notification: {
              title,
              body,
            },
            data,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `key=${fcmServerKey}`,
            },
            timeout: 5000,
          },
        );

        if (response.data?.failure > 0) {
          console.warn(`[FCM] Token failure reported:`, response.data);
          failed++;
          // If Unregistered or InvalidRegistration, delete token
          const errorMsg = response.data?.results?.[0]?.error;
          if (errorMsg === 'NotRegistered' || errorMsg === 'InvalidRegistration') {
            await this.repository.deleteDevice(dev.token);
          }
        } else {
          sent++;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[FCM Error] Failed sending push to token ${dev.token}:`, message);
        failed++;
      }
    }

    return { sent, failed };
  }
}
