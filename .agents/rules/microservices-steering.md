# 🏗️ Regla de Steering: Arquitectura de Microservicios Hexagonal en Node.js + DynamoDB

Al crear, modificar o diseñar microservicios backend basados en Node.js para despliegue en AWS Lambda, el agente DEBE seguir de forma obligatoria los siguientes estándares arquitectónicos:

## Directrices Obligatorias
1. **Patrón Arquitectónico**: Implementar Arquitectura Hexagonal estricta (Ports and Adapters), respetando la estructura del estándar `ms_rapiserv_products_lambda`:
   - `src/adapter/restful/v1/controller/`: Controladores HTTP, DTOs y Mappers de Adaptador.
   - `src/application/services/`: Puertos de servicio / Casos de uso de la aplicación (`I<Domain>Service.ts`).
   - `src/domain/`: Entidades de negocio puras, servicios de dominio (`<Domain>ServiceImpl.ts`) y reglas de negocio sin acoplamiento a infraestructura.
   - `src/infraestructure/dynamo/`: Adaptadores DynamoDB (Client, Schemas/Items, Mappers y Repositorios).
   - `src/ioc/`: Contenedor InversifyJS con inyección de dependencias (`Types.ts`, `inversify.config.ts`, decoradores `@injectable()` y `@inject()`).
   - `src/index.ts`: Handler exportado para AWS Lambda.
2. **Persistencia DynamoDB**:
   - Usar `@aws-sdk/client-dynamodb` y `@aws-sdk/lib-dynamodb` (DynamoDBDocumentClient con marshalling automático).
   - Diseñar claves Hash (PK), Range (SK) y GSIs para optimizar consultas y evitar escaneos de tabla (`Scan`).
   - Soportar emulación local mediante variable `DYNAMODB_ENDPOINT`.
3. **Empaquetado y Rendimiento Serverless**:
   - Compilar usando `esbuild` (`build.config.mjs`) con target `node20`/`node22`, formato `cjs` y bundle único en `dist/index.js`.
   - Externalizar `@aws-sdk/*` para mantener el bundle por debajo de 500 KB y tiempos de Cold Start inferiores a 100 ms.
   - Generar el paquete de despliegue `.zip` en `releases/` mediante scripts `package` y `zip`.
4. **Respuesta y Manejo de Errores**:
   - Centralizar respuestas con cabeceras CORS en formato estándar `{ statusCode, headers, body }`.
   - Manejar validaciones de tokens JWT mediante `jwt-validator.ts` y control de acceso basado en roles (RBAC).
