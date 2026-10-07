import { DeleteCommand, PutCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { injectable } from 'inversify';

import { dynamoDocClient } from '../client';
import { DynamoPushDeviceItem } from '../Entity/DeviceDynamoEntity';
import { NotificationRepository } from './NotificationRepository';

@injectable()
export class NotificationRepositoryImpl implements NotificationRepository {
  private readonly tableName: string;

  constructor() {
    this.tableName = process.env.PUSH_DEVICES_TABLE || 'ParkingPushDevices';
  }

  async saveDevice(item: DynamoPushDeviceItem): Promise<DynamoPushDeviceItem> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
    });

    await dynamoDocClient.send(command);
    return item;
  }

  async findDevicesByUserId(userId: string): Promise<DynamoPushDeviceItem[]> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'UserIndex',
        KeyConditionExpression: 'user_id = :uid',
        ExpressionAttributeValues: {
          ':uid': userId,
        },
      });

      const result = await dynamoDocClient.send(command);
      if (result.Items) {
        return result.Items as DynamoPushDeviceItem[];
      }
    } catch {
      // Fallback
    }

    const scan = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'user_id = :uid',
      ExpressionAttributeValues: {
        ':uid': userId,
      },
    });

    const scanResult = await dynamoDocClient.send(scan);
    return (scanResult.Items as DynamoPushDeviceItem[]) || [];
  }

  async deleteDevice(token: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: { token },
    });

    await dynamoDocClient.send(command);
  }
}
