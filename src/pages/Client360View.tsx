import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { apiGetClientSummary, type ClientSummary } from "../services/api";

const CLAIM_STAGES = [
  { etapa: "Ingreso", fecha: "2024-03-01", detalle: "Denuncia por choque leve en Av. Demo" },
  { etapa: "Inspección", fecha: "2024-03-03", detalle: "Inspección fotográfica enviada a la aseguradora" },
  { etapa: "Carta de cobertura", fecha: "2024-03-05", detalle: "Carta emitida y enviada al cliente" },
  { etapa: "Pago", fecha: "2024-03-12", detalle: "Pago de reparación autorizado" },
];

const RENEWAL_ALERTS = [
  { producto: "Garantía Alquiler", fecha: "2024-05-10", responsable: "Equipo Comercial" },
  { producto: "Seguro Auto", fecha: "2024-06-22", responsable: "Backoffice" },
  { producto: "Seguro Viajero", fecha: "2024-07-12", responsable: "Productor" },
];

const POLICY_MOVEMENTS = [
  { fecha: "2024-03-14", detalle: "Cambio de suma asegurada en Seguro Auto" },
  { fecha: "2024-02-20", detalle: "Actualización de datos bancarios para débito automático" },
  { fecha: "2024-01-15", detalle: "Renovación automática de Garantía de Alquiler" },
];

const DOUBLE_COVERAGE = [
  {
    vehiculo: "SUV - MAT 2323",
    coberturaPrincipal: "Seguro Auto Porto",
    coberturaTemporal: "Seguro Auto Sura (cobertura puente por siniestro)",
    notas: "Ambas vigentes por 15 días, verificar cancelación automática",
  },
];

const INSURANCE_TYPES = [
  "Agro",
  "Viajero",
  "Importación",
  "Fianza",
  "Vida Colectivo",
  "Salud Internacional",
];

const EMISSION_REQUIREMENTS = {
  previos: [
    "Formulario de solicitud firmado",
    "Documento del titular y co-titulares",
    "Informe de ingresos / balances",
  ],
  posteriores: [
    "Póliza emitida y firmada",
    "Constancia de envío a cliente",
    "Documentación bancaria actualizada",
  ],
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
          <ol className="mt-4 space-y-4">
            {CLAIM_STAGES.map((stage, index) => (
              <li key={stage.etapa} className="relative pl-6">
                {index !== CLAIM_STAGES.length - 1 && (
                  <span className="absolute left-2 top-6 bottom-[-1rem] w-px bg-emerald-200" aria-hidden />
                )}
                <span className="absolute left-0 top-1.5 inline-flex h-3 w-3 rounded-full bg-emerald-500" aria-hidden />
                <div className="text-sm font-semibold text-slate-900">{stage.etapa}</div>
                <div className="text-xs text-slate-500">{stage.fecha}</div>
                <div className="mt-1 text-sm text-slate-700">{stage.detalle}</div>
              </li>
            ))}
          </ol>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-800">Renovaciones y recordatorios</h2>
          <p className="mt-1 text-sm text-slate-600">
            Alertas configuradas por fecha para anticipar gestiones.
          </p>
          <ul className="mt-4 space-y-3">
            {RENEWAL_ALERTS.map((item) => (
              <li key={item.producto} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                <div>
                  <div className="font-semibold text-slate-900">{item.producto}</div>
                  <div className="text-xs text-slate-500">Responsable: {item.responsable}</div>
                </div>
                <div className="text-sm font-medium text-emerald-600">{item.fecha}</div>
              </li>
            ))}
          </ul>
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
          <ul className="mt-4 space-y-3">
            {POLICY_MOVEMENTS.map((movement) => (
              <li key={movement.detalle} className="rounded-xl border border-slate-100 px-4 py-3 bg-slate-50">
                <div className="text-xs font-semibold text-slate-500">{movement.fecha}</div>
                <div className="text-sm text-slate-800">{movement.detalle}</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-800">Coberturas especiales</h2>
          <p className="mt-1 text-sm text-slate-600">
            Controlamos duplicidades y particularidades del vehículo asegurado.
          </p>
          <ul className="mt-4 space-y-3">
            {DOUBLE_COVERAGE.map((item) => (
              <li key={item.vehiculo} className="rounded-xl border border-slate-100 px-4 py-3">
                <div className="text-sm font-semibold text-slate-900">{item.vehiculo}</div>
                <div className="text-xs text-slate-500">Principal: {item.coberturaPrincipal}</div>
                <div className="text-xs text-slate-500">Temporal: {item.coberturaTemporal}</div>
                <div className="mt-2 text-sm text-slate-700">{item.notas}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col">
          <h2 className="text-lg font-semibold text-slate-800">Tipos de seguros ofrecidos</h2>
          <p className="mt-1 text-sm text-slate-600">
            Catálogo preparado para cruzar oportunidades según rubro.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {INSURANCE_TYPES.map((type) => (
              <span key={type} className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                {type}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-slate-800">Emisión y documentación</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          {([
            { titulo: "Previo a la emisión", items: EMISSION_REQUIREMENTS.previos },
            { titulo: "Post emisión", items: EMISSION_REQUIREMENTS.posteriores },
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
      </section>
    </div>
  );
}
