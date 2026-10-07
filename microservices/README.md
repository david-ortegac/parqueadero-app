# 🚗 Parqueadero App - Suite de Microservicios Serverless (Node.js + DynamoDB + AWS Lambda)

Este repositorio contiene la arquitectura migrada del backend de **Parqueadero App**, pasando del monolito Laravel legacy a un ecosistema de **microservicios serverless en Node.js** con **Arquitectura Hexagonal (Ports & Adapters)**, almacenamiento en **Amazon DynamoDB** y despliegue sobre **AWS Lambda** y **Amazon API Gateway HTTP API**, siguiendo el patrón arquitectónico **Strangler Fig (Higo Estrangulador)**.

La estructura y patrones técnicos fueron diseñados tomando como estándar de referencia el repositorio base [`ms_rapiserv_products_lambda`](https://github.com/david-ortegac/ms_rapiserv_products_lambda).

---

## 🏛️ 1. Arquitectura Hexagonal (Ports and Adapters)

Cada microservicio implementa de manera estricta la separación en capas hexagonales desacopladas:

```
ms_parking_<dominio>/
├── src/
│   ├── index.ts                      # Lambda Handler (Entrypoint de AWS Lambda)
│   ├── adapter/                      # Adaptadores Primarios / Secundarios
│   │   └── restful/v1/controller/
│   │       ├── <Domain>Controller.ts      # Interfaz del controlador HTTP/Lambda
│   │       ├── <Domain>ControllerImpl.ts  # Implementación que procesa eventos de API Gateway
│   │       ├── Entity/                    # DTOs de entrada y salida del Adapter
│   │       └── Mapper/                    # Mapeo entre DTOs y Entidades de Dominio
│   ├── application/                  # Capa de Aplicación
│   │   └── services/
│   │       └── I<Domain>Service.ts   # Interfaz del servicio / Casos de uso
│   ├── domain/                       # Capa de Dominio (Lógica de Negocio Pura)
│   │   ├── Entities/                 # Entidades del Dominio
│   │   ├── Ports/                    # Puertos e interfaces de repositorios
│   │   └── <Domain>ServiceImpl.ts    # Implementación de las reglas de negocio
│   ├── infraestructure/              # Adaptadores de Infraestructura
│   │   └── dynamo/
│   │       ├── client.ts             # Cliente DynamoDB DocumentClient
│   │       ├── Entity/               # Modelos y esquemas de persistencia DynamoDB
│   │       ├── Mapper/               # Mapeo entre DynamoDB Items y Entidades de Dominio
│   │       └── Repository/           # Repositorio DynamoDB (Implementación del puerto)
│   ├── ioc/                          # Inversión de Control & Inyección de Dependencias
│   │   ├── Types.ts                  # Símbolos únicos de InversifyJS
│   │   └── inversify.config.ts       # Contenedor IoC con binding de dependencias
│   ├── models/                       # Modelos auxiliares (Response de API Gateway)
│   └── utils/                        # Validadores JWT, de placas, helpers de respuesta HTTP
├── build.config.mjs                  # Bundler optimizado con esbuild (target Node 22 CJS)
├── package.json                      # Scripts de build, clean y zip
└── tsconfig.json                     # Configuración de TypeScript con decoradores
```

---

## 🌿 2. Dominios Separados en Microservicios

El sistema se divide en **5 microservicios autónomos** alineados a sus Bounded Contexts:

| Microservicio                  | Dominio de Trabajo        | Responsabilidades Principales                                                                                                                            | Tabla DynamoDB       |
| ------------------------------ | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| **`ms_parking_auth`**          | Autenticación y Usuarios  | Registro de clientes, Login con JWT, roles (`admin`, `operator`, `vehicle_owner`), gestión de usuarios y activación de cuentas.                          | `ParkingUsers`       |
| **`ms_parking_rates_config`**  | Tarifas y Configuración   | Tarifas dinámicas (minuto, hora, día, semana, mes), cupos y capacidad máxima por vehículo, horarios de atención y configuración general.                 | `ParkingRatesConfig` |
| **`ms_parking_vehicles`**      | Vehículos y Propietarios  | Catálogo de vehículos, validación de placas colombianas (carros y motos), vinculación de propietarios y perfiles de vehículos.                           | `ParkingVehicles`    |
| **`ms_parking_sessions`**      | Operaciones y Facturación | Check-in, Check-out, cálculo en tiempo real de cobro (Billing Service), ocupación en vivo, consulta pública por placa, historial y reportes financieros. | `ParkingSessions`    |
| **`ms_parking_notifications`** | Dispositivos Push (FCM)   | Registro de tokens de notificación de la app (iOS, Android, Web) y envío de alertas push automáticas ante ingresos y salidas.                            | `ParkingPushDevices` |

---

## 🗄️ 3. Modelo de Datos en Amazon DynamoDB

El almacenamiento fue diseñado para alto rendimiento y baja latencia en entornos serverless:

### 1. `ParkingUsers`

- **PK:** `id` (String)
- **GSI `EmailIndex`:** `email` (HASH)
- **GSI `DocumentIndex`:** `document` (HASH)
- **GSI `RoleIndex`:** `role` (HASH), `created_at` (RANGE)

### 2. `ParkingRatesConfig` (Single-Table Design para Configuración)

- **PK:** `pk` (String) — ej. `RATE`, `CAPACITY`, `SCHEDULE`, `SETTING`
- **SK:** `sk` (String) — ej. `car#hour`, `motorcycle#minute`, `car`, `DAY#1`, `PARKING_INFO`

### 3. `ParkingVehicles`

- **PK:** `id` (String)
- **GSI `PlateIndex`:** `plate` (HASH)
- **GSI `OwnerIndex`:** `owner_user_id` (HASH)
- **GSI `DocumentIndex`:** `depositor_document` (HASH)

### 4. `ParkingSessions`

- **PK:** `id` (String)
- **GSI `StatusIndex`:** `status` (HASH), `entered_at` (RANGE)
- **GSI `VehicleIndex`:** `vehicle_id` (HASH), `entered_at` (RANGE)
- **GSI `DateIndex`:** `exit_date` (HASH: YYYY-MM-DD), `exited_at` (RANGE)

### 5. `ParkingPushDevices`

- **PK:** `token` (String)
- **GSI `UserIndex`:** `user_id` (HASH)

---

## 🌳 4. Implementación del Patrón Strangler Fig (Higo Estrangulador)

El patrón **Strangler Fig** permite sustituir el monolito en producción de forma progresiva sin tiempo de inactividad:

1. **Fachada Unificada (Strangler Facade):**
   - Se despliega un **Amazon API Gateway HTTP API v2** delante del sistema.
2. **Enrutamiento por Fases:**
   - Las rutas de los dominios migrados se conectan directamente a sus respectivas funciones Lambda.
   - La ruta por defecto (`$default` o `{proxy+}`) redirige las peticiones aún no migradas o de contingencia al backend monolítico de Laravel (`https://parkingsoft.davidortega.dev/api`).
3. **Cero Impacto en el Frontend:**
   - La aplicación Angular/Ionic simplemente apunta a la URL base del API Gateway. Las firmas de endpoints, rutas, códigos HTTP y payloads JSON son 100% idénticos a los del monolito.

```
                         [ Frontend / Ionic App ]
                                    |
                                    v
                     +-------------------------------+
                     |   Amazon API Gateway (Facade) |
                     +---------------+---------------+
                                     |
        +----------------------------+---------------------------+
        |                  |                 |                   | (Fallback)
        v                  v                 v                   v
[ms_parking_auth] [ms_parking_rates] [ms_parking_sessions] [Legacy Monolith]
    (Lambda)           (Lambda)          (Lambda)           (Laravel PHP)
        |                  |                 |
        v                  v                 v
  DynamoDB Users    DynamoDB Rates    DynamoDB Sessions
```

---

## 🚀 5. Instrucciones de Compilación y Despliegue en AWS

### Requisitos Previos

- Node.js v20+ o v22+ y npm
- AWS CLI configurado (`aws configure`)
- AWS SAM CLI (opcional pero recomendado: `sam --version`)

---

### Paso 1: Compilar y Empaquetar Todos los Microservicios

Desde la raíz de la carpeta `microservices`:

```bash
cd microservices
npm run build:all
```

Este comando ejecuta en paralelo el empaquetador `esbuild` en cada microservicio, generando los archivos de distribución en `dist/` y los paquetes comprimidos en `releases/`.

---

### Paso 2: Crear las Tablas en DynamoDB

Para crear las 5 tablas con sus claves y GSIs en AWS (o en DynamoDB local):

```bash
# En AWS (usa las credenciales configuradas en tu AWS CLI)
npm run dynamo:create-tables

# O para DynamoDB Local:
# DYNAMODB_ENDPOINT=http://localhost:8000 npm run dynamo:create-tables
```

---

### Paso 3: Sembrar Datos Iniciales (Seed)

Para cargar los usuarios de prueba iniciales (Admin, Operador, Propietario), las tarifas base de carros y motos, la capacidad de parqueo y los horarios:

```bash
npm run dynamo:seed
```

---

### Paso 4: Despliegue en AWS con AWS SAM

El archivo [`template.yaml`](file:///home/david/Documentos/GitHub/parqueadero-app/microservices/template.yaml) contiene la definición completa de Infraestructura como Código (IaC).

```bash
# Construir la aplicación SAM
sam build

# Desplegar de forma guiada en tu cuenta de AWS
sam deploy --guided
```

Durante el asistente de SAM:

- **Stack Name:** `parqueadero-serverless-stack`
- **AWS Region:** `us-east-1` (o tu región preferida)
- **JwtSecretKey:** Introduce tu clave secreta de producción
- **LegacyBackendUrl:** URL de fallback del backend Laravel legacy
- **Confirm changes before deploy:** `Y`
- **Allow SAM CLI IAM role creation:** `Y`

Al finalizar, SAM te proporcionará el `HttpApiUrl` de salida (ej. `https://xyz123.execute-api.us-east-1.amazonaws.com`).

---

### Paso 5: Conectar el Frontend Angular / Ionic

Simplemente actualiza el archivo de entorno en el frontend:

`frontend/src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://xyz123.execute-api.us-east-1.amazonaws.com/v1',
};
```

---

## 🧪 6. Pruebas y Verificación Local

Cada microservicio puede ejecutarse y compilarse de manera individual:

```bash
cd microservices/ms_parking_rates_config
npm run build
npm run package
```

¡Todo el proyecto se encuentra compilado, probado y listo para producción en AWS! 🚀
