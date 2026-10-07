# 🏗️ Steering Global: Arquitectura de Microservicios Hexagonal en Node.js + DynamoDB + AWS Lambda

> **Ubicación recomendada para uso global en tu máquina:**
> Copia este archivo a `~/.gemini/config/rules/microservices-steering.md` o a la carpeta `.agents/rules/` de cualquier proyecto donde vayas a crear o estructurar microservicios.

---

## 🎯 1. Propósito del Steering
Este documento de steering establece el estándar arquitectónico y procedimental para diseñar, construir y desplegar microservicios serverless en **Node.js** con **Arquitectura Hexagonal (Ports and Adapters)**, almacenamiento en **Amazon DynamoDB** y ejecución en **AWS Lambda**, basado en el estándar del repositorio de referencia [`ms_rapiserv_products_lambda`](https://github.com/david-ortegac/ms_rapiserv_products_lambda).

---

## 🏛️ 2. Topología Canónica de Archivos

Cada microservicio debe estructurarse obligatoriamente de la siguiente manera:

```text
ms_<nombre_dominio>/
├── package.json               # Dependencias: inversify, reflect-metadata, @aws-sdk/client-dynamodb, @aws-sdk/lib-dynamodb
├── tsconfig.json              # experimentalDecorators: true, emitDecoratorMetadata: true
├── build.config.mjs           # Bundler esbuild: target node22/node20, format cjs, external aws-sdk
└── src/
    ├── index.ts               # Lambda Handler principal (reutilización de controlador en contexto caliente)
    ├── adapter/               # Adaptadores Primarios (Driving)
    │   └── restful/v1/controller/
    │       ├── <Domain>Controller.ts      # Interfaz del controlador HTTP
    │       ├── <Domain>ControllerImpl.ts  # Implementación con manejo de eventos, validaciones y CORS
    │       ├── Entity/                    # DTOs de entrada y salida del Adapter
    │       └── Mapper/                    # Mappers DTO <-> Entidad de Dominio
    ├── application/           # Capa de Aplicación
    │   └── services/
    │       └── I<Domain>Service.ts        # Interfaz de casos de uso del servicio
    ├── domain/                # Capa de Dominio (Reglas Puras de Negocio)
    │   ├── Entities/          # Entidades puras de negocio (sin anotaciones de BD ni ORM)
    │   ├── Ports/             # Interfaces de repositorios
    │   └── <Domain>ServiceImpl.ts         # Implementación de la lógica de negocio con @injectable()
    ├── infraestructure/       # Adaptadores Secundarios (Driven)
    │   └── dynamo/
    │       ├── client.ts                  # DynamoDBDocumentClient con removeUndefinedValues: true
    │       ├── Entity/                    # Esquemas de persistencia e Items de DynamoDB
    │       ├── Mapper/                    # Mapper bidireccional Item DynamoDB <-> Entidad de Dominio
    │       └── Repository/                # Repositorio DynamoDB (Query, Get, Put, Delete)
    ├── ioc/                   # Inversión de Control & Inyección de Dependencias
    │   ├── Types.ts                       # Símbolos únicos de Inversify (TYPES.<Dependency>)
    │   └── inversify.config.ts            # Contenedor IoC con binding de todas las dependencias
    ├── models/                # Tipos de respuesta ({ statusCode, headers, body })
    └── utils/                 # Validadores JWT, constructores de respuesta con CORS y helpers
```

---

## ⚡ 3. Reglas Técnicas Obligatorias

### 1. Inyección de Dependencias (IoC)
* Usar **InversifyJS** con `reflect-metadata`.
* Registrar cada dependencia en `src/ioc/Types.ts` mediante `Symbol.for('<Nombre>')`.
* Anotar todas las clases con `@injectable()` y resolver dependencias en constructores usando `@inject(TYPES.<Token>)`.
* El handler `index.ts` debe resolver el controlador únicamente la primera vez y cachearlo en memoria caliente.

### 2. Persistencia en Amazon DynamoDB
* Usar `@aws-sdk/client-dynamodb` y `@aws-sdk/lib-dynamodb`.
* Modelar las entidades con claves Hash (`pk` / `id`), Range (`sk`) y Global Secondary Indexes (`GSIs`).
* **Prohibido realizar Scans masivos en endpoints de producción**. Todo acceso debe ser por `GetCommand` o `QueryCommand` indexado.
* Soportar emulación local mediante variable de entorno `DYNAMODB_ENDPOINT=http://localhost:8000`.

### 3. Bundling Serverless con `esbuild`
* Usar `build.config.mjs` con:
  ```javascript
  external: ["@aws-sdk/client-dynamodb", "@aws-sdk/lib-dynamodb"],
  platform: "node",
  target: "node22",
  format: "cjs"
  ```
* El tamaño del bundle empaquetado debe ser inferior a **500 KB** para tiempos de Cold Start inferiores a 100 ms.

### 4. Manejo de Errores y HTTP Responses
* Devolver siempre respuestas estructuradas con cabeceras CORS:
  ```json
  {
    "statusCode": 200,
    "headers": {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    "body": "{...}"
  }
  ```
* Códigos estándar: `200` OK, `201` Created, `204` No Content, `400` Bad Request, `401` Unauthorized, `403` Forbidden, `404` Not Found, `422` Unprocessable Entity, `500` Internal Error.

---

## 📋 4. Checklist para Iniciar un Nuevo Microservicio

1. [ ] Crear la carpeta `ms_<dominio>/` e inicializar `package.json`, `tsconfig.json` y `build.config.mjs`.
2. [ ] Crear la estructura de carpetas: `adapter`, `application`, `domain`, `infraestructure`, `ioc`, `models`, `utils`.
3. [ ] Modelar la tabla DynamoDB correspondiente (claves PK, SK, GSIs).
4. [ ] Crear la entidad y el servicio de dominio con sus pruebas unitarias.
5. [ ] Implementar el repositorio DynamoDB y su mapper en `infraestructure/`.
6. [ ] Implementar el controlador y mapper en `adapter/`.
7. [ ] Realizar el binding en `src/ioc/inversify.config.ts`.
8. [ ] Conectar el Lambda handler en `src/index.ts`.
9. [ ] Probar compilación con `npm run package` y verificar el archivo `.zip` en `releases/`.
10. [ ] Registrar la función y rutas en la plantilla AWS SAM `template.yaml`.
