Proyecto prototipo visual “Gestión de seguros”

- Objetivo: prototipo navegable para mostrar a cliente (mock visual, sin lógica real salvo manejo de sesión).
- Stack:
  - React 18 + TypeScript
  - Vite 5.4.10 (no rolldown)
  - Tailwind CSS 4.1.14 + PostCSS (@tailwindcss/postcss, autoprefixer)
  - react-router-dom 6.28.0
  - AuthProvider propio con localStorage + expiración (mock).

- Archivos clave:
  - package.json → dependencias ajustadas
  - postcss.config.js → Tailwind v4
  - index.html → título = “Gestión de seguros”, favicon = linsse.svg
  - src/main.tsx → BrowserRouter + AuthProvider
  - src/App.tsx → rutas /login, /dashboard, secciones (clientes, agenda, notificaciones, otro, otro2, configuración), fallback a Placeholder
  - src/auth/AuthProvider.tsx → sesión mock con TTL
  - src/routes/ProtectedRoute.tsx → protege rutas
- src/pages/Login.tsx → login con formulario propio (mock de credenciales internas)
  - src/pages/Dashboard.tsx → grid 6 tiles, logout, muestra usuario
  - src/pages/Placeholder.tsx → mensaje “Disponible en futuras implementaciones” + botón Login (siempre) y Dashboard (solo si hay sesión).

- Plan de evolución por etapas en `PLAN.md`.
- Blueprint de implementación completo en `IMPLEMENTATION.md`.
- Manual de uso funcional en `docs/USER_MANUAL.md`.

- Estrategia SaaS, Mercado Pago, HTTPS y convivencia de puertos en `docs/saas-deployment-strategy.md`.
- Deploy productivo para `seguros.linsse.com` en `docs/DEPLOY_SEGUROS_LINSSE.md` con ejemplos en `deploy/nginx/` y `deploy/systemd/`.

## Servidor API (MongoDB)

- Variables de entorno principales (crear un `.env`):
  - `MONGODB_URI` → cadena de conexión a MongoDB (por defecto `mongodb://localhost:27017/seguros`).
  - `MONGODB_DB` → nombre de la base de datos (por defecto `seguros`).
  - `JWT_SECRET` → secreto para firmar los tokens.
  - `PORT` → puerto del API (por defecto 4020, reservado para no chocar con Ganadería/Stock).
  - `ACCESS_TTL_SECONDS` → segundos de vigencia del access token (por defecto 7200 = 2h).
  - `REFRESH_TTL_SECONDS` → segundos de vigencia del refresh token (por defecto 86400 = 24h).
  - `VITE_API_URL` → URL base para que el frontend hable con el API (por defecto `/api` detrás de proxy o `http://localhost:4020/api` en desarrollo directo).
  - `VITE_GANADERIA_URL` → URL pública del módulo de ganadería (ejemplo `https://apps.midominio.com/EstablecimientoGanadero`). Si no se define, se usa `/EstablecimientoGanadero` sobre el mismo origen (sin forzar `localhost` ni puerto).

- Puedes usar el archivo `.env.example` incluido en el repo y copiarlo como `.env` para comenzar rápido:

```env
# Backend API
MONGODB_URI=mongodb://localhost:27017/seguros
MONGODB_DB=seguros
JWT_SECRET=dev-secret-change-me
PORT=4020
ACCESS_TTL_SECONDS=7200
REFRESH_TTL_SECONDS=86400

# Frontend
VITE_API_URL=http://localhost:4020/api
VITE_GANADERIA_URL=https://apps.midominio.com/EstablecimientoGanadero
```
- Provisionar la base de datos limpia (crea solo un usuario admin configurable por env):
  - `npm run seed:mongo`
- Ejecutar `npm run server` para levantar el backend Node (puerto 4020). Endpoints disponibles: `/auth/login`, `/auth/refresh`, `/auth/logout`, `/clients`, `/clients/:id/summary`, `/pipeline`, `/tasks`, `/renewals`.
- SaaS/Mercado Pago: el backend expone `GET /api/public/plans`, `POST /api/public/register`, `POST /api/webhooks/mercadopago` y `GET /api/billing/license` para replicar el patrón relevado en Stock/Ganadería: planes, tenant, suscripción, webhook firmado e información de licencia.

### Reducir los clientes del tenant demo

El comando `npm run clients:trim-demo` conserva los cinco clientes más recientes del
tenant asociado a `DEMO_USER_EMAIL`, respalda en EJSON los clientes restantes y sus
datos relacionados, y prepara el vaciado de los datos operativos de los demás tenants.
Por seguridad, sin argumentos solo genera el respaldo y muestra una vista previa:

```bash
DEMO_USER_EMAIL=demo@seguros.com npm run clients:trim-demo
```

Después de revisar el archivo creado en `CLIENT_BACKUP_DIR`, se aplican los cambios de
forma explícita. El respaldo también incluye todo lo que se quitará de los otros tenants:

```bash
DEMO_USER_EMAIL=demo@seguros.com npm run clients:trim-demo -- --apply
```

El proceso no elimina usuarios, tenants, planes ni suscripciones. Conserva las pólizas
compartidas por alguno de los cinco clientes retenidos y elimina las pólizas que quedan
huérfanas al retirar los clientes excedentes. Si el usuario demo es un usuario interno
antiguo sin `tenant_id` (por ejemplo, el administrador inicial), el comando toma como
datos demo los clientes que tampoco tengan `tenant_id`; los tenants SaaS se consideran
entonces tenants diferentes y sus datos operativos se vacían al usar `--apply`. El
resumen final muestra registros por colección antes y después; la ejecución falla si la
verificación posterior detecta que quedó algún dato de otro tenant. También se detectan
identificadores de tenant huérfanos presentes en datos operativos aunque ya no exista su
documento en la colección `tenants`.

### Usuario demo con panel general

Para crear o actualizar `demo@linsse.com` con acceso al panel general y todas las
funcionalidades de la demo, ejecutá:

```bash
CLIENT_DEMO_PASSWORD='una-clave-segura' npm run client-demo:provision
```

El usuario queda con rol `ejecutivo` y sin asociación a un cliente individual. El botón
`Entrar en modo demo` inicia la sesión directamente con este usuario; puede deshabilitarse
configurando `DEMO_LOGIN_ENABLED=false`. El proceso es idempotente: si el correo ya
existe, corrige su nombre y rol, elimina asociaciones anteriores y actualiza la contraseña.
- El frontend consume `/auth/login`; el resto de rutas sirven como base para reemplazar los mocks actuales.
- Configurar `VITE_API_URL` si se usa un host diferente. Incluye el prefijo `/api` para que las rutas coincidan con el backend de Express.
- Configurar `VITE_GANADERIA_URL` con una URL accesible externamente para evitar depender de `127.0.0.1`.
- Si ves `ERR_CONNECTION_REFUSED` hacia `http://localhost:4020/api/auth/login`, confirma que el backend esté corriendo (`npm run server`) y que `VITE_API_URL` apunte a la URL correcta o usa `/api` para proxear al backend desde Vite.
- Si Nginx responde `502`, el frontend está publicado pero el API no está escuchando en
  `127.0.0.1:4020`. Después de actualizar el código, reiniciá `seguros-api` y comprobá
  `curl -fsS http://127.0.0.1:4020/api/health` antes de probar nuevamente el login.

- Estado actual:
  - Login → Dashboard con tiles → cada tile abre Placeholder
  - Logout funciona
  - Navegación protegida
  - Branding aplicado (favicon y título correctos).
