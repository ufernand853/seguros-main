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
  - src/pages/Login.tsx → login con botón Google (mock)
  - src/pages/Dashboard.tsx → grid 6 tiles, logout, muestra usuario
  - src/pages/Placeholder.tsx → mensaje “Disponible en futuras implementaciones” + botón Login (siempre) y Dashboard (solo si hay sesión).

- Estado actual:
  - Login → Dashboard con tiles → cada tile abre Placeholder
  - Logout funciona
  - Navegación protegida
  - Branding aplicado (favicon y título correctos).
