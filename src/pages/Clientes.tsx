// src/pages/Clientes.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { apiListClients, type ClientListItem } from "../services/api";

type Cliente = { id: string; nombre: string; doc?: string; ciudad?: string | null };

export default function Clientes() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState(q);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);

    apiListClients(token)
      .then((data) => {
        setClientes(
          data.items.map((item: ClientListItem) => ({
            id: item.id,
            nombre: item.name,
            doc: item.document,
            ciudad: item.city ?? null,
          })),
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar los clientes"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim().toLowerCase()), 160);
    return () => clearTimeout(t);
  }, [q]);

  const resultados = useMemo(() => {
    if (!debounced) return clientes;
    return clientes.filter(
      (c) =>
        c.nombre?.toLowerCase().includes(debounced) ||
        c.doc?.toLowerCase().includes(debounced) ||
        c.ciudad?.toLowerCase().includes(debounced),
    );
  }, [clientes, debounced]);

  const open = (c: Cliente) => navigate(`/clientes/${encodeURIComponent(c.id)}`);

  const nuevo = () => navigate("/clientes/nuevo");
  const verFicha = () => navigate("/clientes/ficha");
  const verPolizas = () => navigate("/clientes/polizas");

  return (
    <div className="flex-1 flex flex-col gap-4">
      {/* Header: búsqueda + nuevo */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="q">
              Buscar cliente
            </label>
            <div className="relative">
              <input
                id="q"
                autoFocus
                placeholder="Nombre, RUT/Documento o ciudad…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">⌘K</span>
            </div>
          </div>

          <div className="md:self-end flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={nuevo}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              + Nuevo cliente
            </button>
            <button
              type="button"
              onClick={verFicha}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Ver ficha integral
            </button>
            <button
              type="button"
              onClick={verPolizas}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              Alta póliza & siniestro (base real)
            </button>
          </div>
        </div>
      </div>

      {/* Resultados */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-2 md:p-3 overflow-auto">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-slate-500">Cargando clientes…</div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-red-600 text-center px-4">{error}</div>
        ) : resultados.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-center px-4">
            No se encontraron clientes para “{q}”.<br />
            <button onClick={nuevo} className="mt-3 underline text-emerald-700 hover:text-emerald-800">
              Crear “Nuevo cliente”
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {resultados.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => open(c)}
                  className="w-full text-left px-3 py-3 md:py-4 hover:bg-slate-50 rounded-lg flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 truncate">{c.nombre}</div>
                    <div className="text-sm text-slate-600 truncate">
                      {c.doc ?? "—"} · {c.ciudad ?? "—"}
                    </div>
                  </div>
                  <span aria-hidden className="ml-3">›</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
