import "dotenv/config";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { closeConnection, connectToDatabase } from "../db.js";

function hashPassword(plainText) {
  const salt = randomBytes(16).toString("hex");
  const hashed = scryptSync(plainText, salt, 64).toString("hex");
  return `${salt}:${hashed}`;
}

const adminName = process.env.SEED_ADMIN_NAME || "Administrador";
const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@seguros.local";
const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Cambiar123!";

const users = [
  {
    _id: randomUUID(),
    name: adminName,
    email: adminEmail.toLowerCase(),
    password_hash: hashPassword(adminPassword),
    role: "admin",
  },
];

const insurers = [];
const employees = [];
const clients = [];
const pipeline = [];
const tasks = [];
const renewals = [];
const claims = [];

async function seed() {
  const db = await connectToDatabase();

  await db.collection("users").deleteMany({});
  await db.collection("refresh_tokens").deleteMany({});
  await db.collection("clients").deleteMany({});
  await db.collection("pipeline").deleteMany({});
  await db.collection("tasks").deleteMany({});
  await db.collection("renewals").deleteMany({});
  await db.collection("claims").deleteMany({});
  await db.collection("insurers").deleteMany({});
  await db.collection("employees").deleteMany({});

  if (users.length) await db.collection("users").insertMany(users);
  if (insurers.length) await db.collection("insurers").insertMany(insurers);
  if (clients.length) await db.collection("clients").insertMany(clients);
  if (employees.length) await db.collection("employees").insertMany(employees);
  if (pipeline.length) await db.collection("pipeline").insertMany(pipeline);
  if (tasks.length) await db.collection("tasks").insertMany(tasks);
  if (renewals.length) await db.collection("renewals").insertMany(renewals);
  if (claims.length) await db.collection("claims").insertMany(claims);

  console.log("✅ Base de datos Mongo inicializada sin datos de demo");
}

seed()
  .catch((err) => {
    console.error("Error al sembrar Mongo", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeConnection();
  });
