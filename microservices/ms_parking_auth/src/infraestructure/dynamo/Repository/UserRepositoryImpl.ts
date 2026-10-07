import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { injectable } from 'inversify';

import { dynamoDocClient } from '../client';
import { DynamoUserItem } from '../Entity/UserDynamoEntity';
import { UserRepository } from './UserRepository';

@injectable()
export class UserRepositoryImpl implements UserRepository {
  private readonly tableName: string;

  constructor() {
    this.tableName = process.env.USERS_TABLE || 'ParkingUsers';
  }

  async findById(id: string): Promise<DynamoUserItem | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { id },
    });

    const result = await dynamoDocClient.send(command);
    return (result.Item as DynamoUserItem) || null;
  }

  async findByEmail(email: string): Promise<DynamoUserItem | null> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'EmailIndex',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': email.toLowerCase().trim(),
        },
      });

      const result = await dynamoDocClient.send(command);
      if (result.Items && result.Items.length > 0) {
        return result.Items[0] as DynamoUserItem;
      }
    } catch {
      // Fallback to scan if index not yet provisioned in dev
    }

    const scanCommand = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email.toLowerCase().trim(),
      },
    });

    const scanResult = await dynamoDocClient.send(scanCommand);
    return (scanResult.Items?.[0] as DynamoUserItem) || null;
  }

  async findByDocument(document: string): Promise<DynamoUserItem | null> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'DocumentIndex',
        KeyConditionExpression: '#doc = :doc',
        ExpressionAttributeNames: {
          '#doc': 'document',
        },
        ExpressionAttributeValues: {
          ':doc': document,
        },
      });

      const result = await dynamoDocClient.send(command);
      if (result.Items && result.Items.length > 0) {
        return result.Items[0] as DynamoUserItem;
      }
    } catch {
      // Fallback to scan
    }

    const scanCommand = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: '#doc = :doc',
      ExpressionAttributeNames: {
        '#doc': 'document',
      },
      ExpressionAttributeValues: {
        ':doc': document,
      },
    });

    const scanResult = await dynamoDocClient.send(scanCommand);
    return (scanResult.Items?.[0] as DynamoUserItem) || null;
  }

  async findAll(): Promise<DynamoUserItem[]> {
    const command = new ScanCommand({
      TableName: this.tableName,
    });

    const result = await dynamoDocClient.send(command);
    return (result.Items as DynamoUserItem[]) || [];
  }

  async findByRole(role: string): Promise<DynamoUserItem[]> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'RoleIndex',
        KeyConditionExpression: '#r = :r',
        ExpressionAttributeNames: {
          '#r': 'role',
        },
        ExpressionAttributeValues: {
          ':r': role,
        },
      });

      const result = await dynamoDocClient.send(command);
      if (result.Items) {
        return result.Items as DynamoUserItem[];
      }
    } catch {
      // Fallback
    }

    const scanCommand = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: '#r = :r',
      ExpressionAttributeNames: {
        '#r': 'role',
      },
      ExpressionAttributeValues: {
        ':r': role,
      },
    });

    const scanResult = await dynamoDocClient.send(scanCommand);
    return (scanResult.Items as DynamoUserItem[]) || [];
  }

  async create(item: DynamoUserItem): Promise<DynamoUserItem> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
    });

    await dynamoDocClient.send(command);
    return item;
  }

  async update(item: DynamoUserItem): Promise<DynamoUserItem> {
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
