# Plan actualizado por etapas

Este plan traduce el prototipo actual en un roadmap implementable, organizado por etapas con objetivos claros, entregables y criterios de salida.

## Etapa 0. Alineación y fundaciones
- **Objetivo:** Consolidar alcance funcional, roles y requisitos no funcionales.
- **Entregables:** Matriz de permisos por rol, definición de datos oficiales y flujos críticos, checklist de cumplimiento (seguridad, backups, observabilidad).
- **Criterios de salida:** Historias priorizadas con criterios de aceptación, decision log de arquitectura y CI/CD inicial configurado.

## Etapa 1. Identidad y núcleo técnico
- **Objetivo:** Autenticación/autorización propia y plataforma base del backend.
- **Entregables:** API NestJS/Express con TypeScript, PostgreSQL versionado (migraciones), Redis para sesiones/colas, emisión de JWT + refresh tokens, middleware de autorización, logging estructurado.
- **Criterios de salida:** Login real en frontend (reemplazo completo del mock), rutas protegidas con expiración/refresh, despliegue continuo a dev.

## Etapa 2. Clientes, documentos y ficha 360
- **Objetivo:** Gestionar clientes y sus artefactos principales.
- **Entregables:** CRUD de clientes/contactos, notas y adjuntos en storage (S3/local), endpoint de ficha 360 que agregue pólizas, gestiones y documentos, hooks de frontend con formularios validados.
- **Criterios de salida:** Alta/edición/consulta completa de clientes con adjuntos; ficha 360 navegable desde el frontend sin datos mock.

## Etapa 3. Pólizas y siniestros
- **Objetivo:** Registrar pólizas y seguimiento de siniestros.
- **Entregables:** Servicios para pólizas (vigencias, primas, movimientos), siniestros con etapas y documentos, filtros por ramo/estado/aseguradora, auditoría de cambios.
- **Criterios de salida:** Operadores pueden crear/editar pólizas y siniestros, ver historial y descargar adjuntos.

## Etapa 4. Pipeline comercial
- **Objetivo:** Operar oportunidades y tareas asociadas.
- **Entregables:** Oportunidades con etapas, responsables y adjuntos; relación a clientes/pólizas; cambios de etapa con comentarios y auditoría; vistas de tablero y filtros persistentes en frontend.
- **Criterios de salida:** Pipeline utilizable end-to-end con estados, responsables y adjuntos; métricas básicas de conversión por etapa.

## Etapa 5. Renovaciones y recordatorios
- **Objetivo:** Anticipar vencimientos y coordinar acciones.
- **Entregables:** Generador de cartera próxima a vencer, asignación de responsables, recordatorios mediante colas/notificaciones, reintentos y logs.
- **Criterios de salida:** Listado operativo de renovaciones con estados y responsables, notificaciones entregadas y registradas.

## Etapa 6. Producción, comisiones y aseguradoras
- **Objetivo:** Métricas operativas y catálogo de compañías.
- **Entregables:** Cálculos de producción y comisiones por periodo/productor/aseguradora, metas y bonificaciones, exportes CSV/Excel; CRUD de aseguradoras con KPIs de siniestralidad y acuerdos clave.
- **Criterios de salida:** Tableros consumiendo datos reales, exportes verificados y catálogo de aseguradoras administrable.

## Etapa 7. Gestiones operativas y agenda
- **Objetivo:** Gestionar tareas y seguimiento diario.
- **Entregables:** Gestiones con estados, responsables y checklist de documentos; agrupación por fecha; notas e historial; vistas en frontend conectadas a API.
- **Criterios de salida:** Agenda usable para priorizar tareas, con trazabilidad y adjuntos disponibles.

## Etapa 8. Observabilidad, QA y hardening
- **Objetivo:** Estabilizar y preparar producción.
- **Entregables:** Pruebas unitarias, integración y e2e críticas; dashboards de métricas y logs centralizados; backups automatizados; políticas de retención y cifrado; documentación de API (OpenAPI) y runbooks.
- **Criterios de salida:** Pipelines verdes, alertas configuradas, respaldo/restauración probado y documentación publicada.

## Etapa 9. Despliegue y adopción
- **Objetivo:** Liberar a usuarios reales y acompañar uso.
- **Entregables:** Beta controlada con feature flags, plan de soporte, formación de usuarios clave, roadmap de mejoras post lanzamiento.
- **Criterios de salida:** Deploy productivo estable, métricas de adopción monitoreadas y backlog priorizado para iteraciones siguientes.
