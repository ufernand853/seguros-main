import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import AppLayout from "./layout/AppLayout";

import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Placeholder from "./pages/Placeholder";
import Clientes from "./pages/Clientes";
import NuevoCliente from "./pages/NuevoCliente";



export default function App() {
  const withLayout = (el: JSX.Element) => (
    <ProtectedRoute>
      <AppLayout>{el}</AppLayout>
    </ProtectedRoute>
  );

  return (
    <Routes>
      {/* Login queda fuera del layout */}
      <Route path="/login" element={<Login />} />

      {/* Páginas con layout */}
      <Route path="/dashboard" element={withLayout(<Dashboard />)} />
      <Route path="/clientes" element={withLayout(<Clientes />)} />
      <Route path="/agenda" element={withLayout(<Placeholder />)} />
      <Route path="/notificaciones" element={withLayout(<Placeholder />)} />
      <Route path="/configuracion" element={withLayout(<Placeholder />)} />
      <Route path="/otro" element={withLayout(<Placeholder />)} />
      <Route path="/otro2" element={withLayout(<Placeholder />)} />
	  <Route path="/clientes/nuevo" element={withLayout(<NuevoCliente />)} />


      {/* Redirect raíz */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Fallback */}
      <Route path="*" element={withLayout(<Placeholder />)} />
    </Routes>
  );
}
