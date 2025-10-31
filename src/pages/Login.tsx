import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = () => {
    // Mock: luego aquí enchufamos Google OAuth y pasamos el token real.
    login({ name: "Usuario Demo", email: "demo@example.com" }, "mock-token", 120);
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md text-center">
        <h1 className="text-2xl font-bold mb-6">Bienvenido</h1>
        <button
          type="button"
          onClick={handleLogin}
          className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold"
        >
          Login with Google
        </button>
      </div>
    </div>
  );
}
