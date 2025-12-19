import "dotenv/config";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
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

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Requiere rol de administrador" });
  }
  return next();
}

const ALLOWED_ROLES = new Set(["admin", "operador", "consulta"]);

function hashPassword(password) {
  if (!password) throw new Error("Contraseña requerida");
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
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

const api = express.Router();

// Compatibilidad: redirige /health a /api/health (si algún monitoreo antiguo lo usa)
app.get("/health", (_req, res) => res.redirect(307, "/api/health"));

// Todas las rutas del backend quedan bajo el prefijo /api
api.get("/health", async (_req, res) => {
  try {
    const db = getDb();
    await db.command({ ping: 1 });
    res.json({ status: "ok" });
  } catch (err) {
    console.error("[health]", err);
    res.status(500).json({ error: "Error de base de datos" });
  }
});

api.post("/auth/login", async (req, res) => {
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

api.post("/auth/refresh", async (req, res) => {
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

api.post("/auth/logout", async (req, res) => {
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

api.get("/clients", authenticate, async (_req, res) => {
  try {
    const db = getDb();
    const items = await db
      .collection("clients")
      .find({}, { projection: { password_hash: 0 } })
      .sort({ created_at: -1 })
      .toArray();

    const insurerIds = Array.from(
      new Set(
        items
          .flatMap((client) => (client.policies ?? []).map((policy) => policy.insurer_id))
          .filter((id) => typeof id === "string"),
      ),
    );

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

    const clients = items.map((client) => ({
      ...mapDocument(client),
      policies: (client.policies ?? []).map((policy) => ({
        ...policy,
        insurer: policy.insurer_id ? insurersById[policy.insurer_id]?.name ?? null : null,
      })),
    }));

    res.json({ items: clients });
  } catch (err) {
    console.error("[clients]", err);
    res.status(500).json({ error: "No se pudieron recuperar los clientes" });
  }
});

async function aggregateClaims(filter = {}) {
  const db = getDb();
  const pipeline = [
    { $match: filter },
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
      $set: {
        policy: {
          $first: {
            $filter: {
              input: "$client.policies",
              as: "policy",
              cond: { $eq: ["$$policy.id", "$policy_id"] },
            },
          },
        },
      },
    },
    {
      $lookup: {
        from: "insurers",
        localField: "policy.insurer_id",
        foreignField: "_id",
        as: "insurer",
      },
    },
    { $unwind: { path: "$insurer", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        client_id: 1,
        policy_id: 1,
        policy_type: "$policy.type",
        insurer_name: "$insurer.name",
        type: 1,
        event_date: 1,
        event_time: 1,
        location: 1,
        description: 1,
        priority: 1,
        channel: 1,
        status: 1,
        third_party_damage: 1,
        tow_needed: 1,
        internal_owner: 1,
        notify_client: 1,
        notify_broker: 1,
        notes: 1,
        contact_email: 1,
        contact_phone: 1,
        created_at: 1,
        updated_at: 1,
        client_name: "$client.name",
        client_document: "$client.document",
      },
    },
    { $sort: { created_at: -1 } },
  ];

  const rows = await db.collection("claims").aggregate(pipeline).toArray();
  return rows.map(mapDocument);
}

api.get("/claims", authenticate, async (_req, res) => {
  try {
    const items = await aggregateClaims();
    res.json({ items });
  } catch (err) {
    console.error("[claims]", err);
    res.status(500).json({ error: "No se pudieron recuperar los siniestros" });
  }
});

api.post("/claims", authenticate, async (req, res) => {
  const {
    client_id,
    policy_id,
    type,
    event_date,
    event_time,
    location,
    description,
    priority,
    channel,
    internal_owner,
    third_party_damage,
    tow_needed,
    notify_client,
    notify_broker,
    notes,
    contact_email,
    contact_phone,
  } = req.body || {};

  if (!client_id || !policy_id || !type || !event_date || !location || !description) {
    return res.status(400).json({ error: "Cliente, póliza, tipo, fecha, ubicación y descripción son obligatorios" });
  }

  const eventDateObj = new Date(event_date);
  if (Number.isNaN(eventDateObj.getTime())) {
    return res.status(400).json({ error: "La fecha del siniestro no es válida" });
  }

  try {
    const db = getDb();
    const client = await db.collection("clients").findOne({ _id: client_id });
    if (!client) return res.status(404).json({ error: "Cliente no encontrado" });

    const policy = (client.policies ?? []).find((p) => p.id === policy_id);
    if (!policy) return res.status(400).json({ error: "La póliza indicada no pertenece al cliente" });

    const claimDoc = {
      _id: randomUUID(),
      client_id,
      policy_id,
      policy_type: policy.type ?? null,
      insurer_id: policy.insurer_id ?? null,
      type,
      event_date: eventDateObj,
      event_time: event_time ?? null,
      location,
      description,
      priority: priority ?? null,
      channel: channel ?? null,
      status: "Denuncia ingresada",
      third_party_damage: !!third_party_damage,
      tow_needed: !!tow_needed,
      internal_owner: internal_owner ?? null,
      notify_client: !!notify_client,
      notify_broker: !!notify_broker,
      notes: notes ?? null,
      contact_email: contact_email ?? null,
      contact_phone: contact_phone ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await db.collection("claims").insertOne(claimDoc);
    const [item] = await aggregateClaims({ _id: claimDoc._id });
    res.status(201).json({ item: item ?? mapDocument(claimDoc) });
  } catch (err) {
    console.error("[claims create]", err);
    res.status(500).json({ error: "No se pudo registrar el siniestro" });
  }
});

api.patch("/claims/:id", authenticate, requireAdmin, async (req, res) => {
  const claimId = req.params.id;
  const {
    type,
    event_date,
    event_time,
    location,
    description,
    priority,
    channel,
    status,
    third_party_damage,
    tow_needed,
    internal_owner,
    notify_client,
    notify_broker,
    notes,
    contact_email,
    contact_phone,
  } = req.body || {};

  const updates = {};
  if (type !== undefined) {
    if (!type) return res.status(400).json({ error: "El tipo es obligatorio" });
    updates.type = type;
  }
  if (event_date !== undefined) {
    const parsed = event_date ? new Date(event_date) : null;
    if (parsed && Number.isNaN(parsed.getTime())) return res.status(400).json({ error: "Fecha de siniestro inválida" });
    updates.event_date = parsed;
  }
  if (event_time !== undefined) updates.event_time = event_time ?? null;
  if (location !== undefined) {
    if (!location) return res.status(400).json({ error: "La ubicación es obligatoria" });
    updates.location = location;
  }
  if (description !== undefined) {
    if (!description) return res.status(400).json({ error: "La descripción es obligatoria" });
    updates.description = description;
  }
  if (priority !== undefined) updates.priority = priority ?? null;
  if (channel !== undefined) updates.channel = channel ?? null;
  if (status !== undefined) updates.status = status ?? null;
  if (third_party_damage !== undefined) updates.third_party_damage = !!third_party_damage;
  if (tow_needed !== undefined) updates.tow_needed = !!tow_needed;
  if (internal_owner !== undefined) updates.internal_owner = internal_owner ?? null;
  if (notify_client !== undefined) updates.notify_client = !!notify_client;
  if (notify_broker !== undefined) updates.notify_broker = !!notify_broker;
  if (notes !== undefined) updates.notes = notes ?? null;
  if (contact_email !== undefined) updates.contact_email = contact_email ?? null;
  if (contact_phone !== undefined) updates.contact_phone = contact_phone ?? null;

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Sin cambios" });

  try {
    const db = getDb();
    const result = await db
      .collection("claims")
      .findOneAndUpdate({ _id: claimId }, { $set: { ...updates, updated_at: new Date() } }, { returnDocument: "after" });
    if (!result) return res.status(404).json({ error: "Siniestro no encontrado" });

    const [item] = await aggregateClaims({ _id: claimId });
    res.json({ item: item ?? mapDocument(result) });
  } catch (err) {
    console.error("[claims update]", err);
    res.status(500).json({ error: "No se pudo actualizar el siniestro" });
  }
});

api.delete("/claims/:id", authenticate, requireAdmin, async (req, res) => {
  const claimId = req.params.id;
  try {
    const db = getDb();
    const result = await db.collection("claims").findOneAndDelete({ _id: claimId });
    if (!result) return res.status(404).json({ error: "Siniestro no encontrado" });
    res.json({ ok: true, id: claimId });
  } catch (err) {
    console.error("[claims delete]", err);
    res.status(500).json({ error: "No se pudo eliminar el siniestro" });
  }
});

api.get("/users", authenticate, requireAdmin, async (_req, res) => {
  try {
    const db = getDb();
    const rows = await db
      .collection("users")
      .find({}, { projection: { password_hash: 0 } })
      .sort({ name: 1 })
      .toArray();
    res.json({ items: rows.map(mapDocument) });
  } catch (err) {
    console.error("[users list]", err);
    res.status(500).json({ error: "No se pudieron recuperar los usuarios" });
  }
});

api.post("/users", authenticate, requireAdmin, async (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password || !role) return res.status(400).json({ error: "Nombre, email, contraseña y rol son obligatorios" });
  if (!ALLOWED_ROLES.has(role)) return res.status(400).json({ error: "Rol inválido" });

  try {
    const db = getDb();
    const emailLower = email.toLowerCase();
    const exists = await db.collection("users").findOne({ email: emailLower });
    if (exists) return res.status(409).json({ error: "El email ya está registrado" });

    const userDoc = {
      _id: randomUUID(),
      name,
      email: emailLower,
      password_hash: hashPassword(password),
      role,
      created_at: new Date(),
    };

    await db.collection("users").insertOne(userDoc);
    const safeUser = mapDocument(userDoc);
    delete safeUser.password_hash;
    res.status(201).json(safeUser);
  } catch (err) {
    console.error("[users create]", err);
    res.status(500).json({ error: "No se pudo crear el usuario" });
  }
});

api.patch("/users/:id", authenticate, requireAdmin, async (req, res) => {
  const userId = req.params.id;
  const { name, password, role } = req.body || {};

  const updates = {};
  if (name !== undefined) {
    if (!name) return res.status(400).json({ error: "El nombre es obligatorio" });
    updates.name = name;
  }
  if (role !== undefined) {
    if (!ALLOWED_ROLES.has(role)) return res.status(400).json({ error: "Rol inválido" });
    updates.role = role;
  }
  if (password !== undefined) {
    if (!password) return res.status(400).json({ error: "La contraseña no puede estar vacía" });
    updates.password_hash = hashPassword(password);
  }

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Sin cambios" });

  try {
    const db = getDb();
    const result = await db
      .collection("users")
      .findOneAndUpdate({ _id: userId }, { $set: { ...updates, updated_at: new Date() } }, { returnDocument: "after" });
    if (!result) return res.status(404).json({ error: "Usuario no encontrado" });
    const safeUser = mapDocument(result);
    delete safeUser.password_hash;
    res.json(safeUser);
  } catch (err) {
    console.error("[users update]", err);
    res.status(500).json({ error: "No se pudo actualizar el usuario" });
  }
});

api.delete("/users/:id", authenticate, requireAdmin, async (req, res) => {
  const userId = req.params.id;
  try {
    const db = getDb();
    const result = await db.collection("users").findOneAndDelete({ _id: userId });
    if (!result) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json({ ok: true, id: userId });
  } catch (err) {
    console.error("[users delete]", err);
    res.status(500).json({ error: "No se pudo eliminar el usuario" });
  }
});

api.post("/clients", authenticate, async (req, res) => {
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

api.patch("/clients/:id", authenticate, requireAdmin, async (req, res) => {
  const clientId = req.params.id;
  const { name, document, city, contacts, policies } = req.body || {};

  const updates = {};
  if (name !== undefined) {
    if (!name) return res.status(400).json({ error: "El nombre no puede estar vacío" });
    updates.name = name;
  }
  if (document !== undefined) {
    if (!document) return res.status(400).json({ error: "El documento es obligatorio" });
    updates.document = document;
  }
  if (city !== undefined) {
    updates.city = city ?? null;
  }
  if (contacts !== undefined) {
    if (!Array.isArray(contacts)) return res.status(400).json({ error: "Contacts debe ser un arreglo" });
    updates.contacts = contacts.map((contact) => ({
      id: contact.id ?? randomUUID(),
      name: contact.name ?? "",
      email: contact.email ?? null,
      phone: contact.phone ?? null,
    }));
  }
  if (policies !== undefined) {
    if (!Array.isArray(policies)) return res.status(400).json({ error: "Policies debe ser un arreglo" });
    updates.policies = policies.map((policy) => ({
      id: policy.id ?? randomUUID(),
      type: policy.type ?? null,
      insurer_id: policy.insurer_id ?? null,
      status: policy.status ?? null,
      premium: typeof policy.premium === "number" ? policy.premium : null,
      next_renewal: policy.next_renewal ? new Date(policy.next_renewal) : null,
    }));
  }

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Sin cambios" });

  try {
    const db = getDb();
    const result = await db
      .collection("clients")
      .findOneAndUpdate({ _id: clientId }, { $set: { ...updates, updated_at: new Date() } }, { returnDocument: "after" });

    if (!result) return res.status(404).json({ error: "Cliente no encontrado" });
    res.json(mapDocument(result));
  } catch (err) {
    console.error("[clients update]", err);
    res.status(500).json({ error: "No se pudo actualizar el cliente" });
  }
});

api.delete("/clients/:id", authenticate, requireAdmin, async (req, res) => {
  const clientId = req.params.id;
  try {
    const db = getDb();
    const result = await db.collection("clients").findOneAndDelete({ _id: clientId });
    if (!result) return res.status(404).json({ error: "Cliente no encontrado" });
    res.json({ ok: true, id: clientId });
  } catch (err) {
    console.error("[clients delete]", err);
    res.status(500).json({ error: "No se pudo eliminar el cliente" });
  }
});

api.get("/clients/:id/summary", authenticate, async (req, res) => {
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

api.get("/pipeline", authenticate, async (_req, res) => {
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

api.get("/employees", authenticate, async (_req, res) => {
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

api.post("/employees", authenticate, async (req, res) => {
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

api.get("/tasks", authenticate, async (_req, res) => {
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

api.post("/tasks", authenticate, async (req, res) => {
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

api.patch("/tasks/:id", authenticate, async (req, res) => {
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

api.get("/renewals", authenticate, async (_req, res) => {
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

api.get("/insurers", authenticate, async (_req, res) => {
  try {
    const db = getDb();
    const rows = await db.collection("insurers").find({}).sort({ name: 1 }).toArray();
    res.json({ items: rows.map(mapDocument) });
  } catch (err) {
    console.error("[insurers]", err);
    res.status(500).json({ error: "No se pudieron recuperar las aseguradoras" });
  }
});

api.post("/insurers", authenticate, async (req, res) => {
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

api.patch("/insurers/:id", authenticate, requireAdmin, async (req, res) => {
  const insurerId = req.params.id;
  const { name, country, lines, status, rating, annual_premium, active_policies, loss_ratio, contact, key_deals, last_review, notes } =
    req.body || {};

  const updates = {};
  if (name !== undefined) {
    if (!name) return res.status(400).json({ error: "El nombre es obligatorio" });
    updates.name = name;
  }
  if (country !== undefined) updates.country = country ?? null;
  if (lines !== undefined) {
    if (!Array.isArray(lines)) return res.status(400).json({ error: "Lines debe ser un arreglo" });
    updates.lines = lines;
  }
  if (status !== undefined) updates.status = status ?? "Activa";
  if (rating !== undefined) updates.rating = typeof rating === "number" ? rating : null;
  if (annual_premium !== undefined) updates.annual_premium = typeof annual_premium === "number" ? annual_premium : null;
  if (active_policies !== undefined) updates.active_policies = typeof active_policies === "number" ? active_policies : null;
  if (loss_ratio !== undefined) updates.loss_ratio = typeof loss_ratio === "number" ? loss_ratio : null;
  if (contact !== undefined) {
    updates.contact = contact
      ? {
          name: contact.name ?? null,
          email: contact.email ?? null,
          phone: contact.phone ?? null,
        }
      : null;
  }
  if (key_deals !== undefined) {
    if (!Array.isArray(key_deals)) return res.status(400).json({ error: "Key deals debe ser un arreglo" });
    updates.key_deals = key_deals;
  }
  if (last_review !== undefined) updates.last_review = last_review ? new Date(last_review) : null;
  if (notes !== undefined) updates.notes = notes ?? null;

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Sin cambios" });

  try {
    const db = getDb();
    const result = await db
      .collection("insurers")
      .findOneAndUpdate({ _id: insurerId }, { $set: { ...updates, updated_at: new Date() } }, { returnDocument: "after" });
    if (!result) return res.status(404).json({ error: "Aseguradora no encontrada" });
    res.json(mapDocument(result));
  } catch (err) {
    console.error("[insurers update]", err);
    res.status(500).json({ error: "No se pudo actualizar la aseguradora" });
  }
});

api.delete("/insurers/:id", authenticate, requireAdmin, async (req, res) => {
  const insurerId = req.params.id;
  try {
    const db = getDb();
    const result = await db.collection("insurers").findOneAndDelete({ _id: insurerId });
    if (!result) return res.status(404).json({ error: "Aseguradora no encontrada" });
    res.json({ ok: true, id: insurerId });
  } catch (err) {
    console.error("[insurers delete]", err);
    res.status(500).json({ error: "No se pudo eliminar la aseguradora" });
  }
});

app.use("/api", api);

app.use((err, _req, res, _next) => {
  console.error("[unhandled]", err);
  res.status(500).json({ error: "Error interno del servidor" });
});

connectToDatabase()
  .then(() => {
    app.listen(PORT, "127.0.0.1", () => {
      console.log(`[api] listening on http://127.0.0.1:${PORT}`);
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
