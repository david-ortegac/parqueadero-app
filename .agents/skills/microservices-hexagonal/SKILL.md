---
name: microservices-hexagonal
description: >-
  Guía y estándar arquitectónico para crear proyectos basados en microservicios serverless en Node.js
  con Arquitectura Hexagonal (Ports & Adapters), persistencia en Amazon DynamoDB y despliegue en AWS Lambda.
  Usar cuando el usuario solicite crear un nuevo microservicio, diseñar una arquitectura distribuida por dominios,
  o implementar patrones de puertos y adaptadores con InversifyJS y DynamoDB.
---

# 🏗️ Steering: Arquitectura de Microservicios Hexagonal en Node.js + DynamoDB + AWS Lambda

Este documento establece el estándar técnico obligatorio para diseñar, construir y desplegar microservicios en **Node.js** con **Arquitectura Hexagonal (Ports and Adapters)**, almacenamiento en **Amazon DynamoDB** y ejecución en **AWS Lambda**, basado en el estándar del repositorio de referencia [`ms_rapiserv_products_lambda`](https://github.com/david-ortegac/ms_rapiserv_products_lambda).

---

## 📐 1. Principios Fundamentales de la Arquitectura

1. **Alineación con Domain-Driven Design (DDD)**: Cada microservicio representa un **Bounded Context** único y cohesivo.
2. **Principio Database-per-Service**: Cada microservicio es dueño exclusivo de su esquema de persistencia. Ningún microservicio puede leer o escribir directamente en la base de datos de otro.
3. **Independencia Tecnológica y Despliegue**: Cada microservicio tiene su propio `package.json`, su pipeline de build (`esbuild`) y empaquetado (`bestzip`), pudiendo desplegarse de manera aislada.
4. **Independencia del Framework y Persistencia**: La lógica de negocio (`domain`) no depende de DynamoDB, AWS SDK, Inversify ni HTTP. Todo lo externo entra o sale mediante **Puertos e Interfaces**.

---

## 📂 2. Estructura Canónica de un Microservicio

Todo microservicio debe respetar la siguiente topología de archivos y directorios:

```text
ms_<dominio>/
├── package.json               # Dependencias: inversify, reflect-metadata, @aws-sdk/*
├── tsconfig.json              # experimentalDecorators: true, emitDecoratorMetadata: true
├── build.config.mjs           # Bundler esbuild: target node22/node20, formato cjs
└── src/
    ├── index.ts               # Lambda entry point (export const handler)
    ├── adapter/               # Adaptadores primarios (Driving Adapters)
    │   └── restful/v1/controller/
    │       ├── <Domain>Controller.ts     # Interfaz: handleRequest(event: any): Promise<Response>
    │       ├── <Domain>ControllerImpl.ts # Implementación: enrutamiento HTTP, parsing, validaciones
    │       ├── Entity/                   # Adapter DTOs de entrada y salida
    │       └── Mapper/                   # Mappers DTO <-> Entidad de Dominio
    ├── application/           # Capa de Aplicación
    │   └── services/
    │       └── I<Domain>Service.ts       # Interfaz del caso de uso / servicio de aplicación
    ├── domain/                # Capa de Dominio (Core de Negocio)
    │   ├── Entities/          # Entidades puras de negocio
    │   ├── Ports/             # Interfaces de repositorios (si no se colocan en repo)
    │   └── <Domain>ServiceImpl.ts        # Reglas de negocio y lógica pura
    ├── infraestructure/       # Adaptadores secundarios (Driven Adapters)
    │   └── dynamo/
    │       ├── client.ts                 # Instancia DynamoDBDocumentClient (@aws-sdk/lib-dynamodb)
    │       ├── Entity/                   # Esquemas y modelos de Items en DynamoDB
    │       ├── Mapper/                   # Mapper DynamoItem <-> Entidad de Dominio
    │       └── Repository/               # Implementación NoSQL del puerto de persistencia
    ├── ioc/                   # Inversión de Control
    │   ├── Types.ts                      # Symbols de Inversify (TYPES.<Dependency>)
    │   └── inversify.config.ts           # Configuración del Container InversifyJS
    ├── models/                # Tipos de respuesta HTTP/Lambda ({ statusCode, headers, body })
    └── utils/                 # Validadores (JWT, placas, inputs), constructores de respuesta
```

---

## 🧩 3. Reglas de Implementación por Capa

### Capa 1: Dominio (`src/domain/`)
* **Entidades (`Entities/`)**: Tipos TypeScript o clases planas que representan las reglas del dominio sin anotaciones ORM ni dependencias de base de datos.
* **Servicio de Dominio (`ServiceImpl.ts`)**:
  * Anotado con `@injectable()`.
  * Recibe los repositorios mediante `@inject(TYPES.<Repository>)` e interfaces de infraestructura `@inject(TYPES.<Mapper>)`.
  * No maneja conceptos HTTP (no conoce `event`, `statusCode`, ni `headers`).
  * Lanza excepciones de dominio cuando las reglas de negocio fallan.

### Capa 2: Aplicación (`src/application/`)
* **Puertos de Servicio (`services/I<Domain>Service.ts`)**: Define el contrato de los casos de uso que el mundo exterior puede solicitar al dominio.

### Capa 3: Adaptador REST / Lambda (`src/adapter/`)
* **Controlador (`ControllerImpl.ts`)**:
  * Anotado con `@injectable()`.
  * Inyecta el servicio de aplicación `@inject(TYPES.<DomainService>)` y el mapper `@inject(TYPES.IAdapterMapper)`.
  * Normaliza eventos tanto de API Gateway HTTP API v2 (`event.rawPath`, `event.requestContext.http.method`) como de REST API v1 (`event.path`, `event.httpMethod`).
  * Valida tokens JWT llamando a `validateTokenFromEvent(event)` y comprueba roles de autorización.
  * Valida que el body tenga los campos obligatorios antes de delegar al dominio.
  * Devuelve objetos `Response` con código HTTP y cabeceras CORS.

### Capa 4: Infraestructura DynamoDB (`src/infraestructure/`)
* **Cliente (`client.ts`)**:
  * Inicializa `DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } })`.
  * Soporta `process.env.DYNAMODB_ENDPOINT` para emulación con DynamoDB Local.
* **Repositorio (`RepositoryImpl.ts`)**:
  * Anotado con `@injectable()`.
  * Utiliza los comandos optimizados del AWS SDK v3: `GetCommand`, `PutCommand`, `QueryCommand`, `DeleteCommand`, `ScanCommand`.
  * Diseñado con claves Hash (PK), Range (SK) e índices secundarios globales (GSIs) para evitar escaneos de tabla (`Scan`) en producción.

### Capa 5: IoC con InversifyJS (`src/ioc/`)
* Centralizar todos los identificadores en `Types.ts` mediante `Symbol.for('<Nombre>')`.
* Vincular cada interfaz con su implementación concreta en `inversify.config.ts`:
  ```typescript
  container.bind<MyRepository>(TYPES.MyRepository).to(MyRepositoryImpl);
  container.bind<IMyService>(TYPES.MyService).to(MyServiceImpl);
  container.bind<MyController>(TYPES.MyController).to(MyControllerImpl);
  ```

### Capa 6: Lambda Handler (`src/index.ts`)
* Reutiliza variables globales fuera del handler (`let controller: MyController`) para aprovechar el contexto caliente del contenedor Lambda entre invocaciones concurrentes:
  ```typescript
  import 'reflect-metadata';
  import { container } from './ioc/inversify.config';
  import { TYPES } from './ioc/Types';

  let controller: MyController;

  export const handler = async (event: any) => {
    if (!controller) {
      controller = container.get<MyController>(TYPES.MyController);
    }
    return controller.handleRequest(event);
  };
  ```

---

## ⚡ 4. Empaquetado Ultra-rápido con `esbuild`

El archivo `build.config.mjs` debe:
* Marcar como `external` los paquetes `@aws-sdk/client-dynamodb` y `@aws-sdk/lib-dynamodb` (ya incluidos en el runtime nativo de AWS Lambda para Node 20 y Node 22).
* Generar bundle único en `dist/index.js` en formato CommonJS (`format: "cjs"`).
* Generar un `dist/package.json` sintético para el empaquetado.
* Mantener el tamaño del archivo `.zip` resultante por debajo de **500 KB** para garantizar tiempos de Cold Start inferiores a 100 ms.

---

## 📝 5. Checklist para Crear un Nuevo Microservicio

- [ ] Definir el nombre del servicio en minúsculas con guiones bajos (ej. `ms_parking_billing`).
- [ ] Configurar `package.json` con scripts `build`, `clean`, `package`, `zip`.
- [ ] Configurar `tsconfig.json` con `experimentalDecorators: true` y `emitDecoratorMetadata: true`.
- [ ] Diseñar el modelo de datos en DynamoDB (PK, SK, GSIs).
- [ ] Implementar la capa de Dominio (Entidades y Reglas de Negocio puras).
- [ ] Implementar la capa de Infraestructura (Cliente DynamoDB, Mapper y Repositorio).
- [ ] Implementar la capa de Adaptador (Controlador HTTP, DTOs y Mapper).
- [ ] Registrar las dependencias en `Types.ts` e `inversify.config.ts`.
- [ ] Conectar el handler en `src/index.ts`.
- [ ] Probar compilación con `npm run package` y verificar que el `.zip` en `releases/` se genere sin errores.
