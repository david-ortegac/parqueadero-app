#!/usr/bin/env node
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const bcrypt = require('bcryptjs');

const isLocal =
  process.env.IS_OFFLINE || process.env.NODE_ENV === 'development' || process.env.DYNAMODB_ENDPOINT;
const endpoint = process.env.DYNAMODB_ENDPOINT || (isLocal ? 'http://localhost:8000' : undefined);
const region = process.env.AWS_REGION || 'us-east-1';

const rawClient = new DynamoDBClient({
  region,
  ...(endpoint ? { endpoint } : {}),
});

const docClient = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: { removeUndefinedValues: true },
});

const USERS_TABLE = process.env.USERS_TABLE || 'ParkingUsers';
const RATES_CONFIG_TABLE = process.env.RATES_CONFIG_TABLE || 'ParkingRatesConfig';

async function seed() {
  console.log('🌱 Sembrando datos iniciales en DynamoDB...');

  try {
    // 1. Usuarios iniciales
    const passwordHash = await bcrypt.hash('password123', 10);
    const now = new Date().toISOString();

    const users = [
      {
        id: '1',
        name: 'Administrador General',
        email: 'admin@parqueadero.com',
        document: '123456789',
        password: passwordHash,
        role: 'admin',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: '2',
        name: 'Operador Principal',
        email: 'operador@parqueadero.com',
        document: '987654321',
        password: passwordHash,
        role: 'operator',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: '3',
        name: 'Juan Perez Propietario',
        email: 'propietario@parqueadero.com',
        document: '10203040',
        password: passwordHash,
        role: 'vehicle_owner',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ];

    for (const u of users) {
      await docClient.send(new PutCommand({ TableName: USERS_TABLE, Item: u }));
      console.log(`👤 Usuario sembrado: ${u.email} (${u.role})`);
    }

    // 2. Tarifas iniciales
    const rates = [
      { vehicle_class: 'car', billing_mode: 'minute', price: '80', currency: 'COP' },
      { vehicle_class: 'car', billing_mode: 'hour', price: '4000', currency: 'COP' },
      { vehicle_class: 'car', billing_mode: 'day', price: '30000', currency: 'COP' },
      { vehicle_class: 'car', billing_mode: 'week', price: '120000', currency: 'COP' },
      { vehicle_class: 'car', billing_mode: 'month', price: '250000', currency: 'COP' },
      { vehicle_class: 'motorcycle', billing_mode: 'minute', price: '40', currency: 'COP' },
      { vehicle_class: 'motorcycle', billing_mode: 'hour', price: '2000', currency: 'COP' },
      { vehicle_class: 'motorcycle', billing_mode: 'day', price: '15000', currency: 'COP' },
      { vehicle_class: 'motorcycle', billing_mode: 'week', price: '60000', currency: 'COP' },
      { vehicle_class: 'motorcycle', billing_mode: 'month', price: '120000', currency: 'COP' },
    ];

    for (const r of rates) {
      await docClient.send(
        new PutCommand({
          TableName: RATES_CONFIG_TABLE,
          Item: {
            pk: 'RATE',
            sk: `${r.vehicle_class}#${r.billing_mode}`,
            id: `${r.vehicle_class}_${r.billing_mode}`,
            vehicle_class: r.vehicle_class,
            billing_mode: r.billing_mode,
            price: r.price,
            currency: r.currency,
            is_active: true,
            created_at: now,
            updated_at: now,
          },
        }),
      );
      console.log(`💵 Tarifa sembrada: ${r.vehicle_class} - ${r.billing_mode} = $${r.price}`);
    }

    // 3. Capacidad de cupos
    await docClient.send(
      new PutCommand({
        TableName: RATES_CONFIG_TABLE,
        Item: {
          pk: 'CAPACITY',
          sk: 'car',
          id: 'car',
          vehicle_class: 'car',
          max_slots: 20,
          created_at: now,
          updated_at: now,
        },
      }),
    );
    await docClient.send(
      new PutCommand({
        TableName: RATES_CONFIG_TABLE,
        Item: {
          pk: 'CAPACITY',
          sk: 'motorcycle',
          id: 'motorcycle',
          vehicle_class: 'motorcycle',
          max_slots: 30,
          created_at: now,
          updated_at: now,
        },
      }),
    );
    console.log('🚗 Cupos sembrados: Carros 20, Motos 30');

    // 4. Horarios (días 0 al 6)
    for (let d = 0; d <= 6; d++) {
      await docClient.send(
        new PutCommand({
          TableName: RATES_CONFIG_TABLE,
          Item: {
            pk: 'SCHEDULE',
            sk: `DAY#${d}`,
            id: `schedule_${d}`,
            day_of_week: d,
            opens_at: '06:00',
            closes_at: '22:00',
            is_closed: false,
            created_at: now,
            updated_at: now,
          },
        }),
      );
    }
    console.log('⏰ Horarios sembrados (06:00 a 22:00 todos los días)');

    // 5. Configuración General del Parqueadero
    await docClient.send(
      new PutCommand({
        TableName: RATES_CONFIG_TABLE,
        Item: {
          pk: 'SETTING',
          sk: 'PARKING_INFO',
          name: 'Parqueadero Inteligente Central',
          address: 'Calle 10 # 45-20, Medellín',
          updated_at: now,
        },
      }),
    );
    console.log('🏢 Información general del parqueadero sembrada');

    console.log('🎉 Seed completado con éxito!');
  } catch (err) {
    console.error('❌ Error en seed:', err);
  }
}

seed();
