import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { apiListRenewals, type RenewalItem } from "../services/api";

type Renewal = {
  id: string;
  asegurado: string;
  referencia?: string | null;
  vencimiento?: string;
  estado: string;
  responsable?: string | null;
};

export default function PolicyRenewals() {
  const { token } = useAuth();
  const [estado, setEstado] = useState<string>("pendientes");
  const [search, setSearch] = useState("");
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);

    apiListRenewals(token)
      .then((data) => {
        setRenewals(
          data.items.map((item: RenewalItem) => ({
            id: item.id,
            asegurado: item.client_name ?? "—",
            referencia: item.policy_number ?? null,
            vencimiento: item.renewal_date ?? undefined,
            estado: item.status ?? "Sin estado",
            responsable: item.owner ?? null,
          })),
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar las renovaciones"))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return renewals.filter((item) => {
      if (estado === "pendientes" && item.estado.toLowerCase().includes("renov")) return false;
      if (estado === "renovados" && !item.estado.toLowerCase().includes("renov")) return false;
      if (!q) return true;
      return item.asegurado.toLowerCase().includes(q) || item.referencia?.toLowerCase().includes(q);
    });
  }, [estado, renewals, search]);

  const proximosVencimientos = useMemo(() => {
    return [...filtered]
      .filter((item) => item.vencimiento)
      .sort((a, b) => (a.vencimiento ?? "").localeCompare(b.vencimiento ?? ""))
      .slice(0, 3)
      .map((item) => ({
        ...item,
        dias: daysUntil(item.vencimiento ?? ""),
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
              <div className="text-sm text-slate-600">{item.referencia ?? "Sin referencia"}</div>
              <div className="mt-2 text-sm text-slate-700">{formatDate(item.vencimiento ?? "")}</div>
              <div className="mt-1 text-xs text-indigo-600">Faltan {item.dias} días</div>
            </div>
          ))}
          {proximosVencimientos.length === 0 && !isLoading && !error && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No hay renovaciones pendientes para los filtros seleccionados.
            </div>
          )}
          {isLoading && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Cargando renovaciones…
            </div>
          )}
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
          )}
        </div>
      </header>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 flex-1 flex flex-col min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="renewals-search">
              Búsqueda
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
                <th className="px-4 py-3 font-semibold">Referencia</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Responsable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered
                .sort((a, b) => (a.vencimiento ?? "").localeCompare(b.vencimiento ?? ""))
                .map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{formatDate(item.vencimiento ?? "")}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{item.asegurado}</div>
                      <div className="text-xs text-slate-500">{item.id}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{item.referencia ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusPill estado={item.estado} />
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-sm">{item.responsable ?? "—"}</td>
                  </tr>
                ))}
              {filtered.length === 0 && !isLoading && !error && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
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

function StatusPill({ estado }: { estado: string }) {
  const normalized = estado.toLowerCase();
  const tone = normalized.includes("renov")
    ? "bg-emerald-100 text-emerald-700"
    : normalized.includes("gestion")
      ? "bg-amber-100 text-amber-700"
      : "bg-rose-100 text-rose-700";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tone}`}>
      {estado}
    </span>
  );
}

function daysUntil(date: string) {
  if (!date) return 0;
  const today = new Date();
  const target = new Date(date);
  const diff = target.getTime() - today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatDate(date: string) {
  if (!date) return "Sin fecha";
  return new Date(date + "T00:00:00").toLocaleDateString("es-UY", {
    day: "2-digit",
    month: "short",
  });
}
