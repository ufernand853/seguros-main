import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function Placeholder() {
  const { isAuthed } = useAuth();

  return (
    <div className="min-h-dvh bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-xl text-center">
        <div className="mb-4">
          <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-black/90 text-white text-3xl">
            …
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold mb-3">
          Disponible en futuras implementaciones
        </h1>
        <p className="text-gray-600 mb-8">
          Esta sección aún no está lista. Estamos trabajando para habilitarla en
          próximas versiones.
        </p>

        <div className="flex gap-3 justify-center">
          {/* Botón al Login: siempre visible */}
          <Link
            to="/login"
            className="px-5 py-3 rounded-lg border border-gray-300 text-gray-800 font-semibold hover:bg-gray-50"
          >
            Ir al Login
          </Link>

          {/* Botón al Dashboard: solo si hay sesión */}
          {isAuthed && (
            <Link
              to="/dashboard"
              className="px-5 py-3 rounded-lg bg-gray-900 text-white font-semibold hover:opacity-90"
            >
              Volver al Dashboard
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
