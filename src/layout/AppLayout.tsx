import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Barra superior */}
      <div className="flex items-center justify-between px-4 py-3 bg-white shadow-md">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium"
        >
          Dashboard
        </button>
        <button
          type="button"
          onClick={() => { logout(); navigate("/login", { replace: true }); }}
          className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold"
        >
          Logout
        </button>
      </div>

      {/* Contenido de cada página */}
      <div className="flex-1 p-6 min-h-0 flex">
        {children}
      </div>
    </div>
  );
}
