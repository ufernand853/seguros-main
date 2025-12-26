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
import ClaimRegistration from "./pages/ClaimRegistration";
import ClientDetail from "./pages/ClientDetail";
import UserMaintenance from "./pages/UserMaintenance";
import VerCliente from "./pages/VerCliente";



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
      <Route path="/clientes/:id" element={withLayout(<ClientDetail />)} />
      <Route path="/clientes/:id/editar" element={withLayout(<VerCliente />)} />
      <Route path="/clientes/nuevo" element={withLayout(<NuevoCliente />)} />
      <Route path="/clientes/ficha" element={withLayout(<Client360View />)} />
      <Route path="/clientes/polizas" element={withLayout(<ClaimRegistration />)} />
      <Route path="/siniestros/registro" element={withLayout(<ClaimRegistration />)} />
      <Route path="/configuracion" element={withLayout(<UserMaintenance />)} />


      {/* Redirect raíz */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Fallback */}
      <Route path="*" element={withLayout(<Placeholder />)} />
    </Routes>
  );
}
