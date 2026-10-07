# 🌿 Regla de Steering: Patrón Strangler Fig (Higo Estrangulador)

Al ejecutar tareas de modernización o migración de sistemas monolíticos existentes hacia microservicios o arquitecturas serverless en este workspace o proyectos futuros, el agente DEBE adherirse a las siguientes directrices:

## Directrices Obligatorias
1. **Migración Incremental por Fases**: Queda terminantemente prohibido plantear reescrituras completas de tipo "Big Bang". La migración debe avanzar dividiendo el monolito en Bounded Contexts y migrando un único dominio a la vez.
2. **Fachada Transparente (Strangler Facade)**: Se debe utilizar una capa de enrutamiento unificada (Amazon API Gateway HTTP API v2 / CloudFront / ALB) frente a todo el sistema.
3. **Regla Fallback `$default`**: Toda ruta no migrada debe redirigirse automáticamente al backend monolítico existente mediante una integración proxy HTTP transparente. El cliente (frontend/móvil) no debe sufrir roturas de contrato ni caídas de servicio.
4. **Contratos Idénticos**: Los endpoints migrados deben mantener exactamente los mismos paths, métodos HTTP, query parameters, esquemas de payload JSON de entrada y formatos de respuesta del monolito original.
5. **Aislamiento de Persistencia**: Cada nuevo microservicio debe tener su propia base de datos (Database-per-service). No se permite que el nuevo microservicio comparta directamente conexiones SQL ni tablas con el monolito.
6. **Plan de Reversibilidad**: Cada fase debe ser reversible al instante; en caso de fallo, basta con retirar la ruta específica del API Gateway para que el tráfico regrese al monolito de forma inmediata.
