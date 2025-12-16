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

const TASK_STATUSES = new Set(["pendiente", "en_curso", "completada"]);

function normalizeTaskStatus(status, fallback = "pendiente") {
  if (typeof status !== "string") return fallback;
  const normalized = status.toLowerCase();
  return TASK_STATUSES.has(normalized) ? normalized : fallback;
}

async function getEmployeeById(id) {
  if (!id) return null;
  const db = getDb();
  return db.collection("employees").findOne({ _id: String(id) });
}

async function getTaskWithRelations(taskId) {
  const db = getDb();
  const [row] = await db
    .collection("tasks")
    .aggregate([
      { $match: { _id: String(taskId) } },
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
        $lookup: {
          from: "employees",
          localField: "owner_id",
          foreignField: "_id",
          as: "owner",
        },
      },
      { $unwind: { path: "$owner", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          client_id: 1,
          title: 1,
          due_date: 1,
          status: 1,
          priority: 1,
          owner_id: 1,
          client_name: "$client.name",
          owner_name: "$owner.name",
          created_at: 1,
          updated_at: 1,
        },
      },
    ])
    .toArray();

  return row ? mapDocument(row) : null;
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

app.post("/clients", authenticate, async (req, res) => {
  const { name, document, city, contacts, policies } = req.body || {};
  if (!name || !document) return res.status(400).json({ error: "Nombre y documento son obligatorios" });

  const clientDoc = {
    _id: randomUUID(),
    name,
    document,
    city: city ?? null,
    contacts: Array.isArray(contacts)
      ? contacts.map((contact) => ({
          id: contact.id ?? randomUUID(),
          name: contact.name ?? "",
          email: contact.email ?? null,
          phone: contact.phone ?? null,
        }))
      : [],
    policies: Array.isArray(policies)
      ? policies.map((policy) => ({
          id: policy.id ?? randomUUID(),
          type: policy.type ?? null,
          insurer_id: policy.insurer_id ?? null,
          status: policy.status ?? null,
          premium: typeof policy.premium === "number" ? policy.premium : null,
          next_renewal: policy.next_renewal ? new Date(policy.next_renewal) : null,
        }))
      : [],
    created_at: new Date(),
  };

  try {
    const db = getDb();
    await db.collection("clients").insertOne(clientDoc);
    res.status(201).json(mapDocument(clientDoc));
  } catch (err) {
    console.error("[clients create]", err);
    res.status(500).json({ error: "No se pudo crear el cliente" });
  }
});

app.get("/clients/:id/summary", authenticate, async (req, res) => {
  const clientId = req.params.id;
  try {
    const db = getDb();
    const clientDoc = await db.collection("clients").findOne({ _id: clientId });
    if (!clientDoc) return res.status(404).json({ error: "Cliente no encontrado" });

    const insurerIds = (clientDoc.policies ?? [])
      .map((p) => p.insurer_id)
      .filter((id) => typeof id === "string");
    const insurersLookup = insurerIds.length
      ? await db
          .collection("insurers")
          .find({ _id: { $in: insurerIds } })
          .toArray()
      : [];

    const insurersById = insurersLookup.reduce((acc, row) => {
      acc[row._id] = row;
      return acc;
    }, {});

    const tasks = await db
      .collection("tasks")
      .aggregate([
        { $match: { client_id: clientId } },
        {
          $lookup: {
            from: "employees",
            localField: "owner_id",
            foreignField: "_id",
            as: "owner",
          },
        },
        { $unwind: { path: "$owner", preserveNullAndEmptyArrays: true } },
        { $sort: { due_date: 1 } },
        {
          $project: {
            _id: 1,
            client_id: 1,
            title: 1,
            due_date: 1,
            status: 1,
            priority: 1,
            owner_id: 1,
            owner_name: "$owner.name",
          },
        },
      ])
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

    const policies = (clientDoc.policies ?? []).map((policy) => ({
      ...policy,
      insurer: policy.insurer_id ? insurersById[policy.insurer_id]?.name ?? null : null,
    }));

    res.json({
      ...mapDocument(clientDoc),
      policies,
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

app.get("/employees", authenticate, async (_req, res) => {
  try {
    const db = getDb();
    const rows = await db
      .collection("employees")
      .find({}, { projection: { _id: 1, name: 1, email: 1, role: 1, team: 1 } })
      .sort({ name: 1 })
      .toArray();
    res.json({ items: rows.map(mapDocument) });
  } catch (err) {
    console.error("[employees]", err);
    res.status(500).json({ error: "No se pudieron recuperar los responsables" });
  }
});

app.post("/employees", authenticate, async (req, res) => {
  const { name, email, role, team } = req.body || {};
  if (!name) return res.status(400).json({ error: "Nombre requerido" });

  const doc = {
    _id: randomUUID(),
    name,
    email: email ?? null,
    role: role ?? null,
    team: team ?? null,
    created_at: new Date(),
  };

  try {
    const db = getDb();
    await db.collection("employees").insertOne(doc);
    res.status(201).json(mapDocument(doc));
  } catch (err) {
    console.error("[employees create]", err);
    res.status(500).json({ error: "No se pudo crear el responsable" });
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
          $lookup: {
            from: "employees",
            localField: "owner_id",
            foreignField: "_id",
            as: "owner",
          },
        },
        { $unwind: { path: "$owner", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            client_id: 1,
            title: 1,
            due_date: 1,
            status: 1,
            priority: 1,
            owner_id: 1,
            client_name: "$client.name",
            owner_name: "$owner.name",
            created_at: 1,
            updated_at: 1,
          },
        },
        { $sort: { due_date: 1, created_at: -1 } },
      ])
      .toArray();

    res.json({ items: rows.map(mapDocument) });
  } catch (err) {
    console.error("[tasks]", err);
    res.status(500).json({ error: "No se pudieron recuperar las tareas" });
  }
});

app.post("/tasks", authenticate, async (req, res) => {
  const { title, client_id, due_date, status, priority, owner_id } = req.body || {};
  if (!title) return res.status(400).json({ error: "Título requerido" });

  const db = getDb();

  try {
    let clientExists = null;
    if (client_id) {
      clientExists = await db.collection("clients").findOne({ _id: client_id });
      if (!clientExists) return res.status(400).json({ error: "Cliente no encontrado" });
    }

    let employee = null;
    if (owner_id) {
      employee = await getEmployeeById(owner_id);
      if (!employee) return res.status(400).json({ error: "Responsable no encontrado" });
    }

    const doc = {
      _id: randomUUID(),
      client_id: clientExists?._id ?? null,
      title,
      due_date: due_date ? new Date(due_date) : null,
      status: normalizeTaskStatus(status),
      priority: typeof priority === "string" ? priority : null,
      owner_id: employee?._id ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await db.collection("tasks").insertOne(doc);
    const result = await getTaskWithRelations(doc._id);
    res.status(201).json(result ?? mapDocument(doc));
  } catch (err) {
    console.error("[tasks create]", err);
    res.status(500).json({ error: "No se pudo crear la tarea" });
  }
});

app.patch("/tasks/:id", authenticate, async (req, res) => {
  const taskId = req.params.id;
  const { title, client_id, due_date, status, priority, owner_id } = req.body || {};

  const db = getDb();

  try {
    const updates = {};
    if (title !== undefined) {
      if (!title) return res.status(400).json({ error: "Título requerido" });
      updates.title = title;
    }
    if (client_id !== undefined) {
      if (client_id === null) {
        updates.client_id = null;
      } else {
        const clientExists = await db.collection("clients").findOne({ _id: client_id });
        if (!clientExists) return res.status(400).json({ error: "Cliente no encontrado" });
        updates.client_id = clientExists._id;
      }
    }
    if (due_date !== undefined) {
      updates.due_date = due_date ? new Date(due_date) : null;
    }
    if (status !== undefined) {
      updates.status = normalizeTaskStatus(status);
    }
    if (priority !== undefined) {
      updates.priority = typeof priority === "string" ? priority : null;
    }
    if (owner_id !== undefined) {
      if (owner_id === null) {
        updates.owner_id = null;
      } else {
        const employee = await getEmployeeById(owner_id);
        if (!employee) return res.status(400).json({ error: "Responsable no encontrado" });
        updates.owner_id = employee._id;
      }
    }

    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Sin cambios" });

    const result = await db
      .collection("tasks")
      .findOneAndUpdate({ _id: taskId }, { $set: { ...updates, updated_at: new Date() } }, { returnDocument: "after" });

    if (!result) return res.status(404).json({ error: "Tarea no encontrada" });
    const taskWithRelations = await getTaskWithRelations(taskId);
    res.json(taskWithRelations ?? mapDocument(result));
  } catch (err) {
    console.error("[tasks update]", err);
    res.status(500).json({ error: "No se pudo actualizar la tarea" });
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

app.get("/insurers", authenticate, async (_req, res) => {
  try {
    const db = getDb();
    const rows = await db.collection("insurers").find({}).sort({ name: 1 }).toArray();
    res.json({ items: rows.map(mapDocument) });
  } catch (err) {
    console.error("[insurers]", err);
    res.status(500).json({ error: "No se pudieron recuperar las aseguradoras" });
  }
});

app.post("/insurers", authenticate, async (req, res) => {
  const { name, country, lines, status, rating, annual_premium, active_policies, loss_ratio, contact, key_deals, last_review, notes } =
    req.body || {};
  if (!name) return res.status(400).json({ error: "Nombre requerido" });

  const insurerDoc = {
    _id: randomUUID(),
    name,
    country: country ?? null,
    lines: Array.isArray(lines) ? lines : [],
    status: status ?? "Activa",
    rating: typeof rating === "number" ? rating : null,
    annual_premium: typeof annual_premium === "number" ? annual_premium : null,
    active_policies: typeof active_policies === "number" ? active_policies : null,
    loss_ratio: typeof loss_ratio === "number" ? loss_ratio : null,
    contact: contact
      ? {
          name: contact.name ?? null,
          email: contact.email ?? null,
          phone: contact.phone ?? null,
        }
      : null,
    key_deals: Array.isArray(key_deals) ? key_deals : [],
    last_review: last_review ? new Date(last_review) : null,
    notes: notes ?? null,
    created_at: new Date(),
  };

  try {
    const db = getDb();
    await db.collection("insurers").insertOne(insurerDoc);
    res.status(201).json(mapDocument(insurerDoc));
  } catch (err) {
    console.error("[insurers create]", err);
    res.status(500).json({ error: "No se pudo crear la aseguradora" });
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
