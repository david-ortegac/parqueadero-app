import { DeleteCommand, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { injectable } from 'inversify';

import { dynamoDocClient } from '../client';
import {
  DynamoCapacityItem,
  DynamoRateItem,
  DynamoScheduleItem,
  DynamoSettingItem,
} from '../Entity/RatesConfigDynamoEntities';
import { RatesConfigRepository } from './RatesConfigRepository';

@injectable()
export class RatesConfigRepositoryImpl implements RatesConfigRepository {
  private readonly tableName: string;

  constructor() {
    this.tableName = process.env.RATES_CONFIG_TABLE || 'ParkingRatesConfig';
  }

  async findAllRates(): Promise<DynamoRateItem[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: {
        ':pk': 'RATE',
      },
    });

    const result = await dynamoDocClient.send(command);
    return (result.Items as DynamoRateItem[]) || [];
  }

  async findRate(vehicleClass: string, billingMode: string): Promise<DynamoRateItem | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        pk: 'RATE',
        sk: `${vehicleClass}#${billingMode}`,
      },
    });

    const result = await dynamoDocClient.send(command);
    return (result.Item as DynamoRateItem) || null;
  }

  async saveRate(item: DynamoRateItem): Promise<DynamoRateItem> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
    });

    await dynamoDocClient.send(command);
    return item;
  }

  async deleteRate(vehicleClass: string, billingMode: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: {
        pk: 'RATE',
        sk: `${vehicleClass}#${billingMode}`,
      },
    });

    await dynamoDocClient.send(command);
  }

  async findAllCapacities(): Promise<DynamoCapacityItem[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: {
        ':pk': 'CAPACITY',
      },
    });

    const result = await dynamoDocClient.send(command);
    return (result.Items as DynamoCapacityItem[]) || [];
  }

  async findCapacity(vehicleClass: string): Promise<DynamoCapacityItem | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        pk: 'CAPACITY',
        sk: vehicleClass,
      },
    });

    const result = await dynamoDocClient.send(command);
    return (result.Item as DynamoCapacityItem) || null;
  }

  async saveCapacity(item: DynamoCapacityItem): Promise<DynamoCapacityItem> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
    });

    await dynamoDocClient.send(command);
    return item;
  }

  async deleteCapacity(vehicleClass: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: {
        pk: 'CAPACITY',
        sk: vehicleClass,
      },
    });

    await dynamoDocClient.send(command);
  }

  async findAllSchedules(): Promise<DynamoScheduleItem[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: {
        ':pk': 'SCHEDULE',
      },
    });

    const result = await dynamoDocClient.send(command);
    return (result.Items as DynamoScheduleItem[]) || [];
  }

  async findSchedule(dayOfWeek: number): Promise<DynamoScheduleItem | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        pk: 'SCHEDULE',
        sk: `DAY#${dayOfWeek}`,
      },
    });

    const result = await dynamoDocClient.send(command);
    return (result.Item as DynamoScheduleItem) || null;
  }

  async saveSchedule(item: DynamoScheduleItem): Promise<DynamoScheduleItem> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
    });

    await dynamoDocClient.send(command);
    return item;
  }

  async getParkingInfo(): Promise<{ name: string | null; address: string | null }> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        pk: 'SETTING',
        sk: 'PARKING_INFO',
      },
    });

    const result = await dynamoDocClient.send(command);
    const item = result.Item as DynamoSettingItem;
    return {
      name: item?.name || null,
      address: item?.address || null,
    };
  }

  async saveParkingInfo(name?: string | null, address?: string | null): Promise<void> {
    const current = await this.getParkingInfo();
    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        pk: 'SETTING',
        sk: 'PARKING_INFO',
        name: name !== undefined ? name : current.name,
        address: address !== undefined ? address : current.address,
        updated_at: new Date().toISOString(),
      },
    });

    await dynamoDocClient.send(command);
  }
}
