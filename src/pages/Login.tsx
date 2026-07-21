import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { apiLogin } from "../services/api";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
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
    <div className="flex items-center justify-center min-h-screen bg-slate-100 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <img
          src="/linsse.svg"
          alt="Linsse"
          className="mb-6 h-12 w-auto"
        />
        <h1 className="text-3xl font-bold text-center mb-2 text-slate-900">
          Portal de Gestión para Corredores de Seguros
        </h1>
        <p className="text-center text-slate-500 mb-8">
          Accedé a tus herramientas de cartera, pólizas y clientes
        </p>
        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
              Correo corporativo
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition"
          >
            {isSubmitting ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>
        <div className="mt-6 border-t border-slate-100 pt-5 text-center">
          <Link to="/registro" className="text-sm font-semibold text-indigo-700 hover:text-indigo-900">
            Ver planes y funcionalidades
          </Link>
        </div>
      </div>
    </div>
  );
}
