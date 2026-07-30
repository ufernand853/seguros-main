import { ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import HelpPanel from "../components/HelpPanel";
import { useHelpContent } from "../hooks/useHelpContent";

const NAV_ITEMS = [
  { label: "Clientes", path: "/clientes" },
  { label: "Aseguradoras", path: "/aseguradoras" },
  { label: "Gestiones", path: "/gestiones" },
  { label: "Renovaciones", path: "/renovaciones" },
  { label: "Modo IA", path: "/ia/comandos" },
  { label: "Siniestros", path: "/siniestros/registro" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const helpContent = useHelpContent();
  const sectionTitle = getSectionTitle(location.pathname);
  const license = user?.license;
  const isClientPortal = user?.role === "cliente";

  useEffect(() => {
    setIsHelpOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 px-4 py-4 lg:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(isClientPortal && user?.clientId ? `/clientes/${user.clientId}` : "/dashboard")}
                className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-900"
              >
                Seguros
              </button>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Panel Linsse</p>
                <h1 className="truncate text-xl font-bold text-slate-900">{sectionTitle}</h1>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm">
                <p className="font-bold text-slate-900">{user?.name || user?.email || "Usuario"}</p>
                <p className="text-xs text-slate-500">{user?.email || "Sin email"}</p>
              </div>
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm text-indigo-900">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">Licencia</p>
                <p className="font-bold">
                  {license ? `${license.tenant.name} · ${license.status}` : "Acceso interno"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsHelpOpen(true)}
                className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Ayuda
              </button>
              <button
                type="button"
                onClick={() => { logout(); navigate("/seguros/login", { replace: true }); }}
                className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Salir
              </button>
            </div>
          </div>

          {!isClientPortal && <nav className="flex gap-2 overflow-x-auto pb-1">
            {NAV_ITEMS.map((item) => {
              const active = location.pathname.startsWith(item.path.split("/").slice(0, 2).join("/"));
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>}
        </div>
      </header>

      <main className="flex min-h-0 flex-1 p-4 md:p-6">{children}</main>

      <HelpPanel
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        content={helpContent}
      />
    </div>
  );
}

function getSectionTitle(pathname: string) {
  if (pathname.startsWith("/workflow/clientes")) return "Workflow de clientes";
  if (pathname.startsWith("/clientes/polizas")) return "Pólizas";
  if (pathname.startsWith("/clientes")) return "Clientes";
  if (pathname.startsWith("/pipeline")) return "Pólizas";
  if (pathname.startsWith("/produccion")) return "Producción & comisiones";
  if (pathname.startsWith("/renovaciones")) return "Agenda de renovaciones";
  if (pathname.startsWith("/gestiones")) return "Seguimiento de gestiones";
  if (pathname.startsWith("/aseguradoras")) return "Aseguradoras";
  if (pathname.startsWith("/siniestros")) return "Siniestros";
  if (pathname.startsWith("/ia/comandos")) return "Modo IA";
  if (pathname.startsWith("/ia/configuracion")) return "Configuración IA";
  if (pathname.startsWith("/ia/cambios")) return "Historial IA y Undo";
  if (pathname.startsWith("/configuracion")) return "Configuración";
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  return "Sección";
}
