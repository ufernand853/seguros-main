import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { apiGetClientSummary, type ClientSummary } from "../services/api";

type ClaimStage = { etapa: string; fecha: string; detalle: string };
type RenewalAlert = { producto: string; fecha: string; responsable: string };
type PolicyMovement = { fecha: string; detalle: string };
type DoubleCoverageItem = {
  vehiculo: string;
  coberturaPrincipal: string;
  coberturaTemporal: string;
  notas: string;
};

const ROLE_LABELS: Record<string, string> = {
  asegurado: "Asegurado",
  tomador: "Tomador",
  cesionario: "Cesionario",
};

export default function Client360View() {
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
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar la ficha del cliente"))
      .finally(() => setIsLoading(false));
  }, [id, token]);

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleDateString("es-UY");
  };

  const primaryContact = client?.contacts?.[0];
  const clientData = [
    { label: "Nombre", value: client?.name ?? "—" },
    { label: "Documento", value: client?.document ?? "—" },
    { label: "Teléfono", value: primaryContact?.phone ?? "Sin teléfono" },
    { label: "Email", value: primaryContact?.email ?? "Sin email" },
    { label: "Ciudad", value: client?.city ?? "—" },
    {
      label: "Próxima renovación",
      value: client?.renewal?.renewal_date ? formatDate(client.renewal.renewal_date) : "Sin renovación registrada",
    },
  ];

  const insuranceSummary = (client?.policies ?? []).map((policy) => ({
    nombre: policy.type ?? "Póliza sin tipo",
    compania: policy.insurer ?? policy.insurer_id ?? "Aseguradora por confirmar",
    estado: policy.status ?? "Sin estado",
    vigencia: policy.next_renewal ? `Renueva ${formatDate(policy.next_renewal)}` : "Sin fecha de renovación",
  }));

  const associatedClients = (client?.policies ?? []).map((policy) => ({
    relacion: policy.roles?.[0] ? ROLE_LABELS[policy.roles[0]] ?? policy.roles[0] : "Titular",
    nombre: client?.name ?? "—",
    producto: policy.type ?? "Póliza sin tipo",
  }));

  const claimRegistrations = [];
  const claimStages: ClaimStage[] = [];
  const renewalAlerts: RenewalAlert[] = client?.renewal
    ? [
        {
          producto: client.renewal.policy_number ?? "Renovación pendiente",
          fecha: formatDate(client.renewal.renewal_date),
          responsable: client.renewal.owner ?? "Sin responsable asignado",
        },
      ]
    : [];
  const policyMovements: PolicyMovement[] = [];
  const doubleCoverage: DoubleCoverageItem[] = [];
  const insuranceTypes = Array.from(
    new Set((client?.policies ?? []).map((policy) => policy.type).filter(Boolean)),
  ) as string[];
  const emissionRequirements = {
    previos: [] as string[],
    posteriores: [] as string[],
  };

  const actionCards = useMemo(
    () => [
      {
        title: "Dar de alta póliza para el cliente",
        description: "Deriva al flujo operativo para crear la póliza con datos reales y asignarla al cliente.",
        button: "Ir al alta de pólizas",
        onClick: () => navigate("/pipeline"),
        badge: "Producción",
      },
      {
        title: "Registrar siniestro",
        description: "Abre el formulario real de denuncias para vincular el evento al cliente y su póliza vigente.",
        button: "Ir al registro de siniestros",
        onClick: () => navigate("/siniestros/registro"),
        badge: "Siniestros",
      },
    ],
    [navigate],
  );

  if (!id) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="text-center space-y-3">
          <p className="text-lg font-semibold text-slate-800">Selecciona un cliente para ver su ficha integral</p>
          <button
            type="button"
            onClick={() => navigate("/clientes")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-black text-white font-semibold"
          >
            Ir al listado de clientes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-6">
      <header className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-slate-900">Ficha integral del cliente</h1>
        <p className="mt-2 text-slate-600 max-w-3xl">
          Visión 360° para mostrar al cliente cómo centralizamos datos, pólizas, siniestros y renovaciones.
          Incluye recordatorios clave y documentación necesaria para cada emisión.
        </p>
      </header>

      <section className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-slate-800">Datos del cliente</h2>
        {isLoading ? (
          <div className="mt-4 text-center text-slate-500">Cargando datos del cliente…</div>
        ) : error ? (
          <div className="mt-4 text-center text-red-600">{error}</div>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientData.map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</div>
                <div className="mt-1 text-sm text-slate-800">{item.value}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {actionCards.map((card) => (
          <div key={card.title} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {card.badge}
              </div>
              <h2 className="text-lg font-semibold text-slate-800">{card.title}</h2>
              <p className="text-sm text-slate-600">{card.description}</p>
            </div>
            <button
              type="button"
              onClick={card.onClick}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              {card.button}
            </button>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-800">Seguros activos del titular</h2>
          <p className="mt-1 text-sm text-slate-600">
            Seguimiento de cobertura total con detalle de compañía, estado y vigencia.
          </p>
          {insuranceSummary.length ? (
            <ul className="mt-4 space-y-3">
              {insuranceSummary.map((item) => (
                <li
                  key={`${item.nombre}-${item.compania}`}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-slate-100 px-4 py-3"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{item.nombre}</div>
                    <div className="text-sm text-slate-500">{item.compania}</div>
                  </div>
                  <div className="text-sm text-slate-600">
                    <span className="font-semibold">{item.estado}</span> · {item.vigencia}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No hay pólizas activas registradas para este cliente.</p>
          )}
        </div>
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-slate-800">Clientes asociados por producto</h3>
          {associatedClients.length ? (
            <ul className="mt-4 space-y-3">
              {associatedClients.map((item) => (
                <li key={`${item.relacion}-${item.producto}`} className="rounded-xl border border-slate-100 px-4 py-3 bg-slate-50">
                  <div className="text-xs font-semibold text-slate-500">{item.relacion}</div>
                  <div className="text-sm text-slate-800">{item.nombre}</div>
                  <div className="text-xs text-slate-500">Producto: {item.producto}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Sin asociaciones registradas para este cliente.</p>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-800">Etapas del siniestro activo</h2>
          <p className="mt-1 text-sm text-slate-600">
            Control de hitos clave según el ramo del seguro.
          </p>
          {claimStages.length ? (
            <ol className="mt-4 space-y-4">
              {claimStages.map((stage, index) => (
                <li key={`${stage.etapa}-${stage.fecha}-${index}`} className="relative pl-6">
                  {index !== claimStages.length - 1 && (
                    <span className="absolute left-2 top-6 bottom-[-1rem] w-px bg-emerald-200" aria-hidden />
                  )}
                  <span className="absolute left-0 top-1.5 inline-flex h-3 w-3 rounded-full bg-emerald-500" aria-hidden />
                  <div className="text-sm font-semibold text-slate-900">{stage.etapa}</div>
                  <div className="text-xs text-slate-500">{stage.fecha}</div>
                  <div className="mt-1 text-sm text-slate-700">{stage.detalle}</div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No hay etapas de siniestro cargadas para este cliente.</p>
          )}
        </div>

        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-800">Renovaciones y recordatorios</h2>
          <p className="mt-1 text-sm text-slate-600">
            Alertas configuradas por fecha para anticipar gestiones.
          </p>
          {renewalAlerts.length ? (
            <ul className="mt-4 space-y-3">
              {renewalAlerts.map((item) => (
                <li key={item.producto} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                  <div>
                    <div className="font-semibold text-slate-900">{item.producto}</div>
                    <div className="text-xs text-slate-500">Responsable: {item.responsable}</div>
                  </div>
                  <div className="text-sm font-medium text-emerald-600">{item.fecha}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No hay recordatorios de renovación cargados.</p>
          )}
        </div>
      </section>

      <section className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-slate-800">Siniestros registrados recientemente</h2>
        <p className="mt-1 text-sm text-slate-600">
          Mantén la trazabilidad de cada denuncia y comparte avances con el cliente desde esta misma vista integral.
        </p>
        {claimRegistrations.length ? (
          <ul className="mt-4 space-y-3">
            {claimRegistrations.map((claim, index) => (
              <li key={`${claim.poliza}-${claim.fecha}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{claim.poliza}</div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">{claim.categoria}</div>
                  </div>
                  <div className="text-xs font-medium text-emerald-700">{claim.estado}</div>
                </div>
                <div className="mt-2 text-xs text-slate-500">Registrado el {claim.fecha}</div>
                <p className="mt-2 text-sm text-slate-700 leading-relaxed">{claim.descripcion}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Este cliente no tiene siniestros registrados todavía.</p>
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-800">Movimientos recientes en pólizas</h2>
          {policyMovements.length ? (
            <ul className="mt-4 space-y-3">
              {policyMovements.map((movement) => (
                <li key={`${movement.detalle}-${movement.fecha}`} className="rounded-xl border border-slate-100 px-4 py-3 bg-slate-50">
                  <div className="text-xs font-semibold text-slate-500">{movement.fecha}</div>
                  <div className="text-sm text-slate-800">{movement.detalle}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No hay movimientos recientes registrados.</p>
          )}
        </div>

        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-800">Coberturas especiales</h2>
          <p className="mt-1 text-sm text-slate-600">
            Controlamos duplicidades y particularidades del vehículo asegurado.
          </p>
          {doubleCoverage.length ? (
            <ul className="mt-4 space-y-3">
              {doubleCoverage.map((item) => (
                <li key={`${item.vehiculo}-${item.coberturaPrincipal}`} className="rounded-xl border border-slate-100 px-4 py-3">
                  <div className="text-sm font-semibold text-slate-900">{item.vehiculo}</div>
                  <div className="text-xs text-slate-500">Principal: {item.coberturaPrincipal}</div>
                  <div className="text-xs text-slate-500">Temporal: {item.coberturaTemporal}</div>
                  <div className="mt-2 text-sm text-slate-700">{item.notas}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No hay coberturas especiales registradas.</p>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col">
          <h2 className="text-lg font-semibold text-slate-800">Tipos de seguros ofrecidos</h2>
          <p className="mt-1 text-sm text-slate-600">
            Catálogo preparado para cruzar oportunidades según rubro.
          </p>
          {insuranceTypes.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {insuranceTypes.map((type) => (
                <span key={type} className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                  {type}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No hay tipos de seguros asociados al cliente.</p>
          )}
        </div>
      </section>

      <section className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-slate-800">Emisión y documentación</h2>
        {emissionRequirements.previos.length || emissionRequirements.posteriores.length ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            {([
              { titulo: "Previo a la emisión", items: emissionRequirements.previos },
              { titulo: "Post emisión", items: emissionRequirements.posteriores },
            ] as const).map((block) => (
              <div key={block.titulo} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-800">{block.titulo}</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-700 list-disc list-inside">
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No hay checklist de emisión disponible para este cliente.</p>
        )}
      </section>
    </div>
  );
}
