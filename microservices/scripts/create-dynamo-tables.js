#!/usr/bin/env node
const {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
} = require('@aws-sdk/client-dynamodb');

const isLocal = process.env.IS_OFFLINE || process.env.NODE_ENV === 'development' || process.env.DYNAMODB_ENDPOINT;
const endpoint = process.env.DYNAMODB_ENDPOINT || (isLocal ? 'http://localhost:8000' : undefined);
const region = process.env.AWS_REGION || 'us-east-1';

console.log(`🔌 Conectando a DynamoDB (Region: ${region}${endpoint ? `, Endpoint: ${endpoint}` : ''})...`);

const client = new DynamoDBClient({
  region,
  ...(endpoint ? { endpoint } : {}),
});

const tables = [
  {
    TableName: process.env.USERS_TABLE || 'ParkingUsers',
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' },
      { AttributeName: 'document', AttributeType: 'S' },
      { AttributeName: 'role', AttributeType: 'S' },
      { AttributeName: 'created_at', AttributeType: 'S' },
    ],
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'EmailIndex',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'DocumentIndex',
        KeySchema: [{ AttributeName: 'document', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'RoleIndex',
        KeySchema: [
          { AttributeName: 'role', KeyType: 'HASH' },
          { AttributeName: 'created_at', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  },
  {
    TableName: process.env.RATES_CONFIG_TABLE || 'ParkingRatesConfig',
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'pk', AttributeType: 'S' },
      { AttributeName: 'sk', AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'pk', KeyType: 'HASH' },
      { AttributeName: 'sk', KeyType: 'RANGE' },
    ],
  },
  {
    TableName: process.env.VEHICLES_TABLE || 'ParkingVehicles',
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'plate', AttributeType: 'S' },
      { AttributeName: 'owner_user_id', AttributeType: 'S' },
      { AttributeName: 'depositor_document', AttributeType: 'S' },
    ],
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'PlateIndex',
        KeySchema: [{ AttributeName: 'plate', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'OwnerIndex',
        KeySchema: [{ AttributeName: 'owner_user_id', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'DocumentIndex',
        KeySchema: [{ AttributeName: 'depositor_document', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  },
  {
    TableName: process.env.SESSIONS_TABLE || 'ParkingSessions',
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'vehicle_id', AttributeType: 'S' },
      { AttributeName: 'status', AttributeType: 'S' },
      { AttributeName: 'entered_at', AttributeType: 'S' },
      { AttributeName: 'exit_date', AttributeType: 'S' },
      { AttributeName: 'exited_at', AttributeType: 'S' },
    ],
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'StatusIndex',
        KeySchema: [
          { AttributeName: 'status', KeyType: 'HASH' },
          { AttributeName: 'entered_at', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'VehicleIndex',
        KeySchema: [
          { AttributeName: 'vehicle_id', KeyType: 'HASH' },
          { AttributeName: 'entered_at', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'DateIndex',
        KeySchema: [
          { AttributeName: 'exit_date', KeyType: 'HASH' },
          { AttributeName: 'exited_at', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  },
  {
    TableName: process.env.PUSH_DEVICES_TABLE || 'ParkingPushDevices',
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'token', AttributeType: 'S' },
      { AttributeName: 'user_id', AttributeType: 'S' },
    ],
    KeySchema: [{ AttributeName: 'token', KeyType: 'HASH' }],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'UserIndex',
        KeySchema: [{ AttributeName: 'user_id', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  },
];

async function createTables() {
  for (const tableConfig of tables) {
    try {
      console.log(`⏳ Verificando tabla '${tableConfig.TableName}'...`);
      await client.send(new DescribeTableCommand({ TableName: tableConfig.TableName }));
      console.log(`ℹ️ La tabla '${tableConfig.TableName}' ya existe.`);
    } catch (err) {
      if (err.name === 'ResourceNotFoundException') {
        console.log(`🚀 Creando tabla '${tableConfig.TableName}'...`);
        try {
          await client.send(new CreateTableCommand(tableConfig));
          console.log(`✅ Tabla '${tableConfig.TableName}' creada exitosamente.`);
        } catch (createErr) {
          console.error(`❌ Error al crear '${tableConfig.TableName}':`, createErr.message);
        }
      } else {
        console.error(`❌ Error al consultar '${tableConfig.TableName}':`, err.message);
      }
    }
  }
  console.log('🎉 Proceso de creación de tablas finalizado.');
}

createTables();
