import { randomUUID } from "node:crypto";

export const users = [
  {
    id: "u1",
    email: "ejecutivo@segurosdemo.com",
    password: "Demo1234",
    name: "Ejecutivo Comercial",
    role: "ejecutivo",
  },
  {
    id: "u2",
    email: "operaciones@segurosdemo.com",
    password: "Operaciones!",
    name: "Operador Backoffice",
    role: "operaciones",
  },
];

export const clients = [
  {
    id: "c1",
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
        insurer: "Seguros Río de la Plata",
        status: "Vigente",
        premium: 3200,
        nextRenewal: "2026-02-10",
      },
    ],
  },
  {
    id: "c2",
    name: "Cliente Demo Dos SRL",
    document: "RUT 99.000.002-001",
    city: "Ciudad Sur",
    contacts: [
      { id: randomUUID(), name: "Lucía Rodríguez", email: "lucia@cliente2.com", phone: "+598 93 333 333" },
    ],
    policies: [
      {
        id: randomUUID(),
        type: "Hogar premium",
        insurer: "Protección Andina",
        status: "Pendiente de emisión",
        premium: 1200,
        nextRenewal: "2025-12-01",
      },
    ],
  },
];

export const pipeline = [
  {
    id: "p1",
    stage: "Descubrimiento",
    client: "Cliente Demo Uno S.A.",
    owner: "Ejecutivo Comercial",
    amount: 18000,
    probability: 0.25,
    updatedAt: "2025-11-01",
  },
  {
    id: "p2",
    stage: "Propuesta",
    client: "Cliente Demo Dos SRL",
    owner: "Ejecutivo Comercial",
    amount: 9500,
    probability: 0.45,
    updatedAt: "2025-10-28",
  },
];

export const tasks = [
  {
    id: "t1",
    title: "Enviar cotización flota",
    dueDate: "2025-11-21",
    owner: "Ejecutivo Comercial",
    status: "pendiente",
  },
  {
    id: "t2",
    title: "Confirmar inspección hogar",
    dueDate: "2025-11-23",
    owner: "Operador Backoffice",
    status: "en curso",
  },
];

export const renewals = [
  {
    id: "r1",
    policy: "Automotor flota",
    client: "Cliente Demo Uno S.A.",
    responsible: "Ejecutivo Comercial",
    nextReminder: "2025-11-22",
    status: "pendiente",
  },
  {
    id: "r2",
    policy: "Hogar premium",
    client: "Cliente Demo Dos SRL",
    responsible: "Operador Backoffice",
    nextReminder: "2025-11-24",
    status: "recordatorio enviado",
  },
];

export function mapClientSummary(id) {
  const client = clients.find((c) => c.id === id);
  if (!client) return null;
  const notes = [
    { id: randomUUID(), text: "Reunión de kickoff completada.", author: "Ejecutivo Comercial", createdAt: "2025-10-15" },
    { id: randomUUID(), text: "Solicitó actualización de suma asegurada.", author: "Operador Backoffice", createdAt: "2025-10-18" },
  ];
  const documents = [
    { id: randomUUID(), name: "Propuesta_comercial.pdf", type: "propuesta", uploadedBy: "Ejecutivo Comercial", size: "1.2 MB" },
    { id: randomUUID(), name: "Checklist_renovacion.xlsx", type: "checklist", uploadedBy: "Operador Backoffice", size: "520 KB" },
  ];
  return { ...client, notes, documents };
}
