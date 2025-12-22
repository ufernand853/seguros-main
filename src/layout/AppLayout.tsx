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

  useEffect(() => {
    setIsHelpOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Barra superior */}
      <div className="flex items-center justify-between px-4 py-3 bg-white shadow-md">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium"
          >
            Dashboard
          </button>
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
            onClick={() => { logout(); navigate("/login", { replace: true }); }}
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
