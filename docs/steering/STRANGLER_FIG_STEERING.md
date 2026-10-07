# 🌿 Steering Global: Patrón Strangler Fig (Higo Estrangulador)

> **Ubicación recomendada para uso global en tu máquina:**
> Copia este archivo a `~/.gemini/config/rules/strangler-fig-steering.md` o a la carpeta `.agents/rules/` de cualquier proyecto donde vayas a realizar una migración de monolito a microservicios.

---

## 🎯 1. Propósito del Steering
Este documento de steering establece las directrices, el procedimiento operativo estándar y las decisiones técnicas obligatorias que debe seguir cualquier asistente o desarrollador al momento de modernizar o migrar un sistema monolítico legado hacia una arquitectura distribuida o serverless en la nube sin interrumpir la operación del negocio (**Zero Downtime**).

---

## 📌 2. Principios Inmutables

1. **Prohibición del "Big Bang"**: La reescritura total y el reemplazo en un solo lanzamiento están estrictamente vetados. La migración debe ocurrir dominio por dominio, de forma incremental.
2. **Fachada Transparente (Strangler Facade)**: Se debe colocar una capa de enrutamiento (ej. AWS API Gateway HTTP API v2 / CloudFront / ALB / Nginx) delante de todo el sistema.
3. **Fallback al Monolito por Defecto**: Todas las rutas que aún no hayan sido expresamente extraídas o migradas deben resolverse mediante una regla comodín (`$default` o `{proxy+}`) redirigida directamente al backend monolítico existente.
4. **Contratos Inmutables hacia el Cliente**: El frontend web, aplicaciones móviles o consumidores externos no deben sufrir modificaciones en firmas de URLs, payloads de entrada ni estructuras de respuesta JSON.
5. **Autonomía de Datos (Database-per-Service)**: Todo nuevo microservicio debe ser dueño de su propia base de datos (ej. DynamoDB). No se permite que el microservicio comparta tablas o conexiones directas con la base de datos relacional del monolito.

---

## 🚀 3. Procedimiento Paso a Paso para Cualquier Proyecto

### Paso 1: Auditoría y Desacoplamiento de Dominios
1. Extraer el mapa de rutas del monolito (endpoints, métodos HTTP, autenticación, roles requeridos).
2. Segmentar los endpoints en **Bounded Contexts** (Contextos Delimitados).
3. Seleccionar el orden de estrangulamiento:
   * **Fase Inicial:** Dominios de sólo lectura, catálogos o configuración (mínimo riesgo).
   * **Fase Intermedia:** Autenticación, usuarios y perfiles.
   * **Fase Avanzada:** Flujos transaccionales, operaciones centrales y pagos.

### Paso 2: Despliegue de la Fachada Estranguladora
1. Desplegar el API Gateway HTTP API v2 con configuración CORS unificada.
2. Configurar la integración proxy `HTTP_PROXY` hacia el backend del monolito:
   * Ruta: `$default` (o `{proxy+}`)
   * Target: `https://monolito-url.com/api/{proxy}`
3. Apuntar la URL base (`apiUrl`) de las aplicaciones cliente hacia el API Gateway. Validar que el monolito siga operando de manera transparente.

### Paso 3: Construcción del Nuevo Microservicio
1. Construir el microservicio con **Arquitectura Hexagonal (Ports & Adapters)**.
2. Diseñar el almacenamiento dedicado (ej. DynamoDB con claves PK, SK y GSIs).
3. Crear el handler Lambda que atienda las peticiones despachadas por el API Gateway.
4. Empaquetar y probar de forma aislada.

### Paso 4: Desvío de Tráfico en la Fachada
1. Registrar en el API Gateway las rutas específicas que ahora atenderá el nuevo microservicio (ej. `/v1/rates`, `/v1/config`).
2. El API Gateway resolverá estas rutas con prioridad sobre el fallback `$default`.
3. El tráfico de este dominio ahora es atendido al 100% por la Lambda serverless sin que el monolito reciba esas peticiones.

### Paso 5: Desmantelamiento (Decommissioning)
1. Monitorear logs y métricas de error (CloudWatch Logs / X-Ray).
2. Retirar o archivar el código del dominio migrado en el monolito.
3. Repetir el proceso con el siguiente dominio.
4. Al migrar el último dominio, eliminar la integración `$default` y apagar la infraestructura del monolito.

---

## 🛠️ 4. Plantilla de Enrutamiento AWS SAM (template.yaml)

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  # Fachada Strangler Fig
  HttpApiGateway:
    Type: AWS::Serverless::HttpApi
    Properties:
      CorsConfiguration:
        AllowOrigins: ['*']
        AllowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
        AllowHeaders: ['*']

  # Microservicio Migrado (ejemplo: Rates)
  RatesFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ms_rates/dist/
      Handler: index.handler
      Runtime: nodejs22.x
      Events:
        RatesRoute:
          Type: HttpApi
          Properties:
            ApiId: !Ref HttpApiGateway
            Path: /v1/rates
            Method: ANY
```
