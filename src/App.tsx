import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import AppLayout from "./layout/AppLayout";

import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Placeholder from "./pages/Placeholder";
import Clientes from "./pages/Clientes";
import NuevoCliente from "./pages/NuevoCliente";
import PolicyPipeline from "./pages/PolicyPipeline";
import ProductionControl from "./pages/ProductionControl";
import PolicyRenewals from "./pages/PolicyRenewals";
import TaskTracker from "./pages/TaskTracker";
import Client360View from "./pages/Client360View";
import InsuranceCarriersMaintenance from "./pages/InsuranceCarriersMaintenance";
import ClientesPolizasDemo from "./pages/ClientesPolizasDemo";



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
      <Route path="/pipeline" element={withLayout(<PolicyPipeline />)} />
      <Route path="/produccion" element={withLayout(<ProductionControl />)} />
      <Route path="/renovaciones" element={withLayout(<PolicyRenewals />)} />
      <Route path="/gestiones" element={withLayout(<TaskTracker />)} />
      <Route path="/aseguradoras" element={withLayout(<InsuranceCarriersMaintenance />)} />
      <Route path="/clientes" element={withLayout(<Clientes />)} />
      <Route path="/clientes/nuevo" element={withLayout(<NuevoCliente />)} />
      <Route path="/clientes/ficha" element={withLayout(<Client360View />)} />
      <Route path="/clientes/polizas-demo" element={withLayout(<ClientesPolizasDemo />)} />
      <Route path="/configuracion" element={withLayout(<Placeholder />)} />


      {/* Redirect raíz */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Fallback */}
      <Route path="*" element={withLayout(<Placeholder />)} />
    </Routes>
  );
}
