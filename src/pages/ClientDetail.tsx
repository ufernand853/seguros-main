import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import {
  type ClientSummary,
  type ContactInfo,
  type PolicySummary,
  type TaskItem,
  apiGetClientSummary,
} from "../services/api";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-UY");
}

function formatCurrency(value?: number | null) {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 });
}

export default function ClientDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { token } = useAuth();

  const [client, setClient] = useState<ClientSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !token) return;
    setIsLoading(true);
    setError(null);

    apiGetClientSummary(id, token)
      .then((data) => setClient(data))
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el cliente"))
      .finally(() => setIsLoading(false));
  }, [id, token]);

  const sortedTasks = useMemo(() => {
    return [...(client?.tasks ?? [])].sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
  }, [client?.tasks]);

  if (!id) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="text-center space-y-3">
          <p className="text-lg font-semibold text-slate-800">Cliente no especificado</p>
          <button
            type="button"
            onClick={() => navigate("/clientes")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-black text-white font-semibold"
          >
            Volver al listado
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</p>
          <h1 className="text-2xl font-bold text-slate-900">
            {client?.name ?? "Detalle de cliente"}
          </h1>
          <p className="text-sm text-slate-600">
            {client?.document ?? "Documento no disponible"} · {client?.city ?? "Ciudad sin especificar"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/clientes/nuevo")}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-800 hover:bg-slate-100 font-semibold"
          >
            Crear otro cliente
          </button>
          <button
            type="button"
            onClick={() => navigate("/clientes")}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-black text-white font-semibold"
          >
            Volver al listado
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        {isLoading ? (
          <div className="text-center text-slate-500 py-10">Cargando detalle del cliente…</div>
        ) : error ? (
          <div className="text-center text-red-600 py-10">{error}</div>
        ) : !client ? (
          <div className="text-center text-slate-500 py-10">
            No encontramos datos para este cliente.
          </div>
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-semibold text-slate-800">Resumen</h2>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <SummaryCard label="Documento" value={client.document ?? "Sin documento"} />
                <SummaryCard label="Ciudad" value={client.city ?? "No informada"} />
                <SummaryCard
                  label="Oportunidad"
                  value={client.opportunity?.stage ?? "Sin oportunidad activa"}
                  helper={
                    client.opportunity?.amount
                      ? `Monto: ${formatCurrency(client.opportunity.amount)}`
                      : undefined
                  }
                />
                <SummaryCard
                  label="Próxima renovación"
                  value={formatDate(client.renewal?.renewal_date)}
                  helper={client.renewal?.policy_number ? `Póliza ${client.renewal.policy_number}` : undefined}
                />
              </div>
            </section>

            <section>
              <SectionHeader title="Contactos" helper={`${client.contacts?.length ?? 0} contacto(s)`} />
              {client.contacts?.length ? (
                <ul className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {client.contacts.map((contact) => (
                    <ContactCard key={contact.id ?? contact.email ?? contact.name} contact={contact} />
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-500">No hay contactos cargados para este cliente.</p>
              )}
            </section>

            <section>
              <SectionHeader
                title="Pólizas asociadas"
                helper={`${client.policies?.length ?? 0} póliza(s)`}
              />
              {client.policies?.length ? (
                <div className="mt-3 overflow-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-left px-3 py-2 font-semibold text-slate-700">Producto</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-700">Aseguradora</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-700">Estado</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-700">Prima</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-700">Próxima renovación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {client.policies.map((policy) => (
                        <PolicyRow key={policy.id} policy={policy} />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  Este cliente aún no tiene pólizas asociadas. Puedes iniciar un alta rápida desde la ficha integral.
                </p>
              )}
            </section>

            <section>
              <SectionHeader
                title="Tareas y seguimiento"
                helper={client.tasks?.length ? `${client.tasks.length} tarea(s)` : "Sin tareas registradas"}
              />
              {client.nextTask ? (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-amber-800">Próxima tarea</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-amber-900">{client.nextTask.title}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-white border border-amber-200 text-amber-800">
                      {client.nextTask.status ?? "pendiente"}
                    </span>
                  </div>
                  <div className="text-sm text-amber-800 mt-1">
                    Vence: {formatDate(client.nextTask.due_date)} · Responsable: {client.nextTask.owner_name ?? "No asignado"}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Sin tareas pendientes para este cliente.</p>
              )}

              {sortedTasks.length > 0 && (
                <ul className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sortedTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, helper }: { title: string; helper?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      {helper && <span className="text-sm text-slate-500">{helper}</span>}
    </div>
  );
}

function SummaryCard({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-800">{value}</div>
      {helper && <div className="text-xs text-slate-500 mt-1">{helper}</div>}
    </div>
  );
}

function ContactCard({ contact }: { contact: ContactInfo }) {
  return (
    <li className="rounded-xl border border-slate-200 px-4 py-3 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="font-semibold text-slate-800">{contact.name ?? "Contacto sin nombre"}</div>
      <div className="text-sm text-slate-600 mt-1">
        {contact.email ?? "Sin correo"} · {contact.phone ?? "Sin teléfono"}
      </div>
    </li>
  );
}

function PolicyRow({ policy }: { policy: PolicySummary }) {
  return (
    <tr className="hover:bg-slate-50">
      <td className="px-3 py-2 text-slate-800">{policy.type ?? "—"}</td>
      <td className="px-3 py-2 text-slate-700">{policy.insurer ?? policy.insurer_id ?? "—"}</td>
      <td className="px-3 py-2">
        <span className="inline-flex items-center px-2 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
          {policy.status ?? "Sin estado"}
        </span>
      </td>
      <td className="px-3 py-2 text-slate-800">{formatCurrency(policy.premium)}</td>
      <td className="px-3 py-2 text-slate-800">{formatDate(policy.next_renewal)}</td>
    </tr>
  );
}

function TaskCard({ task }: { task: TaskItem }) {
  return (
    <li className="rounded-xl border border-slate-200 px-4 py-3 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-semibold text-slate-800">{task.title}</div>
          <div className="text-sm text-slate-600">
            Vence {formatDate(task.due_date)} · {task.owner_name ?? "Sin responsable"}
          </div>
        </div>
        <span className="inline-flex items-center px-2 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
          {task.status ?? "pendiente"}
        </span>
      </div>
    </li>
  );
}
