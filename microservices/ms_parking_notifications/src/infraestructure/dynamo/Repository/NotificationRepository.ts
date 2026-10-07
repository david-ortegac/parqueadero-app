import { DynamoPushDeviceItem } from '../Entity/DeviceDynamoEntity';

export interface NotificationRepository {
  saveDevice(item: DynamoPushDeviceItem): Promise<DynamoPushDeviceItem>;
  findDevicesByUserId(userId: string): Promise<DynamoPushDeviceItem[]>;
  deleteDevice(token: string): Promise<void>;
}
