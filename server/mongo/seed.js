import "dotenv/config";
import { closeConnection, connectToDatabase } from "../db.js";

const userId = "b9c2e5c2-2e8b-4c7d-8b57-c5a5dc0ef501";
const clients = [
  {
    _id: "8a7b1b2f-1b8f-4a74-9d1d-6d6a3b7fa101",
    name: "María López",
    email: "maria.lopez@example.com",
    phone: "+34 600 123 456",
    status: "activa",
    premium: 1250.5,
    policy_type: "Hogar",
    policy_number: "HOG-1022",
    renewal_date: new Date("2025-12-01"),
    last_contact: new Date("2025-10-05"),
    risk_level: "medio",
    created_at: new Date("2025-10-01"),
  },
  {
    _id: "f3c3c5a1-2c1d-4d6d-9f9f-2e5c5e4d7202",
    name: "Jorge Ramírez",
    email: "jorge.ramirez@example.com",
    phone: "+34 600 222 777",
    status: "en_riesgo",
    premium: 850.0,
    policy_type: "Auto",
    policy_number: "AUT-2311",
    renewal_date: new Date("2025-11-15"),
    last_contact: new Date("2025-10-08"),
    risk_level: "alto",
    created_at: new Date("2025-10-02"),
  },
  {
    _id: "d1a1e3b4-0d0e-4c0b-b2c2-6a7f8d9e3303",
    name: "Lucía Soto",
    email: "lucia.soto@example.com",
    phone: "+34 611 888 900",
    status: "nueva",
    premium: 460.0,
    policy_type: "Vida",
    policy_number: "VID-9812",
    renewal_date: new Date("2026-01-20"),
    last_contact: new Date("2025-10-10"),
    risk_level: "bajo",
    created_at: new Date("2025-10-04"),
  },
  {
    _id: "a4d5f6c7-8e9f-4a1b-9c2d-5e6f7a8b9404",
    name: "Seguros Rivera S.L.",
    email: "contacto@rivera.example.com",
    phone: "+34 699 555 121",
    status: "activa",
    premium: 3250.0,
    policy_type: "Empresa",
    policy_number: "EMP-4432",
    renewal_date: new Date("2026-03-30"),
    last_contact: new Date("2025-10-09"),
    risk_level: "medio",
    created_at: new Date("2025-10-03"),
  },
];

const pipeline = [
  {
    _id: "2f6e6a0b-dfbf-4ad2-9c35-2b8ab1449aa1",
    client_id: clients[2]._id,
    stage: "Descubrimiento",
    opportunity: "Seguro de vida familiar",
    probability: 35.0,
    amount: 460.0,
    owner: "Isabel",
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
  },
  {
    _id: "7c3a9a5a-2a1f-4e8a-a1d7-6b9a4c2c8d12",
    client_id: clients[1]._id,
    stage: "Negociación",
    opportunity: "Renovación flota autos",
    probability: 60.0,
    amount: 1400.0,
    owner: "Carlos",
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
  {
    _id: "ae6f2e91-3c2b-4e6f-8a8c-5d6e7f809a11",
    client_id: clients[3]._id,
    stage: "Propuesta",
    opportunity: "Paquete multirriesgo pyme",
    probability: 75.0,
    amount: 3200.0,
    owner: "Ana",
    updated_at: new Date(),
  },
  {
    _id: "e5f7d8c9-a1b2-4c3d-9e4f-5a6b7c8d9e10",
    client_id: clients[0]._id,
    stage: "Cierre",
    opportunity: "Ampliación cobertura hogar",
    probability: 85.0,
    amount: 980.0,
    owner: "Luis",
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
  },
];

const tasks = [
  {
    _id: "5d5e6f7a-8b9c-4d3e-9f0a-1b2c3d4e5f60",
    client_id: clients[1]._id,
    title: "Enviar propuesta de auto",
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
    owner: "Carlos",
    status: "pendiente",
    priority: "alta",
  },
  {
    _id: "6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c9d",
    client_id: clients[0]._id,
    title: "Llamar para revisión hogar",
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24),
    owner: "Luis",
    status: "pendiente",
    priority: "media",
  },
  {
    _id: "7b8c9d0e-1f2a-4b3c-9d4e-5f6a7b8c9d0e",
    client_id: clients[2]._id,
    title: "Agendar visita familiar",
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4),
    owner: "Isabel",
    status: "pendiente",
    priority: "media",
  },
  {
    _id: "8c9d0e1f-2a3b-4c5d-9e6f-7a8b9c0d1e2f",
    client_id: null,
    title: "Revisar pólizas corporativas",
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
    owner: "Ana",
    status: "en_progreso",
    priority: "alta",
  },
];

const renewals = [
  {
    _id: "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    client_id: clients[0]._id,
    policy_number: "HOG-1022",
    renewal_date: new Date("2025-12-01"),
    premium: 1250.5,
    status: "a_tiempo",
    owner: "Luis",
  },
  {
    _id: "2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e",
    client_id: clients[1]._id,
    policy_number: "AUT-2311",
    renewal_date: new Date("2025-11-15"),
    premium: 850.0,
    status: "riesgo",
    owner: "Carlos",
  },
  {
    _id: "3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f",
    client_id: clients[2]._id,
    policy_number: "VID-9812",
    renewal_date: new Date("2026-01-20"),
    premium: 460.0,
    status: "a_tiempo",
    owner: "Isabel",
  },
  {
    _id: "4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a",
    client_id: clients[3]._id,
    policy_number: "EMP-4432",
    renewal_date: new Date("2026-03-30"),
    premium: 3250.0,
    status: "a_tiempo",
    owner: "Ana",
  },
];

const user = {
  _id: userId,
  name: "Admin Demo",
  email: "demo@seguros.test",
  password_hash:
    "6e3474554fa36f94f14c299eb4c14785:3461a159e8d1083e070ea1c8bb253723c3006fd2dfff3a80541244421a8ebdcc7f5963daf42fac03113853e055f75ddd8f6465a6412e46ad67108d5c26eaf697",
  role: "admin",
};

async function seed() {
  const db = await connectToDatabase();

  await db.collection("users").deleteMany({});
  await db.collection("refresh_tokens").deleteMany({});
  await db.collection("clients").deleteMany({});
  await db.collection("pipeline").deleteMany({});
  await db.collection("tasks").deleteMany({});
  await db.collection("renewals").deleteMany({});

  await db.collection("users").insertOne(user);
  await db.collection("clients").insertMany(clients);
  await db.collection("pipeline").insertMany(pipeline);
  await db.collection("tasks").insertMany(tasks);
  await db.collection("renewals").insertMany(renewals);

  console.log("✅ Base de datos Mongo sembrada con datos de demo");
}

seed()
  .catch((err) => {
    console.error("Error al sembrar Mongo", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeConnection();
  });
