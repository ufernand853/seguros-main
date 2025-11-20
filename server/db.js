import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/seguros";
const dbName = process.env.MONGODB_DB || "seguros";

let client;
let database;

export async function connectToDatabase() {
  if (database) return database;

  client = new MongoClient(uri, {
    maxIdleTimeMS: 30_000,
  });

  await client.connect();
  database = client.db(dbName);
  console.log(`[db] conectado a ${uri}/${dbName}`);
  return database;
}

export function getDb() {
  if (!database) {
    throw new Error("La base de datos no está inicializada. Llama a connectToDatabase() primero.");
  }
  return database;
}

export async function closeConnection() {
  if (client) {
    await client.close();
    client = undefined;
    database = undefined;
  }
}
