import { ReactNode, useEffect, useMemo, useState } from "react";

type Contact = {
  nombre: string;
  email: string;
  telefono: string;
};

type Carrier = {
  id: string;
  nombre: string;
  pais: string;
  ramos: string[];
  estado: "Activa" | "En revisión" | "Suspendida";
  calificacion: number;
  primasAnuales: number;
  polizasVigentes: number;
  siniestralidad: number;
  contacto: Contact;
  acuerdosClaves: string[];
  ultimaActualizacion: string;
  notas?: string;
};

const CARRIERS: Carrier[] = [
  {
    id: "CAR-001",
    nombre: "Seguros Río de la Plata",
    pais: "Uruguay",
    ramos: ["Automotor", "Hogar", "Vida"],
    estado: "Activa",
    calificacion: 4.6,
    primasAnuales: 2450000,
    polizasVigentes: 1260,
    siniestralidad: 42,
    contacto: {
      nombre: "Laura Martínez",
      email: "lmartinez@rioplata.com",
      telefono: "+598 92 455 110",
    },
    acuerdosClaves: [
      "Descuento flotas corporativas",
      "Cobertura hogares premium",
    ],
    ultimaActualizacion: "2024-03-15",
    notas: "Requiere reporte trimestral de producción.",
  },
  {
    id: "CAR-002",
    nombre: "Andes Reaseguros",
    pais: "Chile",
    ramos: ["Caución", "Ingeniería"],
    estado: "En revisión",
    calificacion: 4.1,
    primasAnuales: 1875000,
    polizasVigentes: 720,
    siniestralidad: 36,
    contacto: {
      nombre: "Patricio González",
      email: "pgonzalez@andesre.com",
      telefono: "+56 9 3456 2100",
    },
    acuerdosClaves: [
      "Capacidad ampliada para cauciones",
      "Inspección técnica incluida",
    ],
    ultimaActualizacion: "2024-02-28",
  },
  {
    id: "CAR-003",
    nombre: "Atlántida Salud",
    pais: "Argentina",
    ramos: ["Salud"],
    estado: "Activa",
    calificacion: 4.8,
    primasAnuales: 3280000,
    polizasVigentes: 1980,
    siniestralidad: 31,
    contacto: {
      nombre: "Cecilia Robledo",
      email: "crobledo@atlantidasalud.com",
      telefono: "+54 9 11 3880 2201",
    },
    acuerdosClaves: [
      "Planes corporativos con upgrade dental",
      "Bonificación por baja siniestralidad",
    ],
    ultimaActualizacion: "2024-04-07",
    notas: "Solicitar actualización de cuadros médicos 2024.",
  },
  {
    id: "CAR-004",
    nombre: "Protec Industrial",
    pais: "Brasil",
    ramos: ["Riesgos industriales", "Responsabilidad civil"],
    estado: "Suspendida",
    calificacion: 3.2,
    primasAnuales: 960000,
    polizasVigentes: 310,
    siniestralidad: 58,
    contacto: {
      nombre: "Rafael Souza",
      email: "rsouza@protecbiz.com",
      telefono: "+55 21 99540 8877",
    },
    acuerdosClaves: [
      "Coberturas para construcción con franquicia",
      "Asistencia ambiental 24/7",
    ],
    ultimaActualizacion: "2024-01-19",
    notas: "Suspendida temporalmente por auditoría de compliance.",
  },
  {
    id: "CAR-005",
    nombre: "Mutual del Litoral",
    pais: "Uruguay",
    ramos: ["Vida", "Ahorro"],
    estado: "Activa",
    calificacion: 4.3,
    primasAnuales: 1520000,
    polizasVigentes: 890,
    siniestralidad: 28,
    contacto: {
      nombre: "Gonzalo Cabrera",
      email: "gcabrera@mutuallitoral.com",
      telefono: "+598 95 887 432",
    },
    acuerdosClaves: [
      "Campaña educativa para productores",
      "Bonificación de comisiones por metas trimestrales",
    ],
    ultimaActualizacion: "2024-03-02",
  },
  {
    id: "CAR-006",
    nombre: "Latam Seguros Generales",
    pais: "Perú",
    ramos: ["Automotor", "PYMES", "Transporte"],
    estado: "En revisión",
    calificacion: 3.9,
    primasAnuales: 2040000,
    polizasVigentes: 1045,
    siniestralidad: 47,
    contacto: {
      nombre: "María Fernanda Salas",
      email: "mfsalas@latamgenerales.com",
      telefono: "+51 987 665 432",
    },
    acuerdosClaves: [
      "Cobertura transporte internacional",
      "Programa de telemetría para flotas",
    ],
    ultimaActualizacion: "2024-03-27",
  },
];

const ESTADOS: Carrier["estado"][] = ["Activa", "En revisión", "Suspendida"];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-UY", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

const formatDate = (isoDate: string) =>
  new Intl.DateTimeFormat("es-UY", { dateStyle: "medium" }).format(new Date(isoDate));

export default function InsuranceCarriersMaintenance() {
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState<string>("todos");
  const [ramo, setRamo] = useState<string>("todos");
  const [selectedId, setSelectedId] = useState<string>(CARRIERS[0]?.id ?? "");

  const allRamos = useMemo(() => {
    const values = new Set<string>();
    CARRIERS.forEach((carrier) => carrier.ramos.forEach((item) => values.add(item)));
    return Array.from(values).sort((a, b) => a.localeCompare(b, "es"));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return CARRIERS.filter((carrier) => {
      if (estado !== "todos" && carrier.estado !== estado) return false;
      if (ramo !== "todos" && !carrier.ramos.includes(ramo)) return false;
      if (!q) return true;
      return (
        carrier.nombre.toLowerCase().includes(q) ||
        carrier.pais.toLowerCase().includes(q) ||
        carrier.contacto.nombre.toLowerCase().includes(q)
      );
    }).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [estado, ramo, search]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId("");
      return;
    }

    const exists = filtered.some((item) => item.id === selectedId);
    if (!exists) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selectedCarrier = filtered.find((item) => item.id === selectedId) ?? filtered[0];

  const resumen = useMemo(() => {
    const totales = filtered.reduce(
      (acc, carrier) => {
        acc.polizas += carrier.polizasVigentes;
        acc.primas += carrier.primasAnuales;
        acc.siniestralidad += carrier.siniestralidad;
        acc.cantidad += 1;
        if (carrier.estado === "Activa") acc.activos += 1;
        if (carrier.estado === "En revisión") acc.revision += 1;
        if (carrier.estado === "Suspendida") acc.suspendidos += 1;
        return acc;
      },
      { cantidad: 0, polizas: 0, primas: 0, siniestralidad: 0, activos: 0, revision: 0, suspendidos: 0 }
    );

    return {
      ...totales,
      siniestralidadPromedio: totales.cantidad ? Math.round(totales.siniestralidad / totales.cantidad) : 0,
    };
  }, [filtered]);

  return (
    <div className="flex-1 flex flex-col gap-6">
      <header className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Catálogo de compañías</p>
            <h1 className="text-2xl font-bold text-slate-900">Mantenimiento de aseguradoras</h1>
            <p className="mt-2 text-slate-600 max-w-2xl">
              Administra la información clave de las compañías con las que operamos, identifica acuerdos vigentes y
              gestiona las relaciones comerciales para tu equipo.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-100"
          >
            <span className="text-lg">＋</span>
            Nueva aseguradora
          </button>
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ResumenCard title="Compañías activas" value={`${resumen.activos} / ${filtered.length}`} subtitle="Activas sobre las filtradas" />
          <ResumenCard title="Primas anuales" value={formatCurrency(resumen.primas)} subtitle="Total reportado" />
          <ResumenCard title="Pólizas vigentes" value={resumen.polizas.toLocaleString("es-UY")} subtitle="Portafolio asociado" />
          <ResumenCard title="Siniestralidad promedio" value={`${resumen.siniestralidadPromedio}%`} subtitle="Sobre las filtradas" />
        </dl>
      </header>

      <section className="flex-1 grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 flex flex-col min-h-0">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <label htmlFor="carrier-search" className="block text-sm font-semibold text-slate-700 mb-2">
                Buscar aseguradora
              </label>
              <input
                id="carrier-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nombre, país o responsable comercial"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label htmlFor="estado-filter" className="block text-sm font-semibold text-slate-700 mb-2">
                Estado
              </label>
              <select
                id="estado-filter"
                value={estado}
                onChange={(event) => setEstado(event.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="todos">Todos</option>
                {ESTADOS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ramo-filter" className="block text-sm font-semibold text-slate-700 mb-2">
                Ramo
              </label>
              <select
                id="ramo-filter"
                value={ramo}
                onChange={(event) => setRamo(event.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="todos">Todos</option>
                {allRamos.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 overflow-auto -mx-4 md:mx-0">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Aseguradora</th>
                  <th className="px-4 py-3">Ramos</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Calificación</th>
                  <th className="px-4 py-3">Primas</th>
                  <th className="px-4 py-3">Pólizas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
                {filtered.map((carrier) => (
                  <tr
                    key={carrier.id}
                    onClick={() => setSelectedId(carrier.id)}
                    className={`cursor-pointer transition-colors hover:bg-indigo-50 ${
                      carrier.id === selectedCarrier?.id ? "bg-indigo-50" : "bg-white"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{carrier.nombre}</div>
                      <div className="text-xs text-slate-500">{carrier.pais}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {carrier.ramos.map((item) => (
                          <span
                            key={item}
                            className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <EstadoPill value={carrier.estado} />
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{carrier.calificacion.toFixed(1)} / 5</td>
                    <td className="px-4 py-3">{formatCurrency(carrier.primasAnuales)}</td>
                    <td className="px-4 py-3">{carrier.polizasVigentes.toLocaleString("es-UY")}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                      No hay aseguradoras que coincidan con los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 flex flex-col min-h-0">
          <h2 className="text-lg font-semibold text-slate-900">Detalle de la aseguradora</h2>
          {selectedCarrier ? (
            <div className="mt-4 space-y-5 text-sm text-slate-700">
              <div>
                <div className="text-xl font-bold text-slate-900">{selectedCarrier.nombre}</div>
                <div className="text-xs uppercase tracking-wide text-slate-500">{selectedCarrier.id}</div>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedCarrier.ramos.map((ramoName) => (
                  <span
                    key={ramoName}
                    className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600"
                  >
                    {ramoName}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <DetailItem label="País" value={selectedCarrier.pais} />
                <DetailItem label="Estado" value={<EstadoPill value={selectedCarrier.estado} />} />
                <DetailItem label="Calificación" value={`${selectedCarrier.calificacion.toFixed(1)} / 5`} />
                <DetailItem label="Primas" value={formatCurrency(selectedCarrier.primasAnuales)} />
                <DetailItem label="Pólizas" value={selectedCarrier.polizasVigentes.toLocaleString("es-UY")} />
                <DetailItem label="Siniestralidad" value={`${selectedCarrier.siniestralidad}%`} />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900">Responsable comercial</h3>
                <p className="mt-1 text-slate-700">{selectedCarrier.contacto.nombre}</p>
                <p className="text-slate-500 text-xs">{selectedCarrier.contacto.email}</p>
                <p className="text-slate-500 text-xs">{selectedCarrier.contacto.telefono}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900">Acuerdos vigentes</h3>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  {selectedCarrier.acuerdosClaves.map((item) => (
                    <li key={item} className="text-slate-700">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {selectedCarrier.notas && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Notas internas</h3>
                  <p className="mt-1 text-slate-600 whitespace-pre-line">{selectedCarrier.notas}</p>
                </div>
              )}

              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-500">
                Última actualización: {formatDate(selectedCarrier.ultimaActualizacion)}
              </div>

              <button
                type="button"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                Editar información
              </button>
            </div>
          ) : (
            <div className="mt-8 text-sm text-slate-500">Selecciona una aseguradora para ver sus detalles.</div>
          )}
        </aside>
      </section>
    </div>
  );
}

type ResumenCardProps = {
  title: string;
  value: string;
  subtitle: string;
};

function ResumenCard({ title, value, subtitle }: ResumenCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</dt>
      <dd className="mt-2 text-2xl font-bold text-slate-900">{value}</dd>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

type EstadoPillProps = {
  value: Carrier["estado"];
};

function EstadoPill({ value }: EstadoPillProps) {
  const config: Record<Carrier["estado"], { bg: string; text: string }> = {
    Activa: { bg: "bg-emerald-100", text: "text-emerald-700" },
    "En revisión": { bg: "bg-amber-100", text: "text-amber-700" },
    Suspendida: { bg: "bg-rose-100", text: "text-rose-700" },
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${config[value].bg} ${config[value].text}`}
    >
      {value}
    </span>
  );
}

type DetailItemProps = {
  label: string;
  value: ReactNode;
};

function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

