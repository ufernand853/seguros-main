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

## Servidor API (MongoDB)

- Variables de entorno principales (crear un `.env`):
  - `MONGODB_URI` → cadena de conexión a MongoDB (por defecto `mongodb://localhost:27017/seguros`).
  - `MONGODB_DB` → nombre de la base de datos (por defecto `seguros`).
  - `JWT_SECRET` → secreto para firmar los tokens.
  - `PORT` → puerto del API (por defecto 4000).
  - `ACCESS_TTL_SECONDS` → segundos de vigencia del access token (por defecto 7200 = 2h).
  - `REFRESH_TTL_SECONDS` → segundos de vigencia del refresh token (por defecto 86400 = 24h).
  - `VITE_API_URL` → URL base para que el frontend hable con el API (por defecto `http://localhost:4000/api` o `/api`).

- Puedes usar el archivo `.env.example` incluido en el repo y copiarlo como `.env` para comenzar rápido:

```env
# Backend API
MONGODB_URI=mongodb://localhost:27017/seguros
MONGODB_DB=seguros
JWT_SECRET=dev-secret-change-me
PORT=4000
ACCESS_TTL_SECONDS=7200
REFRESH_TTL_SECONDS=86400

# Frontend
VITE_API_URL=http://localhost:4000/api
```
- Provisionar la base de datos limpia (crea solo un usuario admin configurable por env):
  - `npm run seed:mongo`
- Ejecutar `npm run server` para levantar el backend Node (puerto 4000). Endpoints disponibles: `/auth/login`, `/auth/refresh`, `/auth/logout`, `/clients`, `/clients/:id/summary`, `/pipeline`, `/tasks`, `/renewals`.
- El frontend consume `/auth/login`; el resto de rutas sirven como base para reemplazar los mocks actuales.
- Configurar `VITE_API_URL` si se usa un host diferente. Incluye el prefijo `/api` para que las rutas coincidan con el backend de Express.
- Si ves `ERR_CONNECTION_REFUSED` hacia `http://localhost:4000/api/auth/login`, confirma que el backend esté corriendo (`npm run server`) y que `VITE_API_URL` apunte a la URL correcta o usa `/api` para proxear al backend desde Vite.

- Estado actual:
  - Login → Dashboard con tiles → cada tile abre Placeholder
  - Logout funciona
  - Navegación protegida
  - Branding aplicado (favicon y título correctos).
