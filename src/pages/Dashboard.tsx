// src/pages/Dashboard.tsx
import { useNavigate } from "react-router-dom";

type Tile = { label: string; path: string; bg?: string };

const TILES: Tile[] = [
  { label: "Producción & comisiones", path: "/produccion", bg: "bg-emerald-600 hover:bg-emerald-700" },
  { label: "Agenda de renovaciones", path: "/renovaciones", bg: "bg-amber-600 hover:bg-amber-700" },
  { label: "Seguimiento de gestiones", path: "/gestiones", bg: "bg-rose-600 hover:bg-rose-700" },
  { label: "Clientes", path: "/clientes", bg: "bg-blue-600 hover:bg-blue-700" },
  { label: "Aseguradoras", path: "/aseguradoras", bg: "bg-sky-600 hover:bg-sky-700" },
  { label: "Ficha integral cliente", path: "/clientes/ficha", bg: "bg-teal-600 hover:bg-teal-700" },
  { label: "Registro de siniestro", path: "/siniestros/registro", bg: "bg-slate-700 hover:bg-slate-800" },
  { label: "Configuración", path: "/configuracion", bg: "bg-slate-700 hover:bg-slate-800" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const open = (p: string) => navigate(p);

  return (
    <div
      className="
        flex-1 grid gap-6
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
  );
}
