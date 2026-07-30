import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { BSON } from "mongodb";
import { closeConnection, connectToDatabase } from "../db.js";

const APPLY_FLAG = "--apply";
const applyChanges = process.argv.includes(APPLY_FLAG);
const demoEmail = (process.env.DEMO_USER_EMAIL || "").trim().toLowerCase();
const keepCount = Number.parseInt(process.env.DEMO_CLIENTS_TO_KEEP || "5", 10);
const backupDirectory = resolve(process.env.CLIENT_BACKUP_DIR || "backups/client-trim");

if (!demoEmail) throw new Error("Falta DEMO_USER_EMAIL (correo del usuario demo).");
if (!Number.isSafeInteger(keepCount) || keepCount < 0) {
  throw new Error("DEMO_CLIENTS_TO_KEEP debe ser un entero mayor o igual a cero.");
}

const operationalCollections = [
  "clients",
  "policies",
  "policy_clients",
  "tasks",
  "pipeline",
  "renewals",
  "claims",
  "client_documents",
  "insurers",
  "employees",
];

function timestamp() {
  return new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

function uniqueValues(values) {
  const byEjson = new Map();
  for (const value of values) {
    if (value !== null && value !== undefined) byEjson.set(BSON.EJSON.stringify(value), value);
  }
  return [...byEjson.values()];
}

function countDocumentsByCollection(data) {
  return Object.fromEntries(Object.entries(data).map(([collection, rows]) => [collection, rows.length]));
}

async function discoverOtherTenantIds(db, demoTenantId) {
  const tenantIds = await db.collection("tenants").distinct("_id");
  for (const collection of operationalCollections) {
    tenantIds.push(...await db.collection(collection).distinct("tenant_id"));
  }
  const demoKey = demoTenantId === null ? null : BSON.EJSON.stringify(demoTenantId);
  return uniqueValues(tenantIds).filter((tenantId) => BSON.EJSON.stringify(tenantId) !== demoKey);
}

async function documentsForClientIds(db, clientIds) {
  if (!clientIds.length) return Object.fromEntries(operationalCollections.map((name) => [name, []]));

  const links = await db.collection("policy_clients").find({ client_id: { $in: clientIds } }).toArray();
  const policyIds = [...new Set(links.map((row) => row.policy_id))];
  const result = {};
  for (const collection of operationalCollections) {
    let filter;
    if (collection === "clients") filter = { _id: { $in: clientIds } };
    else if (collection === "policy_clients") filter = { client_id: { $in: clientIds } };
    else if (collection === "policies") filter = { _id: { $in: policyIds } };
    else if (["tasks", "pipeline", "renewals", "claims", "client_documents"].includes(collection)) {
      filter = { client_id: { $in: clientIds } };
    } else {
      result[collection] = [];
      continue;
    }
    result[collection] = await db.collection(collection).find(filter).toArray();
  }
  return result;
}

async function documentsForTenants(db, tenantIds) {
  const tenantClients = tenantIds.length
    ? await db.collection("clients").find({ tenant_id: { $in: tenantIds } }).toArray()
    : [];
  const result = await documentsForClientIds(db, tenantClients.map((row) => row._id));
  for (const collection of operationalCollections) {
    const tenantRows = tenantIds.length
      ? await db.collection(collection).find({ tenant_id: { $in: tenantIds } }).toArray()
      : [];
    const knownIds = new Set(result[collection].map((row) => String(row._id)));
    result[collection].push(...tenantRows.filter((row) => !knownIds.has(String(row._id))));
  }
  return result;
}

async function deleteDemoOverflow(db, removedClientIds, keptClientIds) {
  if (!removedClientIds.length) return;
  const removedLinks = await db.collection("policy_clients").find({ client_id: { $in: removedClientIds } }).toArray();
  const candidatePolicyIds = [...new Set(removedLinks.map((row) => row.policy_id))];
  const policiesStillUsed = candidatePolicyIds.length
    ? await db.collection("policy_clients").distinct("policy_id", {
        policy_id: { $in: candidatePolicyIds },
        client_id: { $in: keptClientIds },
      })
    : [];
  const orphanPolicyIds = candidatePolicyIds.filter((id) => !policiesStillUsed.includes(id));

  await Promise.all([
    db.collection("tasks").deleteMany({ client_id: { $in: removedClientIds } }),
    db.collection("pipeline").deleteMany({ client_id: { $in: removedClientIds } }),
    db.collection("renewals").deleteMany({ client_id: { $in: removedClientIds } }),
    db.collection("claims").deleteMany({ client_id: { $in: removedClientIds } }),
    db.collection("client_documents").deleteMany({ client_id: { $in: removedClientIds } }),
    db.collection("policy_clients").deleteMany({ client_id: { $in: removedClientIds } }),
    db.collection("clients").deleteMany({ _id: { $in: removedClientIds } }),
    orphanPolicyIds.length
      ? db.collection("policies").deleteMany({ _id: { $in: orphanPolicyIds } })
      : Promise.resolve(),
  ]);
}

async function main() {
  const db = await connectToDatabase();
  const demoUser = await db.collection("users").findOne({ email: demoEmail });
  if (!demoUser) throw new Error(`No existe el usuario demo ${demoEmail}.`);

  // Los usuarios internos creados antes de incorporar SaaS no tienen tenant_id.
  // En ese caso, sus clientes históricos también quedaron sin tenant_id y son el
  // conjunto demo que debemos conservar.
  const demoTenantId = demoUser.tenant_id ?? null;
  if (demoTenantId === null) {
    console.warn(`[clients:trim-demo] ${demoEmail} no tiene tenant_id; se usarán los clientes sin tenant_id.`);
  }
  const demoTenantFilter = demoTenantId === null
    ? { $or: [{ tenant_id: null }, { tenant_id: { $exists: false } }] }
    : { tenant_id: demoTenantId };
  const demoClients = await db
    .collection("clients")
    .find(demoTenantFilter)
    .sort({ created_at: -1, _id: 1 })
    .toArray();
  const keptClients = demoClients.slice(0, keepCount);
  const removedClients = demoClients.slice(keepCount);
  const keptClientIds = keptClients.map((row) => row._id);
  const removedClientIds = removedClients.map((row) => row._id);

  // No dependemos solamente de `tenants`: también detectamos tenant_id huérfanos
  // presentes en colecciones operativas para garantizar que no quede información.
  const otherTenantIds = await discoverOtherTenantIds(db, demoTenantId);
  const [demoBackup, otherTenantsBackup] = await Promise.all([
    documentsForClientIds(db, removedClientIds),
    documentsForTenants(db, otherTenantIds),
  ]);

  const archive = {
    metadata: {
      created_at: new Date(),
      database: db.databaseName,
      demo_user_email: demoEmail,
      demo_tenant_id: demoTenantId,
      kept_client_ids: keptClientIds,
      dry_run: !applyChanges,
    },
    removed_demo_data: demoBackup,
    removed_other_tenant_data: otherTenantsBackup,
  };
  await mkdir(backupDirectory, { recursive: true });
  const backupPath = resolve(backupDirectory, `clients-${timestamp()}.ejson`);
  await writeFile(backupPath, `${BSON.EJSON.stringify(archive, null, 2)}\n`, { flag: "wx", mode: 0o600 });

  if (applyChanges) {
    await deleteDemoOverflow(db, removedClientIds, keptClientIds);
    const otherTenantClientIds = otherTenantsBackup.clients.map((row) => row._id);
    await deleteDemoOverflow(db, otherTenantClientIds, []);
    for (const collection of operationalCollections) {
      await db.collection(collection).deleteMany({ tenant_id: { $in: otherTenantIds } });
    }
  }

  const remainingOtherTenantData = applyChanges
    ? await documentsForTenants(db, otherTenantIds)
    : null;
  const remainingOtherTenantCounts = remainingOtherTenantData
    ? countDocumentsByCollection(remainingOtherTenantData)
    : null;
  if (remainingOtherTenantCounts && Object.values(remainingOtherTenantCounts).some((count) => count !== 0)) {
    throw new Error(`Quedaron datos de otros tenants: ${JSON.stringify(remainingOtherTenantCounts)}`);
  }

  console.log(JSON.stringify({
    mode: applyChanges ? "applied" : "dry-run",
    backup: backupPath,
    demoTenantId,
    demoClientsBefore: demoClients.length,
    demoClientsKept: keptClients.length,
    demoClientsRemoved: removedClients.length,
    otherTenantsFound: otherTenantIds.length,
    otherTenantsCleared: applyChanges ? otherTenantIds.length : 0,
    otherTenantRecordsBefore: countDocumentsByCollection(otherTenantsBackup),
    otherTenantRecordsAfter: remainingOtherTenantCounts,
  }, null, 2));
  if (!applyChanges) console.log(`Vista previa solamente. Revisá el respaldo y repetí con ${APPLY_FLAG}.`);
}

main()
  .catch((error) => {
    console.error("No se pudo preparar la limpieza de clientes:", error);
    process.exitCode = 1;
  })
  .finally(closeConnection);
