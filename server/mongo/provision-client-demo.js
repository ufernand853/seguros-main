import "dotenv/config";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { closeConnection, connectToDatabase } from "../db.js";

const email = (process.env.CLIENT_DEMO_EMAIL || "demo@linsse.com").trim().toLowerCase();
const password = process.env.CLIENT_DEMO_PASSWORD || "DemoCliente2026!";

function hashPassword(plainText) {
  const salt = randomBytes(16).toString("hex");
  const hashed = scryptSync(plainText, salt, 64).toString("hex");
  return `${salt}:${hashed}`;
}

async function main() {
  const db = await connectToDatabase();
  const now = new Date();
  const result = await db.collection("users").findOneAndUpdate(
    { email },
    {
      $set: {
        name: "Usuario Demo",
        email,
        password_hash: hashPassword(password),
        role: "ejecutivo",
        status: "Activo",
        updated_at: now,
      },
      $unset: { client_id: "", tenant_id: "" },
      $setOnInsert: { _id: randomUUID(), created_at: now },
    },
    { upsert: true, returnDocument: "after" },
  );

  await db.collection("refresh_tokens").deleteMany({ user_id: String(result._id) });
  console.log(JSON.stringify({
    ok: true,
    email,
    role: result.role,
    access: "panel general demo",
    message: "Usuario creado/actualizado con acceso a todas las funcionalidades demo.",
  }, null, 2));
}

main()
  .catch((error) => {
    console.error("No se pudo provisionar el usuario demo:", error);
    process.exitCode = 1;
  })
  .finally(closeConnection);
