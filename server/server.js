import "dotenv/config";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import { randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { ObjectId } from "mongodb";
import { UUID } from "bson";
import { closeConnection, connectToDatabase, getDb } from "./db.js";
import { POLICY_ROLE_KEYS, buildPolicyRoleEntries, normalizeRoleAssignments } from "./policyRoles.js";

const PORT = process.env.PORT || 4000;
const ACCESS_TTL_SECONDS = Number(process.env.ACCESS_TTL_SECONDS || 60 * 60 * 2); // 2h
const REFRESH_TTL_SECONDS = Number(process.env.REFRESH_TTL_SECONDS || 60 * 60 * 24); // 24h
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

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

function toObjectId(value) {
  if (typeof value !== "string" || !ObjectId.isValid(value)) return null;
  const parsed = new ObjectId(value);
  return parsed.toHexString() === value ? parsed : null;
}

function buildIdList(value) {
  if (!value) return [];
  const list = [];
  const valueAsString = typeof value === "string" ? value.trim() : String(value).trim();
  const lowercased = valueAsString.toLowerCase();
  const addValue = (item) => {
    if (item === undefined || item === null || item === "") return;
    if (!list.includes(item)) list.push(item);
  };

  addValue(value);
  addValue(valueAsString !== value ? valueAsString : undefined);
  addValue(lowercased !== valueAsString ? lowercased : undefined);

  const parsed = toObjectId(valueAsString) ?? toObjectId(lowercased);
  if (parsed) addValue(parsed);

  if (UUID.isValid(valueAsString)) {
    addValue(new UUID(valueAsString));
  }
  if (lowercased !== valueAsString && UUID.isValid(lowercased)) {
    addValue(new UUID(lowercased));
  }
  return list;
}

function mapDocument(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: String(_id), ...rest };
}

function mapPolicyDocument(doc) {
  if (!doc) return null;
  return {
    id: String(doc._id),
    policy_id: doc.policy_id ?? null,
    name: doc.name ?? "",
    size: typeof doc.size === "number" ? doc.size : null,
    type: doc.type ?? "application/octet-stream",
    category: doc.category ?? "otros",
    label: doc.label ?? null,
    created_at: doc.created_at ?? null,
  };
}

function mapClientSummary(client) {
  if (!client) return null;
  return {
    id: String(client._id),
    name: client.name ?? null,
    document: client.document ?? null,
    city: client.city ?? null,
  };
}

function normalizeApoderados(apoderados) {
  if (!Array.isArray(apoderados)) return [];
  return apoderados.map((item) => ({
    figura: item?.figura ?? "Empresa",
    tipoPersona: item?.tipoPersona ?? "Persona física",
    nombre: item?.nombre ?? "",
    documentoTipo: item?.documentoTipo ?? "DNI",
    documento: item?.documento ?? "",
    telefono: item?.telefono ?? "",
    email: item?.email ?? "",
    direccion: item?.direccion ?? "",
    notas: item?.notas ?? "",
  }));
}

function normalizeLaboralHistorial(historial) {
  if (!Array.isArray(historial)) return [];
  return historial.map((item) => ({
    tipoEmpresa: item?.tipoEmpresa ?? "",
    tipoVinculo: item?.tipoVinculo ?? "Empleado",
    nombreEmpresa: item?.nombreEmpresa ?? "",
    fechaIngreso: item?.fechaIngreso ?? "",
    nominal: item?.nominal ?? "",
    promedio: item?.promedio ?? "",
  }));
}

function mapProductionEntry(entry) {
  if (!entry) return null;
  const producer = entry.producer ?? {};
  const companies = Array.isArray(entry.companies) ? entry.companies : entry.companias;

  return {
    id: String(entry._id),
    periodo: entry.periodo ?? entry.period ?? null,
    nombre: entry.nombre ?? producer.name ?? "Sin asignar",
    localidad: entry.localidad ?? producer.location ?? null,
    correo: entry.correo ?? producer.email ?? null,
    celular: entry.celular ?? producer.phone ?? null,
    companias: Array.isArray(companies)
      ? companies.map((company) => ({
          nombre: company.nombre ?? company.name ?? "Sin nombre",
          automotor: typeof company.automotor === "number" ? company.automotor : company.auto ?? 0,
          hogar: typeof company.hogar === "number" ? company.hogar : company.home ?? 0,
          vida: typeof company.vida === "number" ? company.vida : company.life ?? 0,
          caucion: typeof company.caucion === "number" ? company.caucion : company.surety ?? 0,
          bonificacion: company.bonificacion ?? company.bonus ?? "—",
        }))
      : [],
    objetivoMensual:
      typeof entry.objetivoMensual === "number" ? entry.objetivoMensual : entry.objective_monthly ?? 0,
    produccionMes:
      typeof entry.produccionMes === "number" ? entry.produccionMes : entry.production_month ?? 0,
    produccionAnual:
      typeof entry.produccionAnual === "number" ? entry.produccionAnual : entry.production_year ?? 0,
    seguimiento: entry.seguimiento ?? entry.followup ?? null,
  };
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

async function ensureClientsExist(clientIds) {
  if (!clientIds.length) return { ok: true, missing: [] };
  const db = getDb();
  const expandedIds = clientIds.flatMap((id) => buildIdList(id));
  const rows = await db
    .collection("clients")
    .find({ _id: { $in: expandedIds } }, { projection: { _id: 1 } })
    .toArray();
  const foundIds = new Set(rows.map((row) => String(row._id)));
  const missing = clientIds.filter((id) => !foundIds.has(String(id)));
  return { ok: missing.length === 0, missing };
}

async function fetchPolicyRoleAssignments(policyId) {
  const db = getDb();
  const rows = await db.collection("policy_clients").find({ policy_id: policyId }).toArray();
  const assignments = {
    asegurados: [],
    tomadores: [],
    cesionarios: [],
  };

  for (const row of rows) {
    const roleKey = POLICY_ROLE_KEYS[row.role];
    if (!roleKey) continue;
    assignments[roleKey].push(row.client_id);
  }

  return assignments;
}

async function hydratePoliciesWithRoles(policies) {
  if (!policies.length) return [];
  const db = getDb();
  const policyIds = policies.map((policy) => policy._id);
  const roleRows = await db.collection("policy_clients").find({ policy_id: { $in: policyIds } }).toArray();
  const clientIds = Array.from(new Set(roleRows.map((row) => row.client_id)));
  const clients = clientIds.length
    ? await db.collection("clients").find({ _id: { $in: clientIds } }).toArray()
    : [];
  const clientsById = clients.reduce((acc, client) => {
    acc[client._id] = mapClientSummary(client);
    return acc;
  }, {});

  const rolesByPolicy = policyIds.reduce((acc, policyId) => {
    acc[policyId] = { asegurados: [], tomadores: [], cesionarios: [] };
    return acc;
  }, {});

  for (const row of roleRows) {
    const roleKey = POLICY_ROLE_KEYS[row.role];
    const client = clientsById[row.client_id];
    if (!roleKey || !client) continue;
    const entry = rolesByPolicy[row.policy_id];
    if (entry) entry[roleKey].push(client);
  }

  return policies.map((policy) => ({
    ...mapDocument(policy),
    roles: rolesByPolicy[policy._id] ?? { asegurados: [], tomadores: [], cesionarios: [] },
  }));
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

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Solo administradores pueden realizar esta acción" });
  return next();
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

api.get("/users", authenticate, requireAdmin, async (_req, res) => {
  try {
    const db = getDb();
    const rows = await db
      .collection("users")
      .find({}, { projection: { _id: 1, name: 1, email: 1, role: 1, roles: 1, status: 1, last_access: 1, team: 1 } })
      .sort({ name: 1 })
      .toArray();

    const items = rows.map((user) => {
      const roles = Array.isArray(user.roles) ? user.roles.filter(Boolean) : user.role ? [user.role] : [];
      const status = user.status === "Suspendido" ? "Suspendido" : "Activo";
      return {
        id: String(user._id),
        name: user.name,
        email: user.email,
        roles,
        status,
        lastAccess: user.last_access ? new Date(user.last_access).toISOString() : null,
        team: user.team ?? null,
      };
    });

    res.json({ items });
  } catch (err) {
    console.error("[users list]", err);
    res.status(500).json({ error: "No se pudieron recuperar los usuarios" });
  }
});

api.get("/clients", authenticate, async (_req, res) => {
  try {
    const db = getDb();
    const items = await db
      .collection("clients")
      .find({}, { projection: { password_hash: 0 } })
      .sort({ created_at: -1 })
      .toArray();

    const clientIds = items.map((client) => client._id);
    const policyLinks = clientIds.length
      ? await db.collection("policy_clients").find({ client_id: { $in: clientIds } }).toArray()
      : [];
    const policyIds = Array.from(new Set(policyLinks.map((link) => link.policy_id)));
    const policyDocs = policyIds.length
      ? await db.collection("policies").find({ _id: { $in: policyIds } }).toArray()
      : [];
    const policiesById = policyDocs.reduce((acc, policy) => {
      acc[policy._id] = policy;
      return acc;
    }, {});

    const insurerIds = Array.from(
      new Set(
        policyDocs.map((policy) => policy.insurer_id).filter((id) => typeof id === "string"),
      ),
    );
    const insurersLookup = insurerIds.length
      ? await db.collection("insurers").find({ _id: { $in: insurerIds } }).toArray()
      : [];

    const insurersById = insurersLookup.reduce((acc, row) => {
      acc[row._id] = row;
      return acc;
    }, {});

    const rolesByClientPolicy = policyLinks.reduce((acc, link) => {
      const key = `${link.client_id}:${link.policy_id}`;
      if (!acc[key]) acc[key] = new Set();
      acc[key].add(link.role);
      return acc;
    }, {});

    const policiesByClient = policyLinks.reduce((acc, link) => {
      const policy = policiesById[link.policy_id];
      if (!policy) return acc;
      if (!acc[link.client_id]) acc[link.client_id] = new Map();
      if (!acc[link.client_id].has(link.policy_id)) {
        const rolesKey = `${link.client_id}:${link.policy_id}`;
        acc[link.client_id].set(link.policy_id, {
          id: String(policy._id),
          type: policy.type ?? null,
          insurer_id: policy.insurer_id ?? null,
          insurer: policy.insurer_id ? insurersById[policy.insurer_id]?.name ?? null : null,
          status: policy.status ?? null,
          premium: typeof policy.premium === "number" ? policy.premium : null,
          next_renewal: policy.next_renewal ?? null,
          roles: rolesByClientPolicy[rolesKey] ? Array.from(rolesByClientPolicy[rolesKey]) : [],
        });
      }
      return acc;
    }, {});

    const clients = items.map((client) => ({
      ...mapDocument(client),
      policies: policiesByClient[client._id]
        ? Array.from(policiesByClient[client._id].values())
        : (client.policies ?? []).map((policy) => ({
            ...policy,
            insurer: policy.insurer_id ? insurersById[policy.insurer_id]?.name ?? null : null,
            roles: [],
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
      $lookup: {
        from: "policies",
        localField: "policy_id",
        foreignField: "_id",
        as: "policy_doc",
      },
    },
    { $unwind: { path: "$policy_doc", preserveNullAndEmptyArrays: true } },
    {
      $set: {
        policy: {
          $ifNull: [
            "$policy_doc",
            {
              $first: {
                $filter: {
                  input: "$client.policies",
                  as: "policy",
                  cond: { $eq: ["$$policy.id", "$policy_id"] },
                },
              },
            },
          ],
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
    const clientIds = buildIdList(client_id);
    const client = await db.collection("clients").findOne({ _id: { $in: clientIds } });
    if (!client) return res.status(404).json({ error: "Cliente no encontrado" });

    const policyDoc = await db.collection("policies").findOne({ _id: policy_id });
    let policy = policyDoc;

    if (policyDoc) {
      const link = await db.collection("policy_clients").findOne({
        policy_id,
        client_id: { $in: clientIds },
      });
      if (!link) return res.status(400).json({ error: "La póliza indicada no pertenece al cliente" });
    } else {
      policy = (client.policies ?? []).find((p) => p.id === policy_id);
      if (!policy) return res.status(400).json({ error: "La póliza indicada no pertenece al cliente" });
    }

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

api.delete("/claims/:id", authenticate, requireAdmin, async (req, res) => {
  const claimId = req.params.id;
  try {
    const db = getDb();
    const deleted = await db.collection("claims").findOneAndDelete({ _id: claimId });
    if (!deleted?.value) return res.status(404).json({ error: "Siniestro no encontrado" });
    res.json({ ok: true });
  } catch (err) {
    console.error("[claims delete]", err);
    res.status(500).json({ error: "No se pudo eliminar el siniestro" });
  }
});

api.post("/clients", authenticate, async (req, res) => {
  const { name, document, city, department, country, address, contacts, policies, apoderados, laboralHistorial } =
    req.body || {};
  if (!name || !document) return res.status(400).json({ error: "Nombre y documento son obligatorios" });

  const clientDoc = {
    _id: randomUUID(),
    name,
    document,
    city: city ?? null,
    department: department ?? null,
    country: country ?? null,
    address: address ?? null,
    contacts: Array.isArray(contacts)
      ? contacts.map((contact) => ({
          id: contact.id ?? randomUUID(),
          name: contact.name ?? "",
          email: contact.email ?? null,
          phone: contact.phone ?? null,
        }))
      : [],
    apoderados: normalizeApoderados(apoderados),
    laboralHistorial: normalizeLaboralHistorial(laboralHistorial),
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

api.patch("/clients/:id", authenticate, async (req, res) => {
  const clientId = req.params.id;
  const { name, document, city, department, country, address, contacts, apoderados, laboralHistorial } =
    req.body || {};

  if ("name" in (req.body || {}) && !name) {
    return res.status(400).json({ error: "Nombre es obligatorio" });
  }
  if ("document" in (req.body || {}) && !document) {
    return res.status(400).json({ error: "Documento es obligatorio" });
  }

  const update = { updated_at: new Date() };
  if ("name" in (req.body || {})) update.name = name;
  if ("document" in (req.body || {})) update.document = document;
  if ("city" in (req.body || {})) update.city = city ?? null;
  if ("department" in (req.body || {})) update.department = department ?? null;
  if ("country" in (req.body || {})) update.country = country ?? null;
  if ("address" in (req.body || {})) update.address = address ?? null;
  if ("contacts" in (req.body || {})) {
    update.contacts = Array.isArray(contacts)
      ? contacts.map((contact) => ({
          id: contact.id ?? randomUUID(),
          name: contact.name ?? "",
          email: contact.email ?? null,
          phone: contact.phone ?? null,
        }))
      : [];
  }
  if ("apoderados" in (req.body || {})) {
    update.apoderados = normalizeApoderados(apoderados);
  }
  if ("laboralHistorial" in (req.body || {})) {
    update.laboralHistorial = normalizeLaboralHistorial(laboralHistorial);
  }

  try {
    const db = getDb();
    const clientIds = buildIdList(clientId);
    const updated = await db.collection("clients").findOneAndUpdate(
      { _id: { $in: clientIds } },
      { $set: update },
      { returnDocument: "after" },
    );
    if (!updated?.value) return res.status(404).json({ error: "Cliente no encontrado" });
    res.json(mapDocument(updated.value));
  } catch (err) {
    console.error("[clients update]", err);
    res.status(500).json({ error: "No se pudo actualizar el cliente" });
  }
});

api.get("/clients/:id", authenticate, async (req, res) => {
  const clientId = req.params.id;
  try {
    const db = getDb();
    const clientIds = buildIdList(clientId);
    const clientDoc = await db.collection("clients").findOne({ _id: { $in: clientIds } });
    if (!clientDoc) return res.status(404).json({ error: "Cliente no encontrado" });
    res.json(mapDocument(clientDoc));
  } catch (err) {
    console.error("[clients detail]", err);
    res.status(500).json({ error: "No se pudo recuperar el cliente" });
  }
});

api.get("/clients/:id/summary", authenticate, async (req, res) => {
  const clientId = req.params.id;
  try {
    const db = getDb();
    const clientIds = buildIdList(clientId);
    const clientDoc = await db.collection("clients").findOne({ _id: { $in: clientIds } });
    if (!clientDoc) return res.status(404).json({ error: "Cliente no encontrado" });

    const policyLinks = await db.collection("policy_clients")
      .find({ client_id: { $in: clientIds } })
      .toArray();
    const policyIds = Array.from(new Set(policyLinks.map((link) => link.policy_id)));
    const policyDocs = policyIds.length
      ? await db.collection("policies").find({ _id: { $in: policyIds } }).toArray()
      : [];
    const policiesById = policyDocs.reduce((acc, policy) => {
      acc[policy._id] = policy;
      return acc;
    }, {});
    const insurerIds = Array.from(
      new Set(
        policyDocs.map((policy) => policy.insurer_id).filter((id) => typeof id === "string"),
      ),
    );
    const insurersLookup = insurerIds.length
      ? await db.collection("insurers").find({ _id: { $in: insurerIds } }).toArray()
      : [];

    const insurersById = insurersLookup.reduce((acc, row) => {
      acc[row._id] = row;
      return acc;
    }, {});

    const tasks = await db
      .collection("tasks")
      .aggregate([
        { $match: { client_id: { $in: clientIds } } },
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
      .find({ client_id: { $in: clientIds } })
      .sort({ updated_at: -1 })
      .limit(1)
      .toArray();
    const renewalRows = await db
      .collection("renewals")
      .find({ client_id: { $in: clientIds } })
      .sort({ renewal_date: -1 })
      .limit(1)
      .toArray();

    const tasksMapped = tasks.map(mapDocument);
    const nextTask = tasksMapped.find((t) => t.status !== "completada") || null;

    const rolesByPolicy = policyLinks.reduce((acc, link) => {
      if (!acc[link.policy_id]) acc[link.policy_id] = new Set();
      acc[link.policy_id].add(link.role);
      return acc;
    }, {});

    const policies = policyLinks.length
      ? Array.from(
          policyLinks.reduce((acc, link) => {
            const policy = policiesById[link.policy_id];
            if (!policy || acc.has(link.policy_id)) return acc;
            acc.set(link.policy_id, {
              id: String(policy._id),
              type: policy.type ?? null,
              insurer_id: policy.insurer_id ?? null,
              insurer: policy.insurer_id ? insurersById[policy.insurer_id]?.name ?? null : null,
              status: policy.status ?? null,
              premium: typeof policy.premium === "number" ? policy.premium : null,
              next_renewal: policy.next_renewal ?? null,
              roles: rolesByPolicy[link.policy_id] ? Array.from(rolesByPolicy[link.policy_id]) : [],
            });
            return acc;
          }, new Map())
          .values(),
        )
      : (clientDoc.policies ?? []).map((policy) => ({
          ...policy,
          insurer: policy.insurer_id ? insurersById[policy.insurer_id]?.name ?? null : null,
          roles: [],
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

api.delete("/clients/:id", authenticate, requireAdmin, async (req, res) => {
  const clientId = req.params.id;
  try {
    const db = getDb();
    const clientIds = buildIdList(clientId);
    const deleted = await db.collection("clients").findOneAndDelete({ _id: { $in: clientIds } });
    if (!deleted?.value) return res.status(404).json({ error: "Cliente no encontrado" });

    await Promise.all([
      db.collection("tasks").deleteMany({ client_id: { $in: clientIds } }),
      db.collection("pipeline").deleteMany({ client_id: { $in: clientIds } }),
      db.collection("renewals").deleteMany({ client_id: { $in: clientIds } }),
      db.collection("claims").deleteMany({ client_id: { $in: clientIds } }),
      db.collection("policy_clients").deleteMany({ client_id: { $in: clientIds } }),
    ]);

    res.json({ ok: true });
  } catch (err) {
    console.error("[clients delete]", err);
    res.status(500).json({ error: "No se pudo eliminar el cliente" });
  }
});

api.delete("/clients/:clientId/policies/:policyId", authenticate, requireAdmin, async (req, res) => {
  const { clientId, policyId } = req.params;
  try {
    const db = getDb();
    const clientIds = buildIdList(clientId);
    const updated = await db.collection("clients").findOneAndUpdate(
      { _id: { $in: clientIds }, "policies.id": policyId },
      { $pull: { policies: { id: policyId } } },
      { returnDocument: "after" },
    );

    const [linksDeleted] = await Promise.all([
      db.collection("policy_clients").deleteMany({ client_id: { $in: clientIds }, policy_id: policyId }),
      db.collection("claims").deleteMany({ client_id: { $in: clientIds }, policy_id: policyId }),
    ]);

    if (!updated?.value && !linksDeleted?.deletedCount) {
      return res.status(404).json({ error: "Póliza no encontrada para el cliente" });
    }

    res.json({ client: mapDocument(updated.value) });
  } catch (err) {
    console.error("[policies delete]", err);
    res.status(500).json({ error: "No se pudo eliminar la póliza" });
  }
});

api.get("/policies", authenticate, async (_req, res) => {
  try {
    const db = getDb();
    const rows = await db.collection("policies").find({}).sort({ created_at: -1 }).toArray();
    const items = await hydratePoliciesWithRoles(rows);
    res.json({ items });
  } catch (err) {
    console.error("[policies]", err);
    res.status(500).json({ error: "No se pudieron recuperar las pólizas" });
  }
});

api.get("/policies/:id", authenticate, async (req, res) => {
  const policyId = req.params.id;
  try {
    const db = getDb();
    const row = await db.collection("policies").findOne({ _id: policyId });
    if (!row) return res.status(404).json({ error: "Póliza no encontrada" });
    const [item] = await hydratePoliciesWithRoles([row]);
    res.json(item);
  } catch (err) {
    console.error("[policies detail]", err);
    res.status(500).json({ error: "No se pudo recuperar la póliza" });
  }
});

api.get("/policies/:id/documents", authenticate, async (req, res) => {
  const policyId = req.params.id;
  try {
    const db = getDb();
    const policy = await db.collection("policies").findOne({ _id: policyId });
    if (!policy) return res.status(404).json({ error: "Póliza no encontrada" });

    const rows = await db
      .collection("policy_documents")
      .find({ policy_id: policyId })
      .sort({ created_at: -1 })
      .toArray();
    res.json({ items: rows.map(mapPolicyDocument) });
  } catch (err) {
    console.error("[policies documents list]", err);
    res.status(500).json({ error: "No se pudieron recuperar los documentos" });
  }
});

api.post("/policies/:id/documents", authenticate, async (req, res) => {
  const policyId = req.params.id;
  const { documents } = req.body || {};
  if (!Array.isArray(documents) || documents.length === 0) {
    return res.status(400).json({ error: "Debes enviar documentos para adjuntar" });
  }

  try {
    const db = getDb();
    const policy = await db.collection("policies").findOne({ _id: policyId });
    if (!policy) return res.status(404).json({ error: "Póliza no encontrada" });

    const now = new Date();
    const items = documents.map((doc, index) => {
      const name = typeof doc?.name === "string" ? doc.name.trim() : "";
      const content = typeof doc?.content_base64 === "string" ? doc.content_base64 : "";
      if (!name) {
        throw new Error(`Documento ${index + 1}: nombre inválido`);
      }
      if (!content) {
        throw new Error(`Documento ${index + 1}: contenido vacío`);
      }
      const buffer = Buffer.from(content, "base64");
      return {
        _id: randomUUID(),
        policy_id: policyId,
        name,
        size: buffer.length,
        type: typeof doc?.type === "string" && doc.type ? doc.type : "application/octet-stream",
        category: typeof doc?.category === "string" && doc.category ? doc.category : "otros",
        label: typeof doc?.label === "string" && doc.label ? doc.label : null,
        data: buffer,
        created_at: now,
      };
    });

    await db.collection("policy_documents").insertMany(items);
    res.status(201).json({ items: items.map(mapPolicyDocument) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudieron adjuntar los documentos";
    console.error("[policies documents create]", err);
    res.status(400).json({ error: message });
  }
});

api.get("/policies/:id/documents/:docId", authenticate, async (req, res) => {
  const { id: policyId, docId } = req.params;
  try {
    const db = getDb();
    const doc = await db.collection("policy_documents").findOne({ _id: docId, policy_id: policyId });
    if (!doc) return res.status(404).json({ error: "Documento no encontrado" });

    const buffer = Buffer.isBuffer(doc.data) ? doc.data : Buffer.from(doc.data?.buffer ?? doc.data ?? []);
    res.setHeader("Content-Type", doc.type ?? "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${doc.name ?? "documento"}"`);
    res.send(buffer);
  } catch (err) {
    console.error("[policies documents download]", err);
    res.status(500).json({ error: "No se pudo descargar el documento" });
  }
});

api.delete("/policies/:id/documents/:docId", authenticate, async (req, res) => {
  const { id: policyId, docId } = req.params;
  try {
    const db = getDb();
    const result = await db.collection("policy_documents").deleteOne({ _id: docId, policy_id: policyId });
    if (!result.deletedCount) return res.status(404).json({ error: "Documento no encontrado" });
    res.json({ ok: true });
  } catch (err) {
    console.error("[policies documents delete]", err);
    res.status(500).json({ error: "No se pudo eliminar el documento" });
  }
});

api.post("/policies", authenticate, async (req, res) => {
  const { type, insurer_id, status, premium, next_renewal, asegurados, tomadores, cesionarios } = req.body || {};

  const policyDoc = {
    _id: randomUUID(),
    type: type ?? null,
    insurer_id: insurer_id ?? null,
    status: status ?? null,
    premium: typeof premium === "number" ? premium : null,
    next_renewal: next_renewal ? new Date(next_renewal) : null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const roleAssignments = normalizeRoleAssignments({ asegurados, tomadores, cesionarios });
  const roleEntries = buildPolicyRoleEntries(policyDoc._id, roleAssignments);
  const clientIds = Array.from(new Set(roleEntries.map((entry) => entry.client_id)));

  try {
    const db = getDb();
    const { ok, missing } = await ensureClientsExist(clientIds);
    if (!ok) {
      return res.status(400).json({ error: `Clientes no encontrados: ${missing.join(", ")}` });
    }

    await db.collection("policies").insertOne(policyDoc);
    if (roleEntries.length) {
      await db.collection("policy_clients").insertMany(
        roleEntries.map((entry) => ({
          _id: randomUUID(),
          ...entry,
          created_at: new Date(),
        })),
      );
    }

    const [item] = await hydratePoliciesWithRoles([policyDoc]);
    res.status(201).json(item);
  } catch (err) {
    console.error("[policies create]", err);
    res.status(500).json({ error: "No se pudo crear la póliza" });
  }
});

api.put("/policies/:id", authenticate, async (req, res) => {
  const policyId = req.params.id;
  const { type, insurer_id, status, premium, next_renewal, asegurados, tomadores, cesionarios } = req.body || {};
  const hasRoleUpdates = ["asegurados", "tomadores", "cesionarios"].some((key) => key in (req.body || {}));

  try {
    const db = getDb();
    const existing = await db.collection("policies").findOne({ _id: policyId });
    if (!existing) return res.status(404).json({ error: "Póliza no encontrada" });

    if (hasRoleUpdates) {
      const requestedAssignments = normalizeRoleAssignments({ asegurados, tomadores, cesionarios });
      const currentAssignments = await fetchPolicyRoleAssignments(policyId);
      const roleAssignments = {
        asegurados: "asegurados" in req.body ? requestedAssignments.asegurados : currentAssignments.asegurados,
        tomadores: "tomadores" in req.body ? requestedAssignments.tomadores : currentAssignments.tomadores,
        cesionarios: "cesionarios" in req.body ? requestedAssignments.cesionarios : currentAssignments.cesionarios,
      };
      const roleEntries = buildPolicyRoleEntries(policyId, roleAssignments);
      const clientIds = Array.from(new Set(roleEntries.map((entry) => entry.client_id)));
      const { ok, missing } = await ensureClientsExist(clientIds);
      if (!ok) {
        return res.status(400).json({ error: `Clientes no encontrados: ${missing.join(", ")}` });
      }

      await db.collection("policy_clients").deleteMany({ policy_id: policyId });
      if (roleEntries.length) {
        await db.collection("policy_clients").insertMany(
          roleEntries.map((entry) => ({
            _id: randomUUID(),
            ...entry,
            created_at: new Date(),
          })),
        );
      }
    }

    const update = { updated_at: new Date() };
    if ("type" in req.body) update.type = type ?? null;
    if ("insurer_id" in req.body) update.insurer_id = insurer_id ?? null;
    if ("status" in req.body) update.status = status ?? null;
    if ("premium" in req.body) update.premium = typeof premium === "number" ? premium : null;
    if ("next_renewal" in req.body) update.next_renewal = next_renewal ? new Date(next_renewal) : null;

    const updated = await db
      .collection("policies")
      .findOneAndUpdate({ _id: policyId }, { $set: update }, { returnDocument: "after" });

    const [item] = await hydratePoliciesWithRoles([updated.value]);
    res.json(item);
  } catch (err) {
    console.error("[policies update]", err);
    res.status(500).json({ error: "No se pudo actualizar la póliza" });
  }
});

api.delete("/policies/:id", authenticate, requireAdmin, async (req, res) => {
  const policyId = req.params.id;
  try {
    const db = getDb();
    const deleted = await db.collection("policies").findOneAndDelete({ _id: policyId });
    if (!deleted?.value) return res.status(404).json({ error: "Póliza no encontrada" });

    await Promise.all([
      db.collection("policy_clients").deleteMany({ policy_id: policyId }),
      db.collection("claims").deleteMany({ policy_id: policyId }),
    ]);

    res.json({ ok: true });
  } catch (err) {
    console.error("[policies delete]", err);
    res.status(500).json({ error: "No se pudo eliminar la póliza" });
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

api.delete("/pipeline/:id", authenticate, requireAdmin, async (req, res) => {
  const pipelineId = req.params.id;
  try {
    const db = getDb();
    const deleted = await db.collection("pipeline").findOneAndDelete({ _id: pipelineId });
    if (!deleted?.value) return res.status(404).json({ error: "Oportunidad no encontrada" });
    res.json({ ok: true });
  } catch (err) {
    console.error("[pipeline delete]", err);
    res.status(500).json({ error: "No se pudo eliminar la oportunidad" });
  }
});

api.get("/production/periods", authenticate, async (_req, res) => {
  try {
    const db = getDb();
    const [periods, periodsAlt] = await Promise.all([
      db.collection("production").distinct("period"),
      db.collection("production").distinct("periodo"),
    ]);
    const items = Array.from(new Set([...periods, ...periodsAlt].filter(Boolean)));
    items.sort((a, b) => b.localeCompare(a));
    res.json({ items });
  } catch (err) {
    console.error("[production periods]", err);
    res.status(500).json({ error: "No se pudieron recuperar los periodos" });
  }
});

api.get("/production", authenticate, async (req, res) => {
  const period = typeof req.query.period === "string" ? req.query.period : null;
  try {
    const db = getDb();
    const filter = period
      ? {
          $or: [{ period }, { periodo: period }],
        }
      : {};
    const rows = await db.collection("production").find(filter).sort({ nombre: 1 }).toArray();
    res.json({ items: rows.map(mapProductionEntry).filter(Boolean) });
  } catch (err) {
    console.error("[production list]", err);
    res.status(500).json({ error: "No se pudo recuperar la producción" });
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
      const clientIds = buildIdList(client_id);
      clientExists = await db.collection("clients").findOne({ _id: { $in: clientIds } });
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
        const clientIds = buildIdList(client_id);
        const clientExists = await db.collection("clients").findOne({ _id: { $in: clientIds } });
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

api.delete("/tasks/:id", authenticate, requireAdmin, async (req, res) => {
  const taskId = req.params.id;
  try {
    const db = getDb();
    const deleted = await db.collection("tasks").findOneAndDelete({ _id: taskId });
    if (!deleted?.value) return res.status(404).json({ error: "Tarea no encontrada" });
    res.json({ ok: true });
  } catch (err) {
    console.error("[tasks delete]", err);
    res.status(500).json({ error: "No se pudo eliminar la tarea" });
  }
});

api.delete("/users/:id", authenticate, requireAdmin, async (req, res) => {
  const userId = req.params.id;
  try {
    const db = getDb();
    const deleted = await db.collection("users").findOneAndDelete({ _id: userId });
    if (!deleted?.value) return res.status(404).json({ error: "Usuario no encontrado" });

    await db.collection("refresh_tokens").deleteMany({ user_id: userId });

    res.json({ ok: true });
  } catch (err) {
    console.error("[users delete]", err);
    res.status(500).json({ error: "No se pudo eliminar el usuario" });
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

api.delete("/renewals/:id", authenticate, requireAdmin, async (req, res) => {
  const renewalId = req.params.id;
  try {
    const db = getDb();
    const deleted = await db.collection("renewals").findOneAndDelete({ _id: renewalId });
    if (!deleted?.value) return res.status(404).json({ error: "Renovación no encontrada" });
    res.json({ ok: true });
  } catch (err) {
    console.error("[renewals delete]", err);
    res.status(500).json({ error: "No se pudo eliminar la renovación" });
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

api.delete("/insurers/:id", authenticate, requireAdmin, async (req, res) => {
  const insurerId = req.params.id;
  try {
    const db = getDb();
    const deleted = await db.collection("insurers").findOneAndDelete({ _id: insurerId });
    if (!deleted?.value) return res.status(404).json({ error: "Aseguradora no encontrada" });

    await Promise.all([
      db.collection("clients").updateMany(
        { "policies.insurer_id": insurerId },
        { $set: { "policies.$[policy].insurer_id": null } },
        { arrayFilters: [{ "policy.insurer_id": insurerId }] },
      ),
      db.collection("policies").updateMany({ insurer_id: insurerId }, { $set: { insurer_id: null } }),
      db.collection("claims").updateMany({ insurer_id: insurerId }, { $set: { insurer_id: null } }),
    ]);

    res.json({ ok: true });
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
