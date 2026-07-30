import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { apiLogin } from "../services/api";

const featureHighlights = [
  "Cartera 360°",
  "Renovaciones",
  "Gestiones e IA",
];

const previewModules = [
  { eyebrow: "Cartera", title: "Clientes", accent: "from-blue-500 to-cyan-400", icon: "CL" },
  { eyebrow: "Catálogo", title: "Aseguradoras", accent: "from-cyan-500 to-indigo-500", icon: "AS" },
  { eyebrow: "Operación", title: "Gestiones", accent: "from-rose-500 to-orange-500", icon: "GE" },
  { eyebrow: "Vencimientos", title: "Renovaciones", accent: "from-amber-400 to-orange-500", icon: "RE" },
  { eyebrow: "Asistente", title: "Modo IA", accent: "from-violet-500 to-indigo-500", icon: "IA" },
  { eyebrow: "Siniestros", title: "Registro", accent: "from-slate-700 to-slate-500", icon: "SI" },
];

function ProductPreview() {
  return (
    <div className="relative mt-8" aria-label="Vista previa del panel operativo de Linsse">
      <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-r from-sky-400/20 via-indigo-400/10 to-violet-400/20 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-slate-100 shadow-2xl shadow-sky-950/40">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <div className="ml-2 h-2 w-28 rounded-full bg-slate-200" />
          <span className="ml-auto rounded-full bg-indigo-50 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-indigo-600">Panel operativo</span>
        </div>
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-800 px-5 py-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[7px] font-bold uppercase tracking-[0.3em] text-cyan-300">Gestión de seguros</p>
              <p className="mt-1 text-sm font-bold text-white">Toda tu operación, en un solo lugar</p>
            </div>
            <div className="hidden rounded-lg border border-white/10 bg-white/10 px-3 py-2 sm:block">
              <div className="h-1.5 w-12 rounded-full bg-white/40" />
              <div className="mt-1.5 h-1.5 w-8 rounded-full bg-white/20" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 p-3 sm:grid-cols-3">
          {previewModules.map((module) => (
            <div key={module.title} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${module.accent}`} />
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[6px] font-bold uppercase tracking-[0.22em] text-slate-400">{module.eyebrow}</p>
                  <p className="mt-1 text-[10px] font-bold text-slate-800">{module.title}</p>
                </div>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-[8px] font-black text-slate-600">{module.icon}</span>
              </div>
              <div className="mt-4 h-1.5 w-3/4 rounded-full bg-slate-100" />
              <div className="mt-1.5 h-1.5 w-1/2 rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-100 via-slate-100/60 to-transparent" />
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/80 bg-white/90 px-4 py-2 text-[9px] font-bold text-slate-800 shadow-lg backdrop-blur">
          Una visión clara para decidir mejor
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const registrationPath = location.pathname.startsWith("/seguros") ? "/seguros/registro" : "/registro";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await apiLogin(email, password);
      login(
        { name: response.user.name, email: response.user.email, role: response.user.role, clientId: response.user.client_id, license: response.license },
        response.accessToken,
        Math.floor(response.expiresInSeconds / 60),
      );
      navigate(response.user.role === "cliente" && response.user.client_id
        ? `/clientes/${response.user.client_id}`
        : "/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-sky-100 px-4 py-8 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl bg-white p-8 shadow-2xl lg:p-10">
          <img
            src="/linsse.svg"
            alt="Linsse"
            className="mb-7 h-12 w-auto"
          />
          <h1 className="text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">
            Portal de Gestión para Corredores de Seguros
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-500">
            Accedé a tus herramientas de cartera, pólizas y clientes
          </p>
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                Correo corporativo
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {isSubmitting ? "Ingresando..." : "Iniciar sesión"}
            </button>
          </form>
          <div className="mt-6 border-t border-slate-100 pt-5 text-center">
            <Link to={registrationPath} className="text-sm font-semibold text-indigo-700 hover:text-indigo-900">
              Ver planes y funcionalidades
            </Link>
          </div>
        </section>

        <aside className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-2xl">
          <div className="relative p-8 lg:p-10">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-52 w-52 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="relative">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-300">
                La plataforma para corredores
              </p>
              <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
                Convertí la gestión diaria en una ventaja comercial.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-300">
                Clientes, pólizas, renovaciones, siniestros y seguimiento comercial conectados en una experiencia simple.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {featureHighlights.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 backdrop-blur">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sky-300 text-[10px] font-bold text-slate-950">
                      ✓
                    </span>
                    <p className="text-xs font-semibold text-slate-100">{feature}</p>
                  </div>
                ))}
              </div>
              <ProductPreview />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
