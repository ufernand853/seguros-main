import "dotenv/config";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { closeConnection, connectToDatabase } from "../db.js";

const email = (process.env.CLIENT_DEMO_EMAIL || "demo@linsse.com").trim().toLowerCase();
const password = process.env.CLIENT_DEMO_PASSWORD || "DemoCliente2026!";
const clientId = (process.env.CLIENT_DEMO_CLIENT_ID || "").trim();

function hashPassword(plainText) {
  const salt = randomBytes(16).toString("hex");
  const hashed = scryptSync(plainText, salt, 64).toString("hex");
  return `${salt}:${hashed}`;
}

async function main() {
  const db = await connectToDatabase();
  const client = clientId
    ? await db.collection("clients").findOne({ _id: clientId })
    : await db.collection("clients").findOne(
        { $or: [{ tenant_id: null }, { tenant_id: { $exists: false } }] },
        { sort: { created_at: -1, _id: 1 } },
      );
  if (!client) throw new Error(clientId ? `No existe el cliente ${clientId}.` : "No hay clientes demo disponibles.");

  const now = new Date();
  const result = await db.collection("users").findOneAndUpdate(
    { email },
    {
      $set: {
        name: client.name ? `Portal de ${client.name}` : "Cliente Demo",
        email,
        password_hash: hashPassword(password),
        role: "cliente",
        client_id: client._id,
        tenant_id: client.tenant_id ?? null,
        status: "Activo",
        updated_at: now,
      },
      $setOnInsert: { _id: randomUUID(), created_at: now },
    },
    { upsert: true, returnDocument: "after" },
  );

  await db.collection("refresh_tokens").deleteMany({ user_id: String(result._id) });
  console.log(JSON.stringify({
    ok: true,
    email,
    role: result.role,
    clientId: String(client._id),
    clientName: client.name ?? null,
    message: "Usuario creado/actualizado. La contraseña fue tomada de CLIENT_DEMO_PASSWORD.",
  }, null, 2));
}

main()
  .catch((error) => {
    console.error("No se pudo provisionar el usuario cliente demo:", error);
    process.exitCode = 1;
  })
  .finally(closeConnection);
