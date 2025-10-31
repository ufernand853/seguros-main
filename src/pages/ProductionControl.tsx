import { useMemo, useState } from "react";

type CompanyBreakdown = {
  nombre: string;
  automotor: number;
  hogar: number;
  vida: number;
  caucion: number;
  bonificacion: string;
};

type Producer = {
  id: string;
  nombre: string;
  localidad: string;
  correo: string;
  celular: string;
  companias: CompanyBreakdown[];
  objetivoMensual: number;
  produccionMes: number;
  produccionAnual: number;
  seguimiento: string;
};

const PRODUCERS: Producer[] = [
  {
    id: "A",
    nombre: "Laura Gómez",
    localidad: "Montevideo",
    correo: "laura.gomez@brokeruy.com",
    celular: "+598 98 555 111",
    companias: [
      { nombre: "Sancor", automotor: 18500, hogar: 6400, vida: 2300, caucion: 0, bonificacion: "2,5%" },
      { nombre: "Sura", automotor: 9500, hogar: 4200, vida: 0, caucion: 5100, bonificacion: "1,5%" },
    ],
    objetivoMensual: 32000,
    produccionMes: 35800,
    produccionAnual: 91000,
    seguimiento: "Revisar cross selling vida con cartera PyME",
  },
  {
    id: "B",
    nombre: "Martín Pereira",
    localidad: "Paysandú",
    correo: "martin.pereira@brokeruy.com",
    celular: "+598 94 333 882",
    companias: [
      { nombre: "Federación Patronal", automotor: 12300, hogar: 2800, vida: 0, caucion: 2100, bonificacion: "3%" },
      { nombre: "Porto", automotor: 6800, hogar: 0, vida: 0, caucion: 4700, bonificacion: "2%" },
    ],
    objetivoMensual: 25000,
    produccionMes: 21900,
    produccionAnual: 65400,
    seguimiento: "Visitar cartera agro para renovar caución",
  },
  {
    id: "C",
    nombre: "Paula Méndez",
    localidad: "Maldonado",
    correo: "paula.mendez@brokeruy.com",
    celular: "+598 97 221 340",
    companias: [
      { nombre: "Mapfre", automotor: 7200, hogar: 5600, vida: 1800, caucion: 0, bonificacion: "2%" },
      { nombre: "BSE", automotor: 5400, hogar: 0, vida: 0, caucion: 3200, bonificacion: "1%" },
    ],
    objetivoMensual: 21000,
    produccionMes: 24800,
    produccionAnual: 58200,
    seguimiento: "Enviar recordatorio de bonificación Mapfre",
  },
];

const PERIODOS = ["Marzo 2024", "Febrero 2024", "Enero 2024"];

export default function ProductionControl() {
  const [periodo, setPeriodo] = useState(PERIODOS[0]);
  const [search, setSearch] = useState("");

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return PRODUCERS.filter((prod) => {
      if (!q) return true;
      return (
        prod.nombre.toLowerCase().includes(q) ||
        prod.localidad.toLowerCase().includes(q) ||
        prod.companias.some((c) => c.nombre.toLowerCase().includes(q))
      );
    });
  }, [search]);

  const totales = useMemo(() => {
    return filtrados.reduce(
      (acc, prod) => {
        acc.produccionMes += prod.produccionMes;
        acc.objetivo += prod.objetivoMensual;
        return acc;
      },
      { produccionMes: 0, objetivo: 0 }
    );
  }, [filtrados]);

  const cumplimiento = totales.objetivo === 0 ? 0 : Math.round((totales.produccionMes / totales.objetivo) * 100);

  return (
    <div className="flex-1 flex flex-col gap-5">
      <header className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Control de producción y comisiones</h1>
            <p className="mt-2 text-slate-600 max-w-2xl">
              Compara la producción mensual contra los objetivos acordados con cada compañía, identifica
              oportunidades de bonificación y planifica acciones comerciales.
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="periodo-select">
              Periodo de análisis
            </label>
            <select
              id="periodo-select"
              value={periodo}
              onChange={(event) => setPeriodo(event.target.value)}
              className="border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {PERIODOS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard label="Producción del mes" value={`USD ${totales.produccionMes.toLocaleString("es-UY")}`} />
          <SummaryCard label="Objetivo mensual" value={`USD ${totales.objetivo.toLocaleString("es-UY")}`} />
          <SummaryCard label="Cumplimiento promedio" value={`${cumplimiento}%`} highlight={cumplimiento >= 100} />
        </div>
        <p className="mt-3 text-sm text-slate-500">Datos correspondientes a {periodo}.</p>
      </header>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 flex-1 flex flex-col min-h-0">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="producer-search">
              Buscar productor o compañía
            </label>
            <input
              id="producer-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre, localidad o aseguradora"
              className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
        </div>

        <div className="mt-6 overflow-auto -mx-4 md:mx-0">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 font-semibold">Productor</th>
                <th className="px-4 py-3 font-semibold">Localidad</th>
                <th className="px-4 py-3 font-semibold">Producción mes</th>
                <th className="px-4 py-3 font-semibold">Objetivo</th>
                <th className="px-4 py-3 font-semibold">Bonificaciones / compañías</th>
                <th className="px-4 py-3 font-semibold">Seguimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map((prod) => {
                const cumplimientoProd = Math.round((prod.produccionMes / prod.objetivoMensual) * 100);
                return (
                  <tr key={prod.id} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{prod.nombre}</div>
                      <div className="text-xs text-slate-500">{prod.correo}</div>
                      <div className="text-xs text-slate-500">{prod.celular}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{prod.localidad}</td>
                    <td className="px-4 py-3 text-slate-700">USD {prod.produccionMes.toLocaleString("es-UY")}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>USD {prod.objetivoMensual.toLocaleString("es-UY")}</div>
                      <div className="text-xs text-slate-500 mt-1">{cumplimientoProd}% del objetivo</div>
                    </td>
                    <td className="px-4 py-3">
                      <ul className="space-y-2">
                        {prod.companias.map((compania) => (
                          <li key={compania.nombre} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                            <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
                              <span>{compania.nombre}</span>
                              <span className="text-emerald-700">{compania.bonificacion}</span>
                            </div>
                            <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                              <div>
                                <dt className="font-medium text-slate-500">Automotor</dt>
                                <dd>USD {compania.automotor.toLocaleString("es-UY")}</dd>
                              </div>
                              <div>
                                <dt className="font-medium text-slate-500">Hogar</dt>
                                <dd>USD {compania.hogar.toLocaleString("es-UY")}</dd>
                              </div>
                              <div>
                                <dt className="font-medium text-slate-500">Vida</dt>
                                <dd>USD {compania.vida.toLocaleString("es-UY")}</dd>
                              </div>
                              <div>
                                <dt className="font-medium text-slate-500">Caución</dt>
                                <dd>USD {compania.caucion.toLocaleString("es-UY")}</dd>
                              </div>
                            </dl>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-sm">{prod.seguimiento}</td>
                  </tr>
                );
              })}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No se encontraron productores para el criterio seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="text-sm font-medium text-slate-600">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}
