# Blueprint de implementación completa

Este documento baja a tierra el roadmap de `PLAN.md` para construir la versión completa de la aplicación de gestión de seguros, cubriendo backend, frontend, datos, infraestructura y calidad.

## 1) Arquitectura técnica
- **Backend:** Node.js + TypeScript con NestJS (o Express modular) y Prisma/TypeORM sobre PostgreSQL.
- **Autenticación:** Credenciales propias con JWT + refresh tokens, roles y permisos por recurso/acción.
- **Estado y colas:** Redis para sesiones efímeras, throttling y workers de recordatorios/notificaciones.
- **Archivos:** Almacenamiento en S3 (o compatible) con presigned URLs; adaptador local para dev.
- **Frontend:** React 18 + Vite + Tailwind; data-fetching con TanStack Query y router protegido por roles.
- **Observabilidad:** Winston/Pino + OpenTelemetry; métricas Prometheus y trazas para endpoints críticos.

## 2) Dominio y modelo de datos (esquema base)
- **Identidad:** usuarios, roles, permisos, sesiones (refresh), logs de acceso.
- **Clientes:** cliente, contactos, direcciones, notas, documentos.
- **Pólizas:** póliza, vigencias, primas, movimientos, aseguradora, ramo, estado.
- **Siniestros:** siniestro, etapa, documentos, historial de acciones.
- **Pipeline:** oportunidad, etapa, responsable, monto, probabilidad, adjuntos, auditoría de cambios.
- **Gestiones:** tarea, estado, responsable, fecha de compromiso, checklist de documentos, comentarios.
- **Renovaciones:** registro de póliza próxima a vencer, responsable, recordatorios enviados, resultado.
- **Producción/Comisiones:** productor, metas por periodo, producción por ramo/aseguradora, comisiones calculadas.
- **Aseguradoras:** catálogo con KPIs (siniestralidad, acuerdos, contactos) y estados.
- **Documentos:** metadatos compartidos (owner, tipo, scope, URL, hash, permisos).

## 3) Backend: módulos y endpoints clave
Organizar en `apps/api/src/modules/*` (NestJS) con DTOs y validación.
- **Auth:** /auth/login, /auth/refresh, /auth/logout; middleware de roles; rotación de tokens.
- **Usuarios/Roles:** CRUD de usuarios, asignación de roles, auditoría de permisos.
- **Clientes:** CRUD + contactos/notas/adjuntos; ficha 360 agregada (`/clients/:id/summary`).
- **Pólizas:** CRUD pólizas, vigencias, movimientos; búsqueda por ramo/aseguradora/estado.
- **Siniestros:** alta/edición, cambio de etapa, documentos y comentarios.
- **Pipeline:** listar/filtrar, cambio de etapa con comentario, adjuntos, relación a clientes/pólizas.
- **Gestiones:** CRUD tareas, cambio de estado, checklist, adjuntos y agrupación por fecha.
- **Renovaciones:** generación de cartera, asignación de responsables, recordatorios (cola), reintentos y logs.
- **Producción/Comisiones:** endpoints agregados por periodo/productor/aseguradora; exportes CSV.
- **Aseguradoras:** CRUD, KPIs y acuerdos; filtros por ramo/estado.
- **Documentos:** servicio de uploads (presigned), descarga y verificación de permisos.
- **Reporting:** exportes y reportes operativos con paginación y filtros seguros.

## 4) Frontend: líneas de trabajo
- **Autenticación real:** formulario de login que llama a `/auth/login`, guarda tokens, refresca y cierra sesión al expirar.
- **Protección por rol:** guardas en router y componentes; esconder acciones según permisos.
- **Data hooks:** React Query en `src/modules/<dominio>/hooks.ts` para CRUD, filtros y paginación.
- **Formularios robustos:** react-hook-form + zod/yup; estados de carga, error y éxito.
- **Adjuntos:** soporte de uploads con progreso y previsualización usando presigned URLs.
- **Tableros y filtros:** dashboards para pipeline, producción y renovaciones con filtros persistentes en URL y estados memorizados.
- **Ficha 360:** vista consolidada del cliente con pólizas, siniestros, gestiones y documentos.
- **UX operativa:** listas con inline editing para etapas/estados, barras de estado y toasts de errores.

## 5) Infraestructura y seguridad
- **CI/CD:** pipelines con lint, pruebas unitarias, integración (API + DB), build frontend y despliegue a dev/stage/prod.
- **Entornos:** variables seguras (Vault/Secrets Manager), imágenes containerizadas, migrations automáticas con fallback seguro.
- **Seguridad:** HTTPS, CSP, validación de payloads, rate limiting, bloqueos por intentos fallidos, rotación de keys JWT, backups cifrados.
- **Observabilidad:** logs estructurados, métricas y trazas; tableros y alertas en endpoints de autenticación, renovaciones y uploads.

## 6) Pruebas y calidad
- **Backend:** unitarias (servicios), integración (HTTP + DB), contract tests (OpenAPI), tests de colas y storage.
- **Frontend:** unitarias de hooks/componentes, tests de formularios, e2e críticos (login, alta cliente, pipeline, renovaciones) con Playwright/Cypress.
- **Datos y migraciones:** smoke tests post-deploy y validaciones de integridad.

## 7) Plan de entrega iterativo (alto nivel)
1. **Semana 1-2:** Setup repo monorepo, CI/CD, autenticación propia, usuarios/roles, storage y logging básico.
2. **Semana 3-5:** Clientes + documentos + ficha 360 conectada; sustitución de mocks en frontend.
3. **Semana 6-8:** Pólizas y siniestros; pipeline comercial completo con adjuntos y auditoría.
4. **Semana 9-10:** Renovaciones con colas/recordatorios; gestiones operativas y agenda.
5. **Semana 11-12:** Producción/comisiones y catálogo de aseguradoras; dashboards y exportes.
6. **Semana 13-14:** Hardening, observabilidad, pruebas e2e y preparación de despliegue.
7. **Semana 15+:** Beta controlada, feature flags, soporte y mejoras continuas.

## 8) Checklist mínimo por hito
- **Auth listo:** login/refresh/logout reales, roles aplicados, auditoría de accesos.
- **Archivos:** uploads con presigned URLs, tipos validados, limpieza de huérfanos, virus scan opcional.
- **Cartera y pipeline:** filtros paginados, cambios de etapa con comentarios, adjuntos y métricas básicas.
- **Renovaciones:** generación automática diaria, asignación, recordatorios enviados y registrados.
- **Comisiones/producción:** cálculos verificables, exportes, metas configurables.
- **QA/Observabilidad:** tableros de métricas, alertas, pruebas verdes y runbooks publicados.
