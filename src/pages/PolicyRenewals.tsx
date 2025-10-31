import { useMemo, useState } from "react";

type Renewal = {
  id: string;
  asegurado: string;
  ramo: "Alquiler" | "Automotor" | "Caución" | "Salud" | "Vida";
  compania: string;
  referencia: string;
  vencimiento: string;
  contacto: string;
  notas?: string;
  estado: "Por contactar" | "En gestión" | "Renovado";
};

const RENEWALS: Renewal[] = [
  {
    id: "RN-001",
    asegurado: "Inversiones del Sur",
    ramo: "Alquiler",
    compania: "Porto",
    referencia: "Contrato Local 205",
    vencimiento: "2024-04-03",
    contacto: "sofia@inversionesdelsur.com",
    notas: "Enviar actualización de garantía",
    estado: "Por contactar",
  },
  {
    id: "RN-002",
    asegurado: "Transportes Atlántico",
    ramo: "Automotor",
    compania: "Sura",
    referencia: "Flota Pesada",
    vencimiento: "2024-04-15",
    contacto: "operaciones@transatla.com",
    notas: "Solicitar inspección previa",
    estado: "En gestión",
  },
  {
    id: "RN-003",
    asegurado: "Estudios Jurídicos Asociados",
    ramo: "Caución",
    compania: "Sancor",
    referencia: "Garantía de alquiler Av. Brasil",
    vencimiento: "2024-05-02",
    contacto: "administracion@eja.com",
    estado: "Por contactar",
  },
  {
    id: "RN-004",
    asegurado: "Club Náutico",
    ramo: "Salud",
    compania: "BSE",
    referencia: "Plan corporativo",
    vencimiento: "2024-05-20",
    contacto: "comercial@clubnautico.org",
    notas: "Revisar ajuste por nuevas altas",
    estado: "En gestión",
  },
  {
    id: "RN-005",
    asegurado: "Servicios Industriales",
    ramo: "Vida",
    compania: "Mapfre",
    referencia: "Colectivo Operarios",
    vencimiento: "2024-06-08",
    contacto: "rh@serviciosind.com",
    estado: "Renovado",
  },
];

const RAMOS: Renewal["ramo"][] = ["Alquiler", "Automotor", "Caución", "Salud", "Vida"];

export default function PolicyRenewals() {
  const [ramo, setRamo] = useState<string>("todos");
  const [estado, setEstado] = useState<string>("pendientes");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return RENEWALS.filter((item) => {
      if (ramo !== "todos" && item.ramo !== ramo) return false;
      if (estado === "pendientes" && item.estado === "Renovado") return false;
      if (estado === "renovados" && item.estado !== "Renovado") return false;
      if (!q) return true;
      return (
        item.asegurado.toLowerCase().includes(q) ||
        item.compania.toLowerCase().includes(q) ||
        item.referencia.toLowerCase().includes(q)
      );
    });
  }, [estado, ramo, search]);

  const proximosVencimientos = useMemo(() => {
    return [...filtered]
      .sort((a, b) => a.vencimiento.localeCompare(b.vencimiento))
      .slice(0, 3)
      .map((item) => ({
        ...item,
        dias: daysUntil(item.vencimiento),
      }));
  }, [filtered]);

  return (
    <div className="flex-1 flex flex-col gap-5">
      <header className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-slate-900">Agenda de renovaciones</h1>
        <p className="mt-2 text-slate-600 max-w-2xl">
          Prioriza renovaciones según su vencimiento y estado actual, y centraliza los datos clave para
          contactar al cliente con un solo vistazo.
        </p>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {proximosVencimientos.map((item) => (
            <div key={item.id} className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
              <div className="text-xs font-semibold uppercase text-indigo-500">Próximo vencimiento</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{item.asegurado}</div>
              <div className="text-sm text-slate-600">{item.referencia}</div>
              <div className="mt-2 text-sm text-slate-700">{formatDate(item.vencimiento)}</div>
              <div className="mt-1 text-xs text-indigo-600">Faltan {item.dias} días</div>
            </div>
          ))}
          {proximosVencimientos.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No hay renovaciones pendientes para los filtros seleccionados.
            </div>
          )}
        </div>
      </header>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 flex-1 flex flex-col min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="renewals-search">
              Buscar póliza o asegurado
            </label>
            <input
              id="renewals-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre del asegurado o referencia"
              className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="ramo-filter">
              Ramo
            </label>
            <select
              id="ramo-filter"
              value={ramo}
              onChange={(event) => setRamo(event.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="todos">Todos</option>
              {RAMOS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="status-filter">
              Estado
            </label>
            <select
              id="status-filter"
              value={estado}
              onChange={(event) => setEstado(event.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="pendientes">Pendientes</option>
              <option value="todos">Todos</option>
              <option value="renovados">Renovados</option>
            </select>
          </div>
        </div>

        <div className="mt-6 overflow-auto -mx-4 md:mx-0">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 font-semibold">Vencimiento</th>
                <th className="px-4 py-3 font-semibold">Asegurado</th>
                <th className="px-4 py-3 font-semibold">Ramo</th>
                <th className="px-4 py-3 font-semibold">Compañía</th>
                <th className="px-4 py-3 font-semibold">Referencia</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Contacto</th>
                <th className="px-4 py-3 font-semibold">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered
                .sort((a, b) => a.vencimiento.localeCompare(b.vencimiento))
                .map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{formatDate(item.vencimiento)}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{item.asegurado}</div>
                      <div className="text-xs text-slate-500">{item.id}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{item.ramo}</td>
                    <td className="px-4 py-3 text-slate-700">{item.compania}</td>
                    <td className="px-4 py-3 text-slate-700">{item.referencia}</td>
                    <td className="px-4 py-3">
                      <StatusPill estado={item.estado} />
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-sm">{item.contacto}</td>
                    <td className="px-4 py-3 text-slate-600 text-sm">{item.notas ?? "—"}</td>
                  </tr>
                ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    No hay pólizas que coincidan con los filtros seleccionados.
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

function StatusPill({ estado }: { estado: Renewal["estado"] }) {
  const colors: Record<Renewal["estado"], string> = {
    "Por contactar": "bg-rose-100 text-rose-700",
    "En gestión": "bg-amber-100 text-amber-700",
    Renovado: "bg-emerald-100 text-emerald-700",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[estado]}`}>
      {estado}
    </span>
  );
}

function daysUntil(date: string) {
  const today = new Date();
  const target = new Date(date);
  const diff = target.getTime() - today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("es-UY", {
    day: "2-digit",
    month: "short",
  });
}
