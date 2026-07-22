import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { apiLogin } from "../services/api";

const featureHighlights = [
  "CRM de clientes y seguimiento de oportunidades",
  "Gestión de pólizas, renovaciones y vencimientos",
  "Control de producción por productor y compañía",
  "Tableros para priorizar tareas y reclamos",
];

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
        { name: response.user.name, email: response.user.email, role: response.user.role, license: response.license },
        response.accessToken,
        Math.floor(response.expiresInSeconds / 60),
      );
      navigate("/dashboard", { replace: true });
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
                Plataforma comercial
              </p>
              <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
                Todo lo que un corredor necesita para vender más y gestionar mejor.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-300">
                Centralizá la operación diaria, acompañá cada renovación y mantené una vista clara de tu cartera desde un único lugar.
              </p>

              <div className="mt-8 grid gap-4">
                {featureHighlights.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-300 text-sm font-bold text-slate-950">
                      ✓
                    </span>
                    <p className="text-sm font-medium leading-6 text-slate-100">{feature}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 grid gap-4 rounded-2xl bg-white p-5 text-slate-950 sm:grid-cols-3">
                <div>
                  <p className="text-2xl font-bold">360°</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Vista cliente</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">24/7</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Acceso web</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">IA</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Asistencia operativa</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
