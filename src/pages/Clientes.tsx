// src/pages/Clientes.tsx
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

type Cliente = { id: string; nombre: string; doc?: string; ciudad?: string };
const MOCK: Cliente[] = [
  { id: "1", nombre: "Cliente Demo Uno S.A.", doc: "RUT 99.000.001-001", ciudad: "Ciudad Norte" },
  { id: "2", nombre: "Cliente Demo Dos SRL", doc: "RUT 99.000.002-001", ciudad: "Ciudad Sur" },
  { id: "3", nombre: "Cliente Demo Tres Coop.", doc: "RUT 99.000.003-001", ciudad: "Ciudad Este" },
  { id: "4", nombre: "Cliente Demo Cuatro Ltda.", doc: "RUT 99.000.004-001", ciudad: "Ciudad Oeste" },
  { id: "5", nombre: "Cliente Demo Cinco", doc: "RUT 99.000.005-001", ciudad: "Ciudad Central" },
];

export default function Clientes() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState(q);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim().toLowerCase()), 160);
    return () => clearTimeout(t);
  }, [q]);

  const resultados = useMemo(() => {
    if (!debounced) return MOCK;
    return MOCK.filter(c =>
      (c.nombre?.toLowerCase().includes(debounced)) ||
      (c.doc?.toLowerCase().includes(debounced)) ||
      (c.ciudad?.toLowerCase().includes(debounced))
    );
  }, [debounced]);

  const open = (c: Cliente) => navigate(`/clientes?sel=${encodeURIComponent(c.id)}`);

  const nuevo = () => navigate("/clientes/nuevo");
  const verFicha = () => navigate("/clientes/ficha");
  const verPolizasDemo = () => navigate("/clientes/polizas-demo");

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
              Ver ficha integral demo
            </button>
            <button
              type="button"
              onClick={verPolizasDemo}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              Demo alta póliza & siniestro
            </button>
          </div>
        </div>
      </div>

      {/* Resultados */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-2 md:p-3 overflow-auto">
        {resultados.length === 0 ? (
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
