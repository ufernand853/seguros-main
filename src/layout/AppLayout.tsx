import { ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import HelpPanel from "../components/HelpPanel";
import { useHelpContent } from "../hooks/useHelpContent";

export default function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const helpContent = useHelpContent();
  const sectionTitle = getSectionTitle(location.pathname);

  useEffect(() => {
    setIsHelpOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Barra superior */}
      <div className="flex items-center gap-4 px-4 py-3 bg-white shadow-md">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium"
          >
            Dashboard
          </button>
        </div>
        <div className="flex-1 text-center min-w-0">
          <span className="text-lg font-semibold text-slate-700 truncate">
            {sectionTitle}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            Ayuda
          </button>
          <button
            type="button"
            onClick={() => { logout(); navigate("/seguros/login", { replace: true }); }}
            className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Contenido de cada página */}
      <div className="flex-1 p-6 min-h-0 flex">
        {children}
      </div>

      <HelpPanel
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        content={helpContent}
      />
    </div>
  );
}

function getSectionTitle(pathname: string) {
  if (pathname.startsWith("/clientes/polizas")) return "Pólizas";
  if (pathname.startsWith("/clientes")) return "Clientes";
  if (pathname.startsWith("/pipeline")) return "Pólizas";
  if (pathname.startsWith("/produccion")) return "Producción & comisiones";
  if (pathname.startsWith("/renovaciones")) return "Agenda de renovaciones";
  if (pathname.startsWith("/gestiones")) return "Seguimiento de gestiones";
  if (pathname.startsWith("/aseguradoras")) return "Aseguradoras";
  if (pathname.startsWith("/siniestros")) return "Siniestros";
  if (pathname.startsWith("/configuracion")) return "Configuración";
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  return "Sección";
}
