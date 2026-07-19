# Estrategia SaaS, Mercado Pago y despliegue HTTPS para Gestión de Seguros

## 1. Objetivo

Convertir el prototipo actual de Gestión de Seguros en una aplicación SaaS desplegable en el mismo servidor que `EstablecimientoGanadero` y `LinsseGestionStock`, reutilizando el mismo patrón general de:

- Suscripciones por tenant/empresa.
- Integración con Mercado Pago para altas, pagos recurrentes y webhooks.
- Acceso público mediante HTTPS detrás de proxy reverso.
- Backend y frontend aislados en puertos propios para evitar conflictos con las otras aplicaciones.
- Variables de entorno separadas por aplicación y ambiente.

> Relevamiento actualizado: se consultaron los README públicos de `ufernand853/EstablecimientoGanadero` y `ufernand853/LinsseGestionStock` para alinear esta implementación con sus patrones SaaS, Mercado Pago, HTTPS y puertos.

## 2. Estado actual del proyecto

El proyecto ya tiene una base útil para evolucionar a SaaS:

- Frontend React + Vite con rutas protegidas.
- Backend Express con MongoDB.
- Login con JWT y refresh token.
- `PORT` configurable para el backend, con valor por defecto `4020`.
- `VITE_API_URL` configurable para que el frontend consuma `/api` detrás de proxy reverso.
- Vite configurado para desarrollo en `0.0.0.0:4273` y proxy local `/api -> http://127.0.0.1:4020`.

Antes de agregar pagos conviene estabilizar esta base en producción con configuración por entorno y proxy HTTPS.

## 3. Información a relevar de los otros sistemas

Para asegurar que Gestión de Seguros tenga las mismas características SaaS que `EstablecimientoGanadero` y `LinsseGestionStock`, se debe relevar en esos repositorios o en el servidor:

### 3.1. Suscripciones y tenants

- Modelo de datos usado para empresas/tenants.
- Relación entre usuario, tenant, roles y plan contratado.
- Estados de suscripción existentes: `trial`, `active`, `past_due`, `paused`, `cancelled`, etc.
- Límites por plan: usuarios, módulos, almacenamiento, cantidad de registros o funcionalidades.
- Middleware que bloquea acceso cuando la suscripción no está activa.

### 3.2. Mercado Pago

- Tipo de integración: Checkout Pro, suscripciones/preapproval, pagos únicos o combinación.
- Endpoints existentes para crear preferencia o suscripción.
- Endpoint público de webhook y forma de validar notificaciones.
- Mapeo entre pagos de Mercado Pago y tenant interno.
- Variables de entorno usadas (`ACCESS_TOKEN`, `PUBLIC_KEY`, URLs de retorno, secretos o claves de webhook).
- Estrategia de idempotencia para no procesar dos veces la misma notificación.

### 3.3. HTTPS y proxy reverso

- Si se usa Nginx, Apache, Caddy o Traefik.
- Dominios/subdominios actuales.
- Certificados: Let's Encrypt, Cloudflare, certificados manuales.
- Rutas públicas actuales: por subdominio (`seguros.linsse.com`) o por path (`/seguros`).
- Puertos ocupados por cada frontend/backend.
- Servicio de procesos: systemd, PM2, Docker Compose u otro.

## 3.4. Hallazgos de EstablecimientoGanadero y LinsseGestionStock

### EstablecimientoGanadero

- Monorepo con `apps/web`, `apps/api`, `packages/shared` y despliegue por `deploy/systemd`.
- Web Next.js publicada en puerto interno `3100`, con Nginx escuchando HTTPS en `:3000` para evitar `EADDRINUSE`.
- API en `3001` y proxy interno del frontend.
- Flujo SaaS con demo de 5 días y activación por webhook externo:
  - `POST /auth/register-subscription`
  - `POST /auth/demo-request`
  - `POST /billing/webhook`
  - `GET /auth/session`
- Webhook firmado con `x-webhook-signature` calculado como HMAC SHA-256 del JSON crudo usando `BILLING_WEBHOOK_SECRET`.

### LinsseGestionStock

- Backend Express + MongoDB/Mongoose con JWT access/refresh, roles, permisos y healthcheck público.
- Preparación SaaS con `NODE_ENV=production`, `CORS_ORIGINS`, `TRUST_PROXY`, secretos seguros y `GET /health`.
- Licenciamiento inicial con planes Básico, Pro y Empresa, tenant asociado a plan/suscripción y bloque `license` en login/refresh.
- Publicación recomendada en `stock.linsse.com` con frontend estático y backend local `127.0.0.1:3010`.
- Mercado Pago Uruguay con endpoints:
  - `GET /api/public/plans`
  - `POST /api/public/register`
  - `POST /api/webhooks/mercadopago`
  - `GET /api/billing/license`
- Variables Mercado Pago: `PUBLIC_APP_URL`, `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_PUBLIC_KEY`, `MERCADOPAGO_COUNTRY=UY`, `MERCADOPAGO_CURRENCY=UYU` y URLs de éxito/pendiente/error/notificación.

## 4. Estrategia recomendada de arquitectura SaaS

### 4.1. Multi-tenant por tenant_id

Agregar un módulo de tenancy con estas colecciones mínimas:

- `tenants`: empresa/organización SaaS.
- `subscriptions`: estado local de la suscripción.
- `plans`: catálogo de planes y límites.
- `billing_events`: auditoría de eventos recibidos desde Mercado Pago.
- `tenant_users`: relación usuario-tenant-rol si se quiere permitir usuarios en múltiples empresas.

Todos los datos operativos principales deberían incluir `tenant_id`:

- Clientes.
- Pólizas.
- Siniestros.
- Tareas/gestiones.
- Renovaciones.
- Documentos.
- Configuraciones de aseguradoras y productores.

### 4.2. Middleware de tenant y suscripción

El backend debe resolver el tenant en cada request autenticado, preferentemente desde el JWT o desde una tabla de sesión, y aplicar:

1. Validación de usuario autenticado.
2. Validación de pertenencia al tenant.
3. Validación de rol/permisos.
4. Validación de suscripción activa o período de gracia.
5. Filtros obligatorios por `tenant_id` en consultas y escrituras.

### 4.3. Separación entre módulos internos y billing

No mezclar la lógica de seguros con la lógica de cobro. Se recomienda crear módulos separados:

- `auth`: login, refresh, logout.
- `tenancy`: tenants, usuarios por tenant, roles.
- `billing`: planes, suscripciones, Mercado Pago, webhooks.
- `insurance`: clientes, pólizas, siniestros, renovaciones, producción.

## 5. Integración con Mercado Pago

### 5.1. Flujo propuesto

1. El administrador crea una cuenta/tenant o selecciona un plan.
2. Backend crea una suscripción en Mercado Pago asociando un `external_reference` con el `tenant_id` y el `plan_id`.
3. Frontend redirige al usuario al checkout o muestra el flujo correspondiente.
4. Mercado Pago notifica cambios por webhook.
5. Backend consulta el recurso notificado a Mercado Pago, valida el estado real y actualiza `subscriptions`.
6. El middleware habilita o bloquea módulos según el estado de la suscripción.

### 5.2. Endpoints sugeridos

- `GET /api/billing/plans`: listar planes disponibles.
- `POST /api/billing/checkout`: crear suscripción/preapproval para un tenant.
- `GET /api/billing/subscription`: ver estado de la suscripción actual.
- `POST /api/billing/mercadopago/webhook`: recibir notificaciones públicas.
- `POST /api/billing/portal`: opcional, generar link o instrucciones de gestión/cancelación.

### 5.3. Variables de entorno sugeridas

```env
# Mercado Pago
MP_ACCESS_TOKEN=
MP_PUBLIC_KEY=
MP_WEBHOOK_SECRET=
MP_SUCCESS_URL=https://seguros.linsse.com/billing/success
MP_FAILURE_URL=https://seguros.linsse.com/billing/failure
MP_PENDING_URL=https://seguros.linsse.com/billing/pending
MP_NOTIFICATION_URL=https://seguros.linsse.com/api/billing/mercadopago/webhook

# SaaS
SAAS_PUBLIC_URL=https://seguros.linsse.com
SAAS_APP_NAME=Gestión de Seguros
DEFAULT_TRIAL_DAYS=0
SUBSCRIPTION_GRACE_DAYS=3
```

### 5.4. Reglas críticas

- Nunca exponer `MP_ACCESS_TOKEN` en el frontend.
- Usar `external_reference` o metadata para relacionar Mercado Pago con `tenant_id`.
- Procesar webhooks de forma idempotente guardando el ID del evento/recurso en `billing_events`.
- No confiar solo en el payload del webhook: consultar a Mercado Pago antes de cambiar el estado local.
- Registrar auditoría completa de altas, pausas, pagos vencidos y cancelaciones.

## 6. Puertos y convivencia en el mismo servidor

El proyecto no debe reutilizar puertos ya ocupados por `EstablecimientoGanadero` ni `LinsseGestionStock`.

### 6.1. Puertos actuales del proyecto

- Backend Express: `4020` por defecto.
- Frontend Vite dev: `4273`.
- Proxy de desarrollo: `/api -> http://127.0.0.1:4020`.

### 6.2. Puertos recomendados para producción

Para evitar colisiones, reservar un bloque exclusivo para Gestión de Seguros:

```env
# Backend producción
PORT=4020

# Frontend preview/servicio interno si aplica
FRONTEND_PORT=4273

# Frontend
VITE_API_URL=/api
```

El proxy HTTPS debería exponer solo `443` hacia afuera y enrutar internamente:

- `https://seguros.linsse.com/` -> frontend en `127.0.0.1:4273` o archivos estáticos.
- `https://seguros.linsse.com/api/` -> backend en `127.0.0.1:4020`.

Si el servidor usa paths en lugar de subdominios:

- `https://apps.linsse.com/seguros/` -> frontend.
- `https://apps.linsse.com/seguros/api/` -> backend.

La opción por subdominio es preferible porque simplifica cookies, callbacks de Mercado Pago, CSP y rutas del frontend.

## 7. HTTPS y proxy reverso

### 7.1. Configuración Nginx orientativa

```nginx
server {
  listen 80;
  server_name seguros.linsse.com;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name seguros.linsse.com;

  ssl_certificate /etc/letsencrypt/live/seguros.linsse.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/seguros.linsse.com/privkey.pem;

  location /api/ {
    proxy_pass http://127.0.0.1:4020/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
  }

  location / {
    proxy_pass http://127.0.0.1:4273/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
  }
}
```

### 7.2. Consideraciones de seguridad

- Forzar redirect HTTP -> HTTPS.
- Configurar HSTS cuando el dominio esté estable.
- Limitar CORS a dominios reales de producción.
- Agregar rate limiting a login y webhooks.
- Usar secretos distintos por aplicación.
- Ejecutar backups diarios de MongoDB y pruebas periódicas de restauración.

## 8. Plan de implementación por fases

### Fase 0. Auditoría comparativa

- Obtener acceso local o remoto a `EstablecimientoGanadero` y `LinsseGestionStock`.
- Documentar puertos, dominios, variables, servicios y configuración de proxy.
- Identificar código reutilizable de billing/Mercado Pago.
- Definir el dominio final: subdominio recomendado `seguros.linsse.com`.

### Fase 1. Preparar despliegue base

- Cambiar configuración productiva a puertos exclusivos (`4020` backend, `4273` frontend si se sirve con proceso Node).
- Crear `.env.production` en el servidor, sin commitear secretos.
- Configurar proceso con systemd/PM2/Docker Compose.
- Configurar Nginx/Caddy con HTTPS.
- Validar healthcheck del backend.

### Fase 2. SaaS multi-tenant

- Crear colecciones `tenants`, `plans`, `subscriptions`, `billing_events`.
- Agregar `tenant_id` a datos operativos.
- Adaptar login/JWT para incluir tenant activo.
- Implementar middleware de tenant y suscripción.
- Crear pantalla de selección/estado de plan.

### Fase 3. Mercado Pago

- Instalar SDK oficial o integrar por API REST desde backend.
- Crear endpoints de checkout/suscripción.
- Implementar webhook idempotente.
- Sincronizar estados de suscripción.
- Probar con credenciales sandbox y luego producción.

### Fase 4. Hardening y salida productiva

- Ajustar CORS, CSP, logs y rate limits.
- Agregar métricas mínimas: login, pagos, webhooks, errores 5xx.
- Agregar tests de billing y middleware SaaS.
- Documentar runbook de operación: renovar certificado, rotar secretos, restaurar backup, revisar webhooks fallidos.

## 9. Decisiones recomendadas

- Usar subdominio propio para esta app: `seguros.linsse.com`.
- Reservar puertos internos `4020` y `4273` salvo que la auditoría del servidor indique conflicto.
- Mantener `VITE_API_URL=/api` en producción para no acoplar el frontend a puertos internos.
- Implementar Mercado Pago exclusivamente en backend.
- Reutilizar el patrón de suscripción de los otros dos sistemas solo después de comparar modelos y endpoints reales.
- Introducir multi-tenancy antes de cargar datos productivos para evitar migraciones complejas posteriores.

## 10. Checklist antes de escribir código de billing

- [ ] Confirmar puertos ocupados en el servidor.
- [ ] Confirmar dominios/subdominios disponibles.
- [ ] Confirmar tipo de integración Mercado Pago usada por los otros sistemas.
- [ ] Confirmar si hay una cuenta Mercado Pago única o cuentas por cliente.
- [ ] Definir planes comerciales y límites.
- [ ] Definir política ante pago vencido: bloqueo inmediato o días de gracia.
- [ ] Definir usuario owner/admin de cada tenant.
- [ ] Definir estrategia de backups y retención.
