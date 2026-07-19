// src/pages/Dashboard.tsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

type Tile = { label: string; path: string; bg?: string };

const TILES: Tile[] = [
  { label: "Workflow por cliente", path: "/workflow/clientes", bg: "bg-indigo-700 hover:bg-indigo-800" },
  { label: "Clientes", path: "/clientes", bg: "bg-blue-600 hover:bg-blue-700" },
  { label: "Pipeline de pólizas", path: "/pipeline", bg: "bg-emerald-600 hover:bg-emerald-700" },
  { label: "Registro de siniestro", path: "/siniestros/registro", bg: "bg-amber-600 hover:bg-amber-700" },
  { label: "Producción & comisiones", path: "/produccion", bg: "bg-emerald-600 hover:bg-emerald-700" },
  { label: "Agenda de renovaciones", path: "/renovaciones", bg: "bg-amber-600 hover:bg-amber-700" },
  { label: "Seguimiento de gestiones", path: "/gestiones", bg: "bg-rose-600 hover:bg-rose-700" },
  { label: "Aseguradoras", path: "/aseguradoras", bg: "bg-sky-600 hover:bg-sky-700" },
  { label: "Ficha integral cliente", path: "/clientes", bg: "bg-teal-600 hover:bg-teal-700" },
  { label: "Registro de siniestro", path: "/siniestros/registro", bg: "bg-slate-700 hover:bg-slate-800" },
  { label: "Modo IA", path: "/ia/comandos", bg: "bg-indigo-700 hover:bg-indigo-800" },
  { label: "IA Configuración", path: "/ia/configuracion", bg: "bg-purple-700 hover:bg-purple-800" },
  { label: "IA Historial/Undo", path: "/ia/cambios", bg: "bg-cyan-700 hover:bg-cyan-800" },
  { label: "Configuración", path: "/configuracion", bg: "bg-slate-700 hover:bg-slate-800" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const open = (p: string) => navigate(p);
  const license = user?.license;

  return (
    <div className="flex-1 space-y-6">
      {license && (
        <section className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-500">Licencia SaaS</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-700">
            <span className="font-semibold text-slate-900">{license.tenant.name}</span>
            <span className="rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-700">{license.status}</span>
            {license.plan && <span>Plan {license.plan.name}</span>}
          </div>
        </section>
      )}
      <div
        className="
          grid gap-6
          grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
          auto-rows-fr
        "
      >
        {TILES.map((t) => (
        <button
          key={t.path}
          onClick={() => open(t.path)}
          className={`w-full h-full ${t.bg} text-white rounded-xl shadow-lg
                     focus:outline-none focus:ring-4 focus:ring-black/20
                     transition flex items-center justify-center`}
          aria-label={t.label}
          type="button"
        >
          <span className="text-2xl md:text-3xl font-bold">{t.label}</span>
        </button>
        ))}
      </div>
    </div>
  );
}
