import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { injectable } from 'inversify';

import { dynamoDocClient } from './client';

export interface RateItemInfo {
  price: string;
  currency: string;
  is_active: boolean;
}

export interface CapacityItemInfo {
  max_slots: number;
}

@injectable()
export class RatesConfigReader {
  private readonly tableName: string;

  constructor() {
    this.tableName = process.env.RATES_CONFIG_TABLE || 'ParkingRatesConfig';
  }

  async getRate(vehicleClass: string, billingMode: string): Promise<RateItemInfo | null> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: {
          pk: 'RATE',
          sk: `${vehicleClass}#${billingMode}`,
        },
      });

      const result = await dynamoDocClient.send(command);
      if (result.Item) {
        return {
          price: String(result.Item.price),
          currency: result.Item.currency || 'COP',
          is_active: result.Item.is_active !== undefined ? result.Item.is_active : true,
        };
      }
    } catch (e) {
      console.warn('Could not read rate from DynamoDB:', e);
    }
    return null;
  }

  async getCapacity(vehicleClass: string): Promise<CapacityItemInfo | null> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: {
          pk: 'CAPACITY',
          sk: vehicleClass,
        },
      });

      const result = await dynamoDocClient.send(command);
      if (result.Item) {
        return {
          max_slots: Number(result.Item.max_slots),
        };
      }
    } catch (e) {
      console.warn('Could not read capacity from DynamoDB:', e);
    }
    return null;
  }
}
