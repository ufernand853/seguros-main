import "dotenv/config";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import { randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { closeConnection, connectToDatabase, getDb } from "./db.js";

const PORT = process.env.PORT || 4000;
const ACCESS_TTL_SECONDS = Number(process.env.ACCESS_TTL_SECONDS || 60 * 60 * 2); // 2h
const REFRESH_TTL_SECONDS = Number(process.env.REFRESH_TTL_SECONDS || 60 * 60 * 24); // 24h
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

const app = express();
app.use(cors());
app.use(express.json());

function verifyPassword(password, stored) {
  if (!stored || !password) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const storedBuffer = Buffer.from(hash, "hex");
  return candidate.length === storedBuffer.length && timingSafeEqual(candidate, storedBuffer);
}

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, {
    expiresIn: ACCESS_TTL_SECONDS,
  });
}

function mapDocument(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: String(_id), ...rest };
}

async function createRefreshToken(userId) {
  const db = getDb();
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_SECONDS * 1000);
  await db.collection("refresh_tokens").insertOne({ token, user_id: String(userId), expires_at: expiresAt });
  return { token, expiresAt };
}

async function validateRefreshToken(refreshToken) {
  const db = getDb();
  const entry = await db.collection("refresh_tokens").findOne({ token: refreshToken });
  if (!entry) return null;
  if (new Date(entry.expires_at).getTime() < Date.now()) {
    await db.collection("refresh_tokens").deleteOne({ token: refreshToken });
    return null;
  }
  return entry.user_id;
}

async function getUserByEmail(email) {
  const db = getDb();
  return db.collection("users").findOne(
    { email: email.toLowerCase() },
    { projection: { _id: 1, name: 1, email: 1, password_hash: 1, role: 1 } }
  );
}

async function getUserById(id) {
  const db = getDb();
  return db.collection("users").findOne({ _id: String(id) }, { projection: { _id: 1, name: 1, email: 1, role: 1 } });
}

async function authenticate(req, res, next) {
  const header = req.headers["authorization"];
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "No autorizado" });
  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido" });
  }
}

app.get("/health", async (_req, res) => {
  try {
    const db = getDb();
    await db.command({ ping: 1 });
    res.json({ status: "ok" });
  } catch (err) {
    console.error("[health]", err);
    res.status(500).json({ error: "Error de base de datos" });
  }
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email y contraseña requeridos" });
  try {
    const user = await getUserByEmail(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }
    const safeUser = mapDocument(user);
    const accessToken = signAccessToken(safeUser);
    const { token: refreshToken } = await createRefreshToken(safeUser.id);
    res.json({
      user: safeUser,
      accessToken,
      refreshToken,
      expiresInSeconds: ACCESS_TTL_SECONDS,
    });
  } catch (err) {
    console.error("[auth/login]", err);
    res.status(500).json({ error: "No se pudo iniciar sesión" });
  }
});

app.post("/auth/refresh", async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ error: "Refresh token requerido" });
  try {
    const userId = await validateRefreshToken(refreshToken);
    if (!userId) return res.status(401).json({ error: "Refresh token inválido" });
    const user = await getUserById(userId);
    if (!user) return res.status(401).json({ error: "Usuario no encontrado" });
    const safeUser = mapDocument(user);
    const accessToken = signAccessToken(safeUser);
    res.json({ accessToken, expiresInSeconds: ACCESS_TTL_SECONDS });
  } catch (err) {
    console.error("[auth/refresh]", err);
    res.status(500).json({ error: "No se pudo refrescar la sesión" });
  }
});

app.post("/auth/logout", async (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) {
    try {
      const db = getDb();
      await db.collection("refresh_tokens").deleteOne({ token: refreshToken });
    } catch (err) {
      console.error("[auth/logout]", err);
    }
  }
  res.json({ ok: true });
});

app.get("/clients", authenticate, async (_req, res) => {
  try {
    const db = getDb();
    const items = await db
      .collection("clients")
      .find({}, { projection: { password_hash: 0 } })
      .sort({ created_at: -1 })
      .toArray();
    res.json({ items: items.map(mapDocument) });
  } catch (err) {
    console.error("[clients]", err);
    res.status(500).json({ error: "No se pudieron recuperar los clientes" });
  }
});

app.get("/clients/:id/summary", authenticate, async (req, res) => {
  const clientId = req.params.id;
  try {
    const db = getDb();
    const clientDoc = await db.collection("clients").findOne({ _id: clientId });
    if (!clientDoc) return res.status(404).json({ error: "Cliente no encontrado" });

    const tasks = await db
      .collection("tasks")
      .find({ client_id: clientId })
      .sort({ due_date: 1 })
      .toArray();
    const opportunities = await db
      .collection("pipeline")
      .find({ client_id: clientId })
      .sort({ updated_at: -1 })
      .limit(1)
      .toArray();
    const renewalRows = await db
      .collection("renewals")
      .find({ client_id: clientId })
      .sort({ renewal_date: -1 })
      .limit(1)
      .toArray();

    const tasksMapped = tasks.map(mapDocument);
    const nextTask = tasksMapped.find((t) => t.status !== "completada") || null;

    res.json({
      ...mapDocument(clientDoc),
      tasks: tasksMapped,
      opportunity: mapDocument(opportunities[0]) || null,
      renewal: mapDocument(renewalRows[0]) || null,
      nextTask,
    });
  } catch (err) {
    console.error("[clients summary]", err);
    res.status(500).json({ error: "No se pudo recuperar el cliente" });
  }
});

app.get("/pipeline", authenticate, async (_req, res) => {
  try {
    const db = getDb();
    const rows = await db
      .collection("pipeline")
      .aggregate([
        {
          $lookup: {
            from: "clients",
            localField: "client_id",
            foreignField: "_id",
            as: "client",
          },
        },
        { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            client_id: 1,
            stage: 1,
            opportunity: 1,
            probability: 1,
            amount: 1,
            owner: 1,
            updated_at: 1,
            client_name: "$client.name",
          },
        },
        { $sort: { updated_at: -1 } },
      ])
      .toArray();

    res.json({ items: rows.map(mapDocument) });
  } catch (err) {
    console.error("[pipeline]", err);
    res.status(500).json({ error: "No se pudo recuperar el pipeline" });
  }
});

app.get("/tasks", authenticate, async (_req, res) => {
  try {
    const db = getDb();
    const rows = await db
      .collection("tasks")
      .aggregate([
        {
          $lookup: {
            from: "clients",
            localField: "client_id",
            foreignField: "_id",
            as: "client",
          },
        },
        { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            client_id: 1,
            title: 1,
            due_date: 1,
            status: 1,
            priority: 1,
            owner: 1,
            client_name: "$client.name",
          },
        },
        { $sort: { due_date: 1 } },
      ])
      .toArray();

    res.json({ items: rows.map(mapDocument) });
  } catch (err) {
    console.error("[tasks]", err);
    res.status(500).json({ error: "No se pudieron recuperar las tareas" });
  }
});

app.get("/renewals", authenticate, async (_req, res) => {
  try {
    const db = getDb();
    const rows = await db
      .collection("renewals")
      .aggregate([
        {
          $lookup: {
            from: "clients",
            localField: "client_id",
            foreignField: "_id",
            as: "client",
          },
        },
        { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            client_id: 1,
            policy_number: 1,
            renewal_date: 1,
            premium: 1,
            status: 1,
            owner: 1,
            client_name: "$client.name",
          },
        },
        { $sort: { renewal_date: 1 } },
      ])
      .toArray();

    res.json({ items: rows.map(mapDocument) });
  } catch (err) {
    console.error("[renewals]", err);
    res.status(500).json({ error: "No se pudieron recuperar las renovaciones" });
  }
});

app.use((err, _req, res, _next) => {
  console.error("[unhandled]", err);
  res.status(500).json({ error: "Error interno del servidor" });
});

connectToDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[api] listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("[startup] No se pudo conectar a MongoDB", err);
    process.exit(1);
  });

async function shutdown() {
  await closeConnection();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
