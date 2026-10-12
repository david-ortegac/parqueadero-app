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
    const itemToSave = { ...item };
    if (!itemToSave.owner_user_id) {
      delete itemToSave.owner_user_id;
    }

    const command = new PutCommand({
      TableName: this.tableName,
      Item: itemToSave,
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

  async findSessionsByDocumentOrOwner(
    document?: string,
    ownerUserId?: string,
  ): Promise<Record<string, any>[]> {
    const sessionsTable = process.env.SESSIONS_TABLE || 'ParkingSessions';
    const cleanDoc = document ? document.replace(/\D+/g, '') : '';
    if (!cleanDoc && !ownerUserId) return [];

    try {
      const scanCommand = new ScanCommand({
        TableName: sessionsTable,
        FilterExpression: 'depositor_document = :doc OR owner_user_id = :owner',
        ExpressionAttributeValues: {
          ':doc': cleanDoc || 'NONE',
          ':owner': ownerUserId || 'NONE',
        },
      });
      const result = await dynamoDocClient.send(scanCommand);
      return (result.Items as Record<string, any>[]) || [];
    } catch (err) {
      console.warn('[VehicleRepositoryImpl] Error scanning sessions by doc/owner:', err);
      return [];
    }
  }

  async findActiveSession(
    plate: string,
    vehicleId?: string,
  ): Promise<Record<string, any> | null> {
    const sessionsTable = process.env.SESSIONS_TABLE || 'ParkingSessions';
    const normalizedPlate = plate.toUpperCase().trim();
    const targetVid = vehicleId || `VEH_${normalizedPlate}`;

    try {
      const queryCmd = new QueryCommand({
        TableName: sessionsTable,
        IndexName: 'VehicleIndex',
        KeyConditionExpression: 'vehicle_id = :vid',
        FilterExpression: '#st = :active',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: {
          ':vid': targetVid,
          ':active': 'active',
        },
      });
      const res = await dynamoDocClient.send(queryCmd);
      if (res.Items && res.Items.length > 0) {
        return res.Items[0] as Record<string, any>;
      }
    } catch {
      // Fallback to scan
    }

    try {
      const scanCmd = new ScanCommand({
        TableName: sessionsTable,
        FilterExpression: '#st = :active AND (vehicle_plate = :p OR vehicle_id = :vid)',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: {
          ':active': 'active',
          ':p': normalizedPlate,
          ':vid': targetVid,
        },
      });
      const res = await dynamoDocClient.send(scanCmd);
      return (res.Items?.[0] as Record<string, any>) || null;
    } catch (err) {
      console.warn('[VehicleRepositoryImpl] Error finding active session:', err);
      return null;
    }
  }

  async findRate(
    vehicleClass: string,
    billingMode: string,
  ): Promise<Record<string, any> | null> {
    const ratesTable = process.env.RATES_CONFIG_TABLE || 'ParkingRatesConfig';
    try {
      const getCmd = new GetCommand({
        TableName: ratesTable,
        Key: {
          pk: 'RATE',
          sk: `${vehicleClass}#${billingMode}`,
        },
      });
      const res = await dynamoDocClient.send(getCmd);
      if (res.Item && res.Item.is_active) {
        return res.Item as Record<string, any>;
      }
    } catch (err) {
      console.warn('[VehicleRepositoryImpl] Error getting rate:', err);
    }
    return null;
  }
}
