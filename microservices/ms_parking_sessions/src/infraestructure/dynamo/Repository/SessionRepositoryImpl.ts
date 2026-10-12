import { GetCommand, PutCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { injectable } from 'inversify';

import { dynamoDocClient } from '../client';
import { DynamoSessionItem } from '../Entity/SessionDynamoEntity';
import { SessionRepository } from './SessionRepository';

@injectable()
export class SessionRepositoryImpl implements SessionRepository {
  private readonly tableName: string;

  constructor() {
    this.tableName = process.env.SESSIONS_TABLE || 'ParkingSessions';
  }

  async findById(id: string): Promise<DynamoSessionItem | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { id },
    });

    const result = await dynamoDocClient.send(command);
    return (result.Item as DynamoSessionItem) || null;
  }

  async findActiveByVehicleId(vehicleId: string): Promise<DynamoSessionItem | null> {
    const rawVid = vehicleId.trim();
    const cleanVid = rawVid.startsWith('VEH_') ? rawVid : `VEH_${rawVid.toUpperCase()}`;
    const plate = rawVid.replace(/^VEH_/, '').toUpperCase();

    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'VehicleIndex',
        KeyConditionExpression: 'vehicle_id = :vid',
        FilterExpression: '#st = :st',
        ExpressionAttributeNames: {
          '#st': 'status',
        },
        ExpressionAttributeValues: {
          ':vid': cleanVid,
          ':st': 'active',
        },
      });

      const result = await dynamoDocClient.send(command);
      if (result.Items && result.Items.length > 0) {
        return result.Items[0] as DynamoSessionItem;
      }
    } catch {
      // Fallback
    }

    try {
      const scan = new ScanCommand({
        TableName: this.tableName,
        FilterExpression:
          '(vehicle_id = :cleanVid OR vehicle_id = :rawVid OR vehicle_plate = :p) AND #st = :st',
        ExpressionAttributeNames: {
          '#st': 'status',
        },
        ExpressionAttributeValues: {
          ':cleanVid': cleanVid,
          ':rawVid': rawVid,
          ':p': plate,
          ':st': 'active',
        },
      });

      const scanResult = await dynamoDocClient.send(scan);
      return (scanResult.Items?.[0] as DynamoSessionItem) || null;
    } catch {
      return null;
    }
  }

  async findActiveSessions(): Promise<DynamoSessionItem[]> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'StatusIndex',
        KeyConditionExpression: '#st = :st',
        ExpressionAttributeNames: {
          '#st': 'status',
        },
        ExpressionAttributeValues: {
          ':st': 'active',
        },
        ScanIndexForward: false,
      });

      const result = await dynamoDocClient.send(command);
      if (result.Items) {
        return result.Items as DynamoSessionItem[];
      }
    } catch {
      // Fallback
    }

    const scan = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: '#st = :st',
      ExpressionAttributeNames: {
        '#st': 'status',
      },
      ExpressionAttributeValues: {
        ':st': 'active',
      },
    });

    const scanResult = await dynamoDocClient.send(scan);
    const items = (scanResult.Items as DynamoSessionItem[]) || [];
    return items.sort((a, b) => (b.entered_at || '').localeCompare(a.entered_at || ''));
  }

  async countActiveByVehicleClass(vehicleClass: 'car' | 'motorcycle'): Promise<number> {
    const active = await this.findActiveSessions();
    return active.filter(s => s.vehicle_class === vehicleClass).length;
  }

  async findSessionsByVehicleId(vehicleId: string): Promise<DynamoSessionItem[]> {
    const rawVid = vehicleId.trim();
    const cleanVid = rawVid.startsWith('VEH_') ? rawVid : `VEH_${rawVid.toUpperCase()}`;
    const plate = rawVid.replace(/^VEH_/, '').toUpperCase();

    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'VehicleIndex',
        KeyConditionExpression: 'vehicle_id = :vid',
        ExpressionAttributeValues: {
          ':vid': cleanVid,
        },
        ScanIndexForward: false,
      });

      const result = await dynamoDocClient.send(command);
      if (result.Items && result.Items.length > 0) {
        return result.Items as DynamoSessionItem[];
      }
    } catch {
      // Fallback
    }

    try {
      const scan = new ScanCommand({
        TableName: this.tableName,
        FilterExpression:
          'vehicle_id = :cleanVid OR vehicle_id = :rawVid OR vehicle_plate = :p',
        ExpressionAttributeValues: {
          ':cleanVid': cleanVid,
          ':rawVid': rawVid,
          ':p': plate,
        },
      });

      const scanResult = await dynamoDocClient.send(scan);
      const items = (scanResult.Items as DynamoSessionItem[]) || [];
      return items.sort((a, b) => (b.entered_at || '').localeCompare(a.entered_at || ''));
    } catch {
      return [];
    }
  }

  async findCompletedSessions(fromDate?: string, toDate?: string): Promise<DynamoSessionItem[]> {
    const scan = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: '#st = :st AND attribute_exists(amount_paid)',
      ExpressionAttributeNames: {
        '#st': 'status',
      },
      ExpressionAttributeValues: {
        ':st': 'completed',
      },
    });

    const scanResult = await dynamoDocClient.send(scan);
    let items = (scanResult.Items as DynamoSessionItem[]) || [];

    if (fromDate) {
      items = items.filter(s => s.exited_at && s.exited_at >= fromDate);
    }
    if (toDate) {
      const toIso = toDate.includes('T') ? toDate : `${toDate}T23:59:59.999Z`;
      items = items.filter(s => s.exited_at && s.exited_at <= toIso);
    }

    return items;
  }

  async findDailyCompleted(dateStr: string): Promise<DynamoSessionItem[]> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'DateIndex',
        KeyConditionExpression: 'exit_date = :d',
        ExpressionAttributeValues: {
          ':d': dateStr,
        },
      });

      const result = await dynamoDocClient.send(command);
      if (result.Items) {
        return (result.Items as DynamoSessionItem[]).filter(s => s.status === 'completed');
      }
    } catch {
      // Fallback
    }

    const scan = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: '#st = :st AND begins_with(exited_at, :d)',
      ExpressionAttributeNames: {
        '#st': 'status',
      },
      ExpressionAttributeValues: {
        ':st': 'completed',
        ':d': dateStr,
      },
    });

    const scanResult = await dynamoDocClient.send(scan);
    return (scanResult.Items as DynamoSessionItem[]) || [];
  }

  async findOpenStays(endOfDayIso: string): Promise<DynamoSessionItem[]> {
    const scan = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'entered_at <= :eod AND (#st = :active OR (exited_at > :eod))',
      ExpressionAttributeNames: {
        '#st': 'status',
      },
      ExpressionAttributeValues: {
        ':eod': endOfDayIso,
        ':active': 'active',
      },
    });

    const scanResult = await dynamoDocClient.send(scan);
    const items = (scanResult.Items as DynamoSessionItem[]) || [];
    return items.sort((a, b) => (a.entered_at || '').localeCompare(b.entered_at || ''));
  }

  async save(item: DynamoSessionItem): Promise<DynamoSessionItem> {
    const itemToSave = { ...item };
    if (!itemToSave.exit_date) {
      delete itemToSave.exit_date;
    }
    if (!itemToSave.exited_at) {
      delete itemToSave.exited_at;
    }

    const command = new PutCommand({
      TableName: this.tableName,
      Item: itemToSave,
    });

    await dynamoDocClient.send(command);
    return item;
  }

  async ensureVehicle(data: {
    plate: string;
    vehicle_class: string;
    depositor_document: string;
    owner_user_id?: string | number | null;
  }): Promise<void> {
    const vehiclesTable = process.env.VEHICLES_TABLE || 'ParkingVehicles';
    const plate = data.plate.toUpperCase().trim();
    const vehicleId = `VEH_${plate}`;
    const now = new Date().toISOString();

    try {
      const item: Record<string, any> = {
        id: vehicleId,
        plate,
        depositor_document: data.depositor_document,
        vehicle_class: data.vehicle_class,
        created_at: now,
        updated_at: now,
      };
      if (data.owner_user_id) {
        item.owner_user_id = String(data.owner_user_id);
      }

      const existing = await dynamoDocClient.send(
        new GetCommand({
          TableName: vehiclesTable,
          Key: { id: vehicleId },
        }),
      );

      if (existing.Item) {
        const updated = {
          ...existing.Item,
          depositor_document: data.depositor_document,
          vehicle_class: data.vehicle_class,
          owner_user_id: data.owner_user_id
            ? String(data.owner_user_id)
            : existing.Item.owner_user_id,
          updated_at: now,
        };
        await dynamoDocClient.send(
          new PutCommand({
            TableName: vehiclesTable,
            Item: updated,
          }),
        );
      } else {
        await dynamoDocClient.send(
          new PutCommand({
            TableName: vehiclesTable,
            Item: item,
          }),
        );
      }
    } catch (err) {
      console.warn('[SessionRepositoryImpl] Error ensuring vehicle in ParkingVehicles:', err);
    }
  }
}
