const CLIENT_DATA = {
  nombre: "Lucía Fernández",
  documento: "CI 4.567.890-1",
  telefono: "+598 94 456 789",
  email: "lucia.fernandez@email.com",
  direccion: "Misiones 1234, Apto 301",
  ciudad: "Montevideo",
  titular: "Lucía Fernández",
  vigencia: "Desde 15/01/2021",
};

const INSURANCE_SUMMARY = [
  { nombre: "Garantía de Alquiler", compania: "Sura", estado: "Vigente", vigencia: "Hasta 15/01/2025" },
  { nombre: "Seguro de Auto", compania: "Porto", estado: "Vigente", vigencia: "Hasta 15/01/2025" },
  { nombre: "Seguro Viajero", compania: "Mapfre", estado: "En curso", vigencia: "Próximo viaje 20/07/2024" },
];

const ASSOCIATED_CLIENTS = [
  { relacion: "Titular", nombre: "Lucía Fernández", producto: "Garantía Alquiler" },
  { relacion: "Copropietario", nombre: "Andrés García", producto: "Seguro Auto" },
  { relacion: "Inquilino", nombre: "María Torres", producto: "Garantía Alquiler" },
];

const CLAIM_STAGES = [
  { etapa: "Ingreso", fecha: "2024-03-01", detalle: "Denuncia por choque leve en Bulevar Artigas" },
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

const TENANT_HISTORY = [
  { periodo: "2021-2022", inquilino: "Pablo Méndez", estado: "Finalizado sin reclamos" },
  { periodo: "2022-2023", inquilino: "Laura Cabrera", estado: "Finalizado con reintegro parcial" },
  { periodo: "2023-Actual", inquilino: "María Torres", estado: "En curso" },
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

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-800">Seguros activos del titular</h2>
          <p className="mt-1 text-sm text-slate-600">
            Seguimiento de cobertura total con detalle de compañía, estado y vigencia.
          </p>
          <ul className="mt-4 space-y-3">
            {INSURANCE_SUMMARY.map((item) => (
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
