# Guía de referencia: Modo IA (chat por voz y texto) + API key + ejecución con impacto en BD

## 1. Objetivo funcional

El sistema implementa un **Modo IA híbrido** con dos capacidades:

1. **Conversación contextual** (preguntas/respuestas sobre datos reales del establecimiento).
2. **Ejecución operativa con doble confirmación** (parsea intención, muestra previsualización y sólo impacta BD cuando el usuario confirma con una palabra clave).

El patrón se diseñó para minimizar ejecuciones accidentales y dejar trazabilidad completa.

---

## 2. Arquitectura de alto nivel

### Frontend (React + Vite)
- Pantalla principal: `src/pages/AICommands.tsx`.
- Configuración admin de IA: `src/pages/AISettings.tsx`.
- Historial + deshacer: `src/pages/AIChanges.tsx`.

### Backend (Express)
- API principal con rutas de IA, parseo y confirmación: `server/server.js`.
- Conexión DB Mongo y carga de `.env`: `server/db.js`.

### Base de datos (MongoDB)
Colecciones relevantes:
- `settings` (API key + modelo OpenAI persistidos).
- `confirmations` (confirmaciones aplicadas y metadata de deshacer).
- `command_logs` (auditoría operacional del flujo IA).
- Colecciones de dominio que realmente se modifican (`tasks`, `claims`).

---

## 3. Flujo de chat por texto

1. Usuario escribe en textarea del chat.
2. Frontend decide si el mensaje es confirmación o una nueva instrucción.
3. Si hay comando pendiente, sólo acepta palabra de confirmación.
4. Si no hay pendiente, intenta parseo estructurado (`POST /commands/parse`).
5. Si hay intención válida y completa: no ejecuta aún; deja pendiente con instrucción explícita para confirmar.
6. Si no hay intención estructurada: va a `POST /ai/chat` (modo conversacional IA).

---

## 4. Doble confirmación antes de impactar BD

### Etapa 1: detección/previsualización
- Se identifica intención (`TASK_CREATE`, `TASK_COMPLETE`, `CLAIM_ARCHIVE`).
- Se arma `confirmationToken` y `requestPreview` con payload parseado.
- Frontend muestra resumen de lo que se ejecutaría.

### Etapa 2: confirmación explícita del usuario
- Sólo al recibir keyword de confirmación se invoca `POST /commands/confirm`.
- Recién ahí se aplican cambios de BD.

---

## 5. Gestión de API key y modelo OpenAI

### 5.1 Alta/actualización
Ruta: `POST /admin/openai-settings`

Payload:
- `username`
- `password`
- `apiKey`
- `model` (opcional)

### 5.2 Estado actual
Ruta: `GET /admin/openai-settings`
- Devuelve si está configurada la key, modelo vigente y fecha de actualización.

### 5.3 Prueba de conectividad
Ruta: `POST /admin/openai-settings/test`
- Revalida credenciales admin.
- Hace request mínimo a OpenAI (`chat/completions`) para verificar key/model.

### 5.4 Fallback de configuración
Al consultar IA, el backend usa este orden:
1. API key persistida en `settings`.
2. Si no existe, `process.env.OPENAI_API_KEY`.

Modelo:
1. Modelo persistido.
2. Si no existe, `OPENAI_MODEL`.
3. Si no existe, default `gpt-4o-mini`.

---

## 6. IA conversacional con contexto real de negocio

Ruta: `POST /ai/chat`

- El backend arma snapshot con datos agregados del negocio.
- Si no hay API key o falla OpenAI, devuelve fallback local y no rompe chat.

---

## 7. Impacto real en base de datos (confirmación)

Ruta: `POST /commands/confirm`

- **TASK_CREATE**: inserta tarea operativa con `source: COMMAND`.
- **TASK_COMPLETE**: marca tarea como completada.
- **CLAIM_ARCHIVE**: archiva siniestro.

Siempre registra:
- `confirmations` con `confirmationToken`, `parsedIntent`.
- `command_logs` con éxito/error y payload de auditoría.

---

## 8. Deshacer operaciones (undo)

Rutas:
- `GET /commands/confirmed-changes`
- `POST /commands/undo`

Capacidades:
- Lista cambios con impacto en BD.
- Permite deshacer según tipo de evento.
- Marca confirmación como deshecha (`undoneAt`, `undoReason`) y registra log.

---

## 9. Auditoría y observabilidad

Trazabilidad en dos capas:

1. **Confirmaciones de negocio** (`confirmations`).
2. **Logs técnicos/funcionales** (`command_logs`).

---

## 10. Contrato mínimo para replicar el módulo

1. `POST /ai/chat`
2. `POST /commands/parse`
3. `POST /commands/confirm`
4. `GET /commands/confirmed-changes` + `POST /commands/undo`
5. `POST/GET /admin/openai-settings` + `POST /admin/openai-settings/test`
6. `GET /command-logs`

---

## 11. Mejoras sugeridas

1. Cifrado en reposo del API key con KMS.
2. RBAC fino para configuración IA y confirmaciones.
3. Idempotency key obligatoria en confirmación.
4. Motor de políticas por tipo de operación.
5. Alertas automáticas sobre errores upstream de IA.
6. Métricas de precisión parser vs ejecución final.
