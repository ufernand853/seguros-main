// src/pages/Dashboard.tsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

type ModuleCard = {
  title: string;
  eyebrow: string;
  description: string;
  path: string;
  accent: string;
  icon: string;
  cta: string;
};

const PRIMARY_MODULES: ModuleCard[] = [
  {
    title: "Clientes",
    eyebrow: "Cartera",
    description: "Alta, búsqueda y vista integral de clientes, pólizas, documentos y contactos.",
    path: "/clientes",
    accent: "from-blue-600 to-cyan-500",
    icon: "👥",
    cta: "Ver clientes",
  },
  {
    title: "Aseguradoras",
    eyebrow: "Catálogo",
    description: "Mantenimiento de compañías, datos comerciales y condiciones operativas.",
    path: "/aseguradoras",
    accent: "from-sky-600 to-indigo-500",
    icon: "🏢",
    cta: "Ver aseguradoras",
  },
  {
    title: "Seguimiento de gestiones",
    eyebrow: "Operación diaria",
    description: "Tablero de tareas, pendientes, responsables y trazabilidad de cada gestión.",
    path: "/gestiones",
    accent: "from-rose-600 to-orange-500",
    icon: "✅",
    cta: "Ver gestiones",
  },
  {
    title: "Agenda de renovaciones",
    eyebrow: "Vencimientos",
    description: "Priorizá renovaciones próximas y oportunidades para contactar al cliente.",
    path: "/renovaciones",
    accent: "from-amber-500 to-yellow-400",
    icon: "📅",
    cta: "Ver agenda",
  },
  {
    title: "Modo IA",
    eyebrow: "Asistente",
    description: "Consultá el estado operativo, ejecutá comandos asistidos y revisá acciones.",
    path: "/ia/comandos",
    accent: "from-violet-700 to-indigo-500",
    icon: "🤖",
    cta: "Abrir IA",
  },
  {
    title: "Registro de siniestro",
    eyebrow: "Siniestros",
    description: "Ingresá denuncias, asociá pólizas y dejá preparada la comunicación.",
    path: "/siniestros/registro",
    accent: "from-slate-800 to-slate-600",
    icon: "🛡️",
    cta: "Registrar siniestro",
  },
];

const QUICK_ACTIONS = [
  { label: "Nuevo cliente", path: "/clientes/nuevo" },
  { label: "Pipeline de pólizas", path: "/pipeline" },
  { label: "Producción & comisiones", path: "/produccion" },
  { label: "Configurar usuarios", path: "/configuracion" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const license = user?.license;

  return (
    <div className="min-h-full flex-1 space-y-8">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-800 px-6 py-7 text-white md:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200">Gestión de Seguros</p>
              <h1 className="mt-3 text-3xl font-bold md:text-4xl">Panel operativo</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-200 md:text-base">
                Accesos principales para trabajar cartera, aseguradoras, gestiones, renovaciones, IA y siniestros desde un tablero coherente con la operación SaaS.
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 text-sm ring-1 ring-white/15 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-200">Usuario</p>
              <p className="mt-2 text-lg font-semibold">{user?.name || user?.email || "Usuario"}</p>
              <p className="text-slate-300">{user?.email || "Sin email registrado"}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-t border-slate-100 bg-slate-50 px-6 py-5 md:grid-cols-3 md:px-8">
          <InfoPill label="Licencia" value={license?.status || "Interna"} />
          <InfoPill label="Empresa" value={license?.tenant?.name || "Gestión interna"} />
          <InfoPill label="Plan" value={license?.plan?.name || "Sin plan asociado"} />
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {PRIMARY_MODULES.map((module) => (
          <button
            key={module.path}
            type="button"
            onClick={() => navigate(module.path)}
            className="group overflow-hidden rounded-3xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-indigo-100"
          >
            <div className={`h-2 bg-gradient-to-r ${module.accent}`} />
            <div className="space-y-4 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">{module.eyebrow}</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">{module.title}</h2>
                </div>
                <span className="rounded-2xl bg-slate-100 px-3 py-2 text-3xl transition group-hover:scale-110">{module.icon}</span>
              </div>
              <p className="min-h-[72px] text-sm leading-6 text-slate-600">{module.description}</p>
              <span className="inline-flex items-center text-sm font-bold text-indigo-700">
                {module.cta}
                <span className="ml-2 transition group-hover:translate-x-1">→</span>
              </span>
            </div>
          </button>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Acciones rápidas</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">Atajos de gestión</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.path}
                type="button"
                onClick={() => navigate(action.path)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}
