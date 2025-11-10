import { FormEvent, useMemo, useState } from "react";

const CLIENT_DATA = {
  nombre: "Alicia Demo",
  documento: "CI 4.999.999-9",
  telefono: "+598 94 000 000",
  email: "alicia.demo@example.com",
  direccion: "Calle Imaginaria 1234, Apto 301",
  ciudad: "Montevideo",
  titular: "Alicia Demo",
  vigencia: "Desde 15/01/2021",
};

const INITIAL_INSURANCE_SUMMARY = [
  { nombre: "Garantía de Alquiler", compania: "Sura", estado: "Vigente", vigencia: "Hasta 15/01/2025" },
  { nombre: "Seguro de Auto", compania: "Porto", estado: "Vigente", vigencia: "Hasta 15/01/2025" },
  { nombre: "Seguro Viajero", compania: "Mapfre", estado: "En curso", vigencia: "Próximo viaje 20/07/2024" },
];

const ASSOCIATED_CLIENTS = [
  { relacion: "Titular", nombre: "Alicia Demo", producto: "Garantía Alquiler" },
  { relacion: "Copropietario", nombre: "Bruno Demo", producto: "Seguro Auto" },
  { relacion: "Inquilino", nombre: "Carla Demo", producto: "Garantía Alquiler" },
];

const CLAIM_STAGES = [
  { etapa: "Ingreso", fecha: "2024-03-01", detalle: "Denuncia por choque leve en Av. Demo" },
  { etapa: "Inspección", fecha: "2024-03-03", detalle: "Inspección fotográfica enviada a la aseguradora" },
  { etapa: "Carta de cobertura", fecha: "2024-03-05", detalle: "Carta emitida y enviada al cliente" },
  { etapa: "Pago", fecha: "2024-03-12", detalle: "Pago de reparación autorizado" },
];

const CLAIM_CATEGORIES = [
  "Automotor",
  "Hogar",
  "Vida",
  "Accidentes personales",
  "Responsabilidad civil",
];

const INITIAL_CLAIM_REGISTRATIONS = [
  {
    poliza: "Seguro de Auto",
    fecha: "2024-03-10",
    categoria: "Automotor",
    descripcion: "Seguimiento de siniestro existente por choque leve",
    estado: "En curso",
  },
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

const TENANT_HISTORY = [
  { periodo: "2021-2022", inquilino: "Diego Demo", estado: "Finalizado sin reclamos" },
  { periodo: "2022-2023", inquilino: "Elena Demo", estado: "Finalizado con reintegro parcial" },
  { periodo: "2023-Actual", inquilino: "Carla Demo", estado: "En curso" },
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

export default function Client360View() {
  const [insuranceSummary, setInsuranceSummary] = useState(INITIAL_INSURANCE_SUMMARY);
  const [policyForm, setPolicyForm] = useState({
    nombre: "",
    compania: "",
    inicio: "",
    fin: "",
  });
  const [policySuccess, setPolicySuccess] = useState("");

  const [claimForm, setClaimForm] = useState({
    poliza: INITIAL_INSURANCE_SUMMARY[0]?.nombre ?? "",
    categoria: CLAIM_CATEGORIES[0],
    fecha: "",
    descripcion: "",
  });
  const [claimRegistrations, setClaimRegistrations] = useState(INITIAL_CLAIM_REGISTRATIONS);
  const [claimSuccess, setClaimSuccess] = useState("");

  const availablePoliciesForClaims = useMemo(
    () =>
      insuranceSummary.map((policy) => ({
        nombre: policy.nombre,
        etiqueta: `${policy.nombre} · ${policy.compania}`,
      })),
    [insuranceSummary],
  );

  const handlePolicySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!policyForm.nombre || !policyForm.compania || !policyForm.inicio || !policyForm.fin) {
      setPolicySuccess("Completa los datos obligatorios para generar la póliza.");
      return;
    }

    setInsuranceSummary((current) => [
      ...current,
      {
        nombre: policyForm.nombre,
        compania: policyForm.compania,
        estado: "En emisión",
        vigencia: `Desde ${policyForm.inicio} al ${policyForm.fin}`,
      },
    ]);

    setPolicySuccess(
      `Póliza "${policyForm.nombre}" preparada para emisión y vinculada al cliente. Comparte la constancia con ${policyForm.compania}.`,
    );

    setPolicyForm({ nombre: "", compania: "", inicio: "", fin: "" });
  };

  const handleClaimSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!claimForm.poliza || !claimForm.fecha || !claimForm.descripcion) {
      setClaimSuccess("Completa los datos obligatorios para registrar el siniestro.");
      return;
    }

    setClaimRegistrations((current) => [
      {
        poliza: claimForm.poliza,
        fecha: claimForm.fecha,
        categoria: claimForm.categoria,
        descripcion: claimForm.descripcion,
        estado: "Denuncia ingresada",
      },
      ...current,
    ]);

    setClaimSuccess(
      `Siniestro cargado para la póliza ${claimForm.poliza}. Inicia seguimiento con la aseguradora (${claimForm.categoria}).`,
    );

    setClaimForm((current) => ({
      poliza: current.poliza,
      categoria: current.categoria,
      fecha: "",
      descripcion: "",
    }));
  };

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
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(CLIENT_DATA).map(([key, value]) => (
            <div key={key} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {key.replace(/([A-Z])/g, " $1").toUpperCase()}
              </div>
              <div className="mt-1 text-sm text-slate-800">{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-800">Alta rápida de pólizas</h2>
          <p className="mt-1 text-sm text-slate-600">
            Usa este formulario de demostración para simular cómo capturamos los datos clave antes de enviar la solicitud a la
            aseguradora.
          </p>
          <form className="mt-4 space-y-4" onSubmit={handlePolicySubmit}>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="policy-name">
                Producto asegurado
              </label>
              <input
                id="policy-name"
                type="text"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                placeholder="Ej: Seguro integral de comercio"
                value={policyForm.nombre}
                onChange={(event) => setPolicyForm((current) => ({ ...current, nombre: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="policy-company">
                Compañía
              </label>
              <input
                id="policy-company"
                type="text"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                placeholder="Ej: Sura, Mapfre, Porto"
                value={policyForm.compania}
                onChange={(event) => setPolicyForm((current) => ({ ...current, compania: event.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="policy-start">
                  Vigencia desde
                </label>
                <input
                  id="policy-start"
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                  value={policyForm.inicio}
                  onChange={(event) => setPolicyForm((current) => ({ ...current, inicio: event.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="policy-end">
                  Vigencia hasta
                </label>
                <input
                  id="policy-end"
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                  value={policyForm.fin}
                  onChange={(event) => setPolicyForm((current) => ({ ...current, fin: event.target.value }))}
                />
              </div>
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              Generar póliza demo
            </button>
            {policySuccess && (
              <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                {policySuccess}
              </p>
            )}
          </form>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-800">Registro express de siniestros</h2>
          <p className="mt-1 text-sm text-slate-600">
            Registra incidentes y deja asentada la denuncia para iniciar el circuito de seguimiento interno.
          </p>
          <form className="mt-4 space-y-4" onSubmit={handleClaimSubmit}>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="claim-policy">
                Póliza asociada
              </label>
              <select
                id="claim-policy"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                value={claimForm.poliza}
                onChange={(event) => setClaimForm((current) => ({ ...current, poliza: event.target.value }))}
              >
                <option value="">Selecciona una póliza</option>
                {availablePoliciesForClaims.map((policy) => (
                  <option key={policy.nombre} value={policy.nombre}>
                    {policy.etiqueta}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="claim-category">
                  Tipo de siniestro
                </label>
                <select
                  id="claim-category"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                  value={claimForm.categoria}
                  onChange={(event) => setClaimForm((current) => ({ ...current, categoria: event.target.value }))}
                >
                  {CLAIM_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="claim-date">
                  Fecha del evento
                </label>
                <input
                  id="claim-date"
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                  value={claimForm.fecha}
                  onChange={(event) => setClaimForm((current) => ({ ...current, fecha: event.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="claim-description">
                Descripción breve
              </label>
              <textarea
                id="claim-description"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                rows={3}
                placeholder="Ej: Choque con tercero en Av. Italia, sin lesionados"
                value={claimForm.descripcion}
                onChange={(event) => setClaimForm((current) => ({ ...current, descripcion: event.target.value }))}
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
            >
              Registrar siniestro demo
            </button>
            {claimSuccess && (
              <p className="text-sm text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2">{claimSuccess}</p>
            )}
          </form>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-800">Seguros activos del titular</h2>
          <p className="mt-1 text-sm text-slate-600">
            Seguimiento de cobertura total con detalle de compañía, estado y vigencia.
          </p>
          <ul className="mt-4 space-y-3">
            {insuranceSummary.map((item) => (
              <li key={item.nombre} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-slate-100 px-4 py-3">
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
        </div>
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-slate-800">Clientes asociados por producto</h3>
          <ul className="mt-4 space-y-3">
            {ASSOCIATED_CLIENTS.map((item) => (
              <li key={`${item.relacion}-${item.nombre}`} className="rounded-xl border border-slate-100 px-4 py-3 bg-slate-50">
                <div className="text-xs font-semibold text-slate-500">{item.relacion}</div>
                <div className="text-sm text-slate-800">{item.nombre}</div>
                <div className="text-xs text-slate-500">Producto: {item.producto}</div>
              </li>
            ))}
          </ul>
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
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-800">Históricos de inquilinos</h2>
          <table className="mt-4 w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 text-left">Período</th>
                <th className="py-2 text-left">Inquilino</th>
                <th className="py-2 text-left">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {TENANT_HISTORY.map((row) => (
                <tr key={`${row.periodo}-${row.inquilino}`}>
                  <td className="py-2 text-slate-700">{row.periodo}</td>
                  <td className="py-2 text-slate-700">{row.inquilino}</td>
                  <td className="py-2 text-slate-600">{row.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
