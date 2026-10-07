import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { injectable } from 'inversify';

import { dynamoDocClient } from '../client';
import { DynamoVehicleItem } from '../Entity/VehicleDynamoEntity';
import { VehicleRepository } from './VehicleRepository';

@injectable()
export class VehicleRepositoryImpl implements VehicleRepository {
  private readonly tableName: string;

  constructor() {
    this.tableName = process.env.VEHICLES_TABLE || 'ParkingVehicles';
  }

  async findById(id: string): Promise<DynamoVehicleItem | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { id },
    });

    const result = await dynamoDocClient.send(command);
    return (result.Item as DynamoVehicleItem) || null;
  }

  async findByPlate(plate: string): Promise<DynamoVehicleItem | null> {
    const normalized = plate.toUpperCase().trim();
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'PlateIndex',
        KeyConditionExpression: 'plate = :p',
        ExpressionAttributeValues: {
          ':p': normalized,
        },
      });

      const result = await dynamoDocClient.send(command);
      if (result.Items && result.Items.length > 0) {
        return result.Items[0] as DynamoVehicleItem;
      }
    } catch {
      // Fallback to scan
    }

    const scanCommand = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'plate = :p',
      ExpressionAttributeValues: {
        ':p': normalized,
      },
    });

    const scanResult = await dynamoDocClient.send(scanCommand);
    return (scanResult.Items?.[0] as DynamoVehicleItem) || null;
  }

  async findByOwnerId(ownerUserId: string): Promise<DynamoVehicleItem[]> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'OwnerIndex',
        KeyConditionExpression: 'owner_user_id = :owner',
        ExpressionAttributeValues: {
          ':owner': ownerUserId,
        },
      });

      const result = await dynamoDocClient.send(command);
      if (result.Items) {
        return result.Items as DynamoVehicleItem[];
      }
    } catch {
      // Fallback
    }

    const scanCommand = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'owner_user_id = :owner',
      ExpressionAttributeValues: {
        ':owner': ownerUserId,
      },
    });

    const scanResult = await dynamoDocClient.send(scanCommand);
    return (scanResult.Items as DynamoVehicleItem[]) || [];
  }

  async findByDocument(document: string): Promise<DynamoVehicleItem[]> {
    const docDigits = document.replace(/\D+/g, '');
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'DocumentIndex',
        KeyConditionExpression: 'depositor_document = :doc',
        ExpressionAttributeValues: {
          ':doc': docDigits,
        },
      });

      const result = await dynamoDocClient.send(command);
      if (result.Items) {
        return result.Items as DynamoVehicleItem[];
      }
    } catch {
      // Fallback
    }

    const scanCommand = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'depositor_document = :doc',
      ExpressionAttributeValues: {
        ':doc': docDigits,
      },
    });

    const scanResult = await dynamoDocClient.send(scanCommand);
    return (scanResult.Items as DynamoVehicleItem[]) || [];
  }

  async save(item: DynamoVehicleItem): Promise<DynamoVehicleItem> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
    });

    await dynamoDocClient.send(command);
    return item;
  }

  async delete(id: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: { id },
    });

    await dynamoDocClient.send(command);
  }
}
