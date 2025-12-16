import "dotenv/config";
import { randomUUID } from "node:crypto";
import { closeConnection, connectToDatabase } from "../db.js";

const userId = "b9c2e5c2-2e8b-4c7d-8b57-c5a5dc0ef501";

const insurers = [
  {
    _id: "CAR-001",
    name: "Seguros Río de la Plata",
    country: "Uruguay",
    lines: ["Automotor", "Hogar", "Vida"],
    status: "Activa",
    rating: 4.6,
    annual_premium: 2_450_000,
    active_policies: 1260,
    loss_ratio: 42,
    contact: {
      name: "Laura Martínez",
      email: "lmartinez@rioplata.com",
      phone: "+598 92 455 110",
    },
    key_deals: ["Descuento flotas corporativas", "Cobertura hogares premium"],
    last_review: new Date("2024-03-15"),
    notes: "Requiere reporte trimestral de producción.",
  },
  {
    _id: "CAR-002",
    name: "Andes Reaseguros",
    country: "Chile",
    lines: ["Caución", "Ingeniería"],
    status: "En revisión",
    rating: 4.1,
    annual_premium: 1_875_000,
    active_policies: 720,
    loss_ratio: 36,
    contact: {
      name: "Patricio González",
      email: "pgonzalez@andesre.com",
      phone: "+56 9 3456 2100",
    },
    key_deals: ["Capacidad ampliada para cauciones", "Inspección técnica incluida"],
    last_review: new Date("2024-02-28"),
  },
  {
    _id: "CAR-003",
    name: "Atlántida Salud",
    country: "Argentina",
    lines: ["Salud"],
    status: "Activa",
    rating: 4.8,
    annual_premium: 3_280_000,
    active_policies: 1980,
    loss_ratio: 31,
    contact: {
      name: "Cecilia Robledo",
      email: "crobledo@atlantidasalud.com",
      phone: "+54 9 11 3880 2201",
    },
    key_deals: ["Planes corporativos con upgrade dental", "Bonificación por baja siniestralidad"],
    last_review: new Date("2024-04-07"),
    notes: "Solicitar actualización de cuadros médicos 2024.",
  },
  {
    _id: "CAR-004",
    name: "Protec Industrial",
    country: "Brasil",
    lines: ["Riesgos industriales", "Responsabilidad civil"],
    status: "Suspendida",
    rating: 3.2,
    annual_premium: 960_000,
    active_policies: 310,
    loss_ratio: 58,
    contact: {
      name: "Rafael Souza",
      email: "rsouza@protecbiz.com",
      phone: "+55 21 99540 8877",
    },
    key_deals: ["Coberturas para construcción con franquicia", "Asistencia ambiental 24/7"],
    last_review: new Date("2024-01-19"),
    notes: "Suspendida temporalmente por auditoría de compliance.",
  },
  {
    _id: "CAR-005",
    name: "Mutual del Litoral",
    country: "Uruguay",
    lines: ["Vida", "Ahorro"],
    status: "Activa",
    rating: 4.3,
    annual_premium: 1_520_000,
    active_policies: 890,
    loss_ratio: 28,
    contact: {
      name: "Gonzalo Cabrera",
      email: "gcabrera@mutuallitoral.com",
      phone: "+598 95 887 432",
    },
    key_deals: ["Campaña educativa para productores", "Bonificación de comisiones por metas trimestrales"],
    last_review: new Date("2024-03-02"),
  },
  {
    _id: "CAR-006",
    name: "Latam Seguros Generales",
    country: "Perú",
    lines: ["Automotor", "PYMES", "Transporte"],
    status: "En revisión",
    rating: 3.9,
    annual_premium: 2_040_000,
    active_policies: 1045,
    loss_ratio: 47,
    contact: {
      name: "María Fernanda Salas",
      email: "mfsalas@latamgenerales.com",
      phone: "+51 987 665 432",
    },
    key_deals: ["Cobertura transporte internacional", "Programa de telemetría para flotas"],
    last_review: new Date("2024-03-27"),
  },
];

const employees = [
  {
    _id: "emp-ana",
    name: "Ana Torres",
    email: "ana.torres@seguros.test",
    role: "Operaciones",
    team: "Backoffice",
  },
  {
    _id: "emp-carlos",
    name: "Carlos Méndez",
    email: "carlos.mendez@seguros.test",
    role: "Ejecutivo Comercial",
    team: "Comercial",
  },
  {
    _id: "emp-isabel",
    name: "Isabel Romero",
    email: "isabel.romero@seguros.test",
    role: "Ejecutivo Comercial",
    team: "Comercial",
  },
  {
    _id: "emp-luis",
    name: "Luis Pereira",
    email: "luis.pereira@seguros.test",
    role: "Operaciones",
    team: "Backoffice",
  },
];

const clients = [
  {
    _id: "c1e81378-a53a-4c53-92c8-4e5f0c2d1e11",
    name: "Cliente Demo Uno S.A.",
    document: "RUT 99.000.001-001",
    city: "Ciudad Norte",
    contacts: [
      { id: randomUUID(), name: "María Gómez", email: "maria@cliente1.com", phone: "+598 98 111 111" },
      { id: randomUUID(), name: "Juan Pérez", email: "juan@cliente1.com", phone: "+598 92 222 222" },
    ],
    policies: [
      {
        id: randomUUID(),
        type: "Automotor flota",
        insurer_id: insurers[0]._id,
        status: "Vigente",
        premium: 3200,
        next_renewal: new Date("2026-02-10"),
      },
    ],
    created_at: new Date("2025-10-01"),
  },
  {
    _id: "b6b12c25-23bb-4473-9fdd-2e70c1a9ab22",
    name: "Cliente Demo Dos SRL",
    document: "RUT 99.000.002-001",
    city: "Ciudad Sur",
    contacts: [{ id: randomUUID(), name: "Lucía Rodríguez", email: "lucia@cliente2.com", phone: "+598 93 333 333" }],
    policies: [
      {
        id: randomUUID(),
        type: "Hogar premium",
        insurer_id: insurers[4]._id,
        status: "Pendiente de emisión",
        premium: 1200,
        next_renewal: new Date("2025-12-01"),
      },
    ],
    created_at: new Date("2025-10-02"),
  },
  {
    _id: "f6d0a07e-875d-4cd5-9a78-5325f5f9c833",
    name: "Cliente Demo Tres Coop.",
    document: "RUT 99.000.003-001",
    city: "Ciudad Este",
    contacts: [{ id: randomUUID(), name: "Carlos Méndez", email: "carlos@cliente3.com", phone: "+598 90 444 444" }],
    policies: [
      {
        id: randomUUID(),
        type: "Vida familiar",
        insurer_id: insurers[2]._id,
        status: "Vigente",
        premium: 460,
        next_renewal: new Date("2026-01-20"),
      },
    ],
    created_at: new Date("2025-10-03"),
  },
  {
    _id: "0d0f7c6d-2f62-4f9b-8d12-8f7a2f1783c4",
    name: "Cliente Demo Cuatro Ltda.",
    document: "RUT 99.000.004-001",
    city: "Ciudad Oeste",
    contacts: [{ id: randomUUID(), name: "Ana Torres", email: "ana@cliente4.com", phone: "+598 94 555 555" }],
    policies: [
      {
        id: randomUUID(),
        type: "Multirriesgo pyme",
        insurer_id: insurers[3]._id,
        status: "Vigente",
        premium: 3200,
        next_renewal: new Date("2026-03-30"),
      },
    ],
    created_at: new Date("2025-10-04"),
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
    owner_id: employees[1]._id,
    status: "pendiente",
    priority: "alta",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
  },
  {
    _id: "6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c9d",
    client_id: clients[0]._id,
    title: "Llamar para revisión hogar",
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24),
    owner_id: employees[3]._id,
    status: "pendiente",
    priority: "media",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 12),
  },
  {
    _id: "7b8c9d0e-1f2a-4b3c-9d4e-5f6a7b8c9d0e",
    client_id: clients[2]._id,
    title: "Agendar visita familiar",
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4),
    owner_id: employees[2]._id,
    status: "pendiente",
    priority: "media",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 6),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 6),
  },
  {
    _id: "8c9d0e1f-2a3b-4c5d-9e6f-7a8b9c0d1e2f",
    client_id: null,
    title: "Revisar pólizas corporativas",
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
    owner_id: employees[0]._id,
    status: "en_curso",
    priority: "alta",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 3),
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
  await db.collection("insurers").deleteMany({});
  await db.collection("employees").deleteMany({});

  await db.collection("users").insertOne(user);
  await db.collection("insurers").insertMany(insurers);
  await db.collection("clients").insertMany(clients);
  await db.collection("employees").insertMany(employees);
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
