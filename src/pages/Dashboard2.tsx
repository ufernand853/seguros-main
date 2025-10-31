import { useNavigate } from "react-router-dom";

type Tile = { label: string; path: string; bg?: string };

const TILES: Tile[] = [
  { label: "Clientes",        path: "/clientes",        bg: "bg-blue-600 hover:bg-blue-700" },
  { label: "Agenda",          path: "/agenda",          bg: "bg-emerald-600 hover:bg-emerald-700" },
  { label: "Notificaciones",  path: "/notificaciones",  bg: "bg-amber-600 hover:bg-amber-700" },
  { label: "Otro",            path: "/otro",            bg: "bg-indigo-600 hover:bg-indigo-700" },
  { label: "Otro2",           path: "/otro2",           bg: "bg-rose-600 hover:bg-rose-700" },
  { label: "Configuración",   path: "/configuracion",   bg: "bg-slate-700 hover:bg-slate-800" },
];

export default function Dashboard() {
  const navigate = useNavigate();

  const handleOpen = (path: string) => navigate(path);

  return (
    <div className="grid grid-cols-2 grid-rows-3 md:grid-cols-3 md:grid-rows-2 gap-6">
      {TILES.map((t) => (
        <button
          key={t.path}
          type="button"
          onClick={() => handleOpen(t.path)}
          className={`w-full h-32 md:h-40 ${t.bg} text-white rounded-xl shadow-lg focus:outline-none focus:ring-4 focus:ring-black/20 transition`}
          aria-label={t.label}
        >
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl md:text-3xl font-bold">{t.label}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
