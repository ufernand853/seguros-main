// src/pages/VerCliente.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import ViewFilesModal, { ViewFileItem } from "../components/ViewFilesModal";
import {
  apiGetClientSummary,
  apiListInsurers,
  apiListPolicies,
  apiUpdatePolicy,
  type InsurerListItem,
  type PolicyItem,
  type PolicySummary,
} from "../services/api";

type ClientePayload = {
  nombre: string;
  rut: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  pais?: string;
  contacto?: string;
  notas?: string;
  docFiles: ViewFileItem[];    // solo visualización
  otherDocs: ViewFileItem[];   // solo visualización
};

const ROLE_OPTIONS = [
  { value: "asegurados", label: "Asegurado" },
  { value: "tomadores", label: "Tomador" },
  { value: "cesionarios", label: "Cesionario" },
];

export default function VerCliente() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { token } = useAuth();

  const emptyForm: ClientePayload = {
    nombre: "",
    rut: "",
    telefono: "",
    email: "",
    direccion: "",
    ciudad: "",
    departamento: "",
    pais: "",
    contacto: "",
    notas: "",
    docFiles: [],
    otherDocs: [],
  };

  const [form, setForm] = useState<ClientePayload>(emptyForm);
  const [isEditing, setIsEditing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [policies, setPolicies] = useState<PolicySummary[]>([]);
  const [availablePolicies, setAvailablePolicies] = useState<PolicyItem[]>([]);
  const [insurers, setInsurers] = useState<InsurerListItem[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState("");
  const [selectedRole, setSelectedRole] = useState(ROLE_OPTIONS[0].value);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [policySuccess, setPolicySuccess] = useState<string | null>(null);
  const [isPolicySaving, setPolicySaving] = useState(false);

  // Modales SOLO lectura
  const [showDocModal, setShowDocModal] = useState(false);
  const [showOtherDocsModal, setShowOtherDocsModal] = useState(false);

  useEffect(() => {
    if (!id || !token) return;
    setIsLoading(true);
    setError(null);

    Promise.all([apiGetClientSummary(id, token), apiListPolicies(token), apiListInsurers(token)])
      .then(([data, policiesResponse, insurersResponse]) => {
        const mainContact = data.contacts?.[0];
        setForm({
          nombre: data.name ?? "",
          rut: data.document ?? "",
          telefono: mainContact?.phone ?? "",
          email: mainContact?.email ?? "",
          direccion: "",
          ciudad: data.city ?? "",
          departamento: "",
          pais: "",
          contacto: mainContact?.name ?? "",
          notas: "",
          docFiles: [],
          otherDocs: [],
        });
        setPolicies(data.policies ?? []);
        setAvailablePolicies(policiesResponse.items ?? []);
        setInsurers(insurersResponse.items ?? []);
        setIsEditing(true);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el cliente"))
      .finally(() => setIsLoading(false));
  }, [id, token]);

  const onChange = (k: keyof ClientePayload, v: string) =>
    setForm((s) => ({ ...s, [k]: v }));

  const onCancel = () => navigate("/clientes");
  const onSave = () => {
    if (!isEditing) return; // bloqueado si no está en edición
    // TODO: enviar a API (PUT/PATCH)
    console.log("Guardar cambios (cliente)", form);
    setIsEditing(false);
  };

  const insurerNameById = (insurerId?: string | null) =>
    insurers.find((insurer) => insurer.id === insurerId)?.name ?? "Sin aseguradora";

  const handleAssociatePolicy = async () => {
    if (!id || !token) return;
    setPolicyError(null);
    setPolicySuccess(null);

    if (!selectedPolicyId) {
      setPolicyError("Selecciona una póliza para asociar.");
      return;
    }

    const policy = availablePolicies.find((item) => item.id === selectedPolicyId);
    if (!policy) {
      setPolicyError("No se encontró la póliza seleccionada.");
      return;
    }

    const roleAssignments = policy.roles ?? { asegurados: [], tomadores: [], cesionarios: [] };
    const toIds = (items: { id: string }[]) => items.map((item) => item.id);
    const updatedAssignments = {
      asegurados: toIds(roleAssignments.asegurados),
      tomadores: toIds(roleAssignments.tomadores),
      cesionarios: toIds(roleAssignments.cesionarios),
    };

    const targetRole = selectedRole as keyof typeof updatedAssignments;
    if (!updatedAssignments[targetRole].includes(id)) {
      updatedAssignments[targetRole].push(id);
    }

    setPolicySaving(true);
    try {
      await apiUpdatePolicy(
        selectedPolicyId,
        {
          asegurados: updatedAssignments.asegurados,
          tomadores: updatedAssignments.tomadores,
          cesionarios: updatedAssignments.cesionarios,
        },
        token,
      );

      const [clientData, policiesResponse] = await Promise.all([
        apiGetClientSummary(id, token),
        apiListPolicies(token),
      ]);
      setPolicies(clientData.policies ?? []);
      setAvailablePolicies(policiesResponse.items ?? []);

      const policyLabel = policy.type ?? policy.id;
      setPolicySuccess(`Póliza ${policyLabel} asociada al cliente como ${ROLE_OPTIONS.find((role) => role.value === selectedRole)?.label ?? "asegurado"}.`);
      setSelectedPolicyId("");
    } catch (err) {
      setPolicyError(err instanceof Error ? err.message : "No se pudo asociar la póliza.");
    } finally {
      setPolicySaving(false);
    }
  };

  const linkedPolicyIds = new Set(policies.map((policy) => policy.id));
  const policyOptions = availablePolicies.filter((policy) => !linkedPolicyIds.has(policy.id));

  return (
    <div className="flex-1 flex flex-col gap-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <h1 className="text-xl font-bold text-slate-800 mb-4">Editar Cliente</h1>
        {isLoading ? (
          <div className="text-center text-slate-500 py-10">Cargando datos del cliente…</div>
        ) : error ? (
          <div className="text-center text-red-600 py-10">{error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nombre */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Nombre o Razón Social *
              </label>
              <input
                value={form.nombre}
                disabled={!isEditing}
                onChange={(e) => onChange("nombre", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            {/* RUT + Ver documento(s) */}
            <div className="flex flex-col gap-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Documento / RUT
                </label>
                <input
                  value={form.rut}
                  disabled={!isEditing}
                  onChange={(e) => onChange("rut", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowDocModal(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 hover:bg-black text-white font-semibold"
                >
                  Ver documento(s)
                </button>
                {form.docFiles?.length ? (
                  <span className="text-sm text-slate-600">
                    {form.docFiles.length} archivo(s)
                  </span>
                ) : (
                  <span className="text-sm text-slate-400">Sin adjuntos</span>
                )}
              </div>
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Teléfono
              </label>
              <input
                value={form.telefono ?? ""}
                disabled={!isEditing}
                onChange={(e) => onChange("telefono", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Email de contacto
              </label>
              <input
                type="email"
                value={form.email ?? ""}
                disabled={!isEditing}
                onChange={(e) => onChange("email", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            {/* Dirección */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Dirección
              </label>
              <input
                value={form.direccion ?? ""}
                disabled={!isEditing}
                onChange={(e) => onChange("direccion", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            {/* Ciudad */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Ciudad / Localidad
              </label>
              <input
                value={form.ciudad ?? ""}
                disabled={!isEditing}
                onChange={(e) => onChange("ciudad", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            {/* Departamento */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Departamento / Provincia
              </label>
              <input
                value={form.departamento ?? ""}
                disabled={!isEditing}
                onChange={(e) => onChange("departamento", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            {/* País */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                País
              </label>
              <input
                value={form.pais ?? ""}
                disabled={!isEditing}
                onChange={(e) => onChange("pais", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            {/* Contacto principal */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Contacto principal (opcional)
              </label>
              <input
                value={form.contacto ?? ""}
                disabled={!isEditing}
                onChange={(e) => onChange("contacto", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            {/* Notas */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Notas internas (opcional)
              </label>
              <textarea
                value={form.notas ?? ""}
                disabled={!isEditing}
                onChange={(e) => onChange("notas", e.target.value)}
                className="w-full min-h-[96px] rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>
        )}

        {!isLoading && !error && (
          <div className="mt-6 space-y-4">
            <div className="border-t border-slate-200 pt-4">
              <h2 className="text-lg font-semibold text-slate-800">Pólizas asociadas</h2>
              <p className="text-sm text-slate-500">
                Las pólizas deben estar vinculadas a una aseguradora para habilitar siniestros y renovaciones.
              </p>
              {policies.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">Este cliente aún no tiene pólizas asociadas.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {policies.map((policy) => (
                    <li key={policy.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                      <div className="text-sm font-semibold text-slate-800">{policy.type ?? "Póliza"}</div>
                      <div className="text-xs text-slate-500">
                        {policy.insurer ?? insurerNameById(policy.insurer_id)} · {policy.status ?? "Sin estado"}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-base font-semibold text-slate-800">Asociar póliza existente</h3>
              <p className="text-sm text-slate-500">
                Selecciona una póliza ya creada para vincularla a este cliente con el rol correspondiente.
              </p>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Póliza disponible
                  </label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={selectedPolicyId}
                    onChange={(event) => setSelectedPolicyId(event.target.value)}
                    disabled={policyOptions.length === 0}
                  >
                    <option value="">{policyOptions.length ? "Selecciona una póliza" : "No hay pólizas disponibles"}</option>
                    {policyOptions.map((policy) => (
                      <option key={policy.id} value={policy.id}>
                        {policy.type ?? "Póliza"} · {insurerNameById(policy.insurer_id)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Rol del cliente
                  </label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={selectedRole}
                    onChange={(event) => setSelectedRole(event.target.value)}
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {policyOptions.length} póliza(s) disponibles para asociar.
                </span>
                <button
                  type="button"
                  onClick={handleAssociatePolicy}
                  disabled={isPolicySaving || !selectedPolicyId}
                  className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {isPolicySaving ? "Asociando…" : "Asociar póliza"}
                </button>
              </div>
              {policyError && (
                <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{policyError}</p>
              )}
              {policySuccess && (
                <p className="mt-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                  {policySuccess}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Otros documentos (solo ver) */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowOtherDocsModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-black text-white font-semibold"
          >
            Ver otros documentos
          </button>
          {form.otherDocs?.length ? (
            <span className="ml-3 text-sm text-slate-600">
              {form.otherDocs.length} archivo(s)
            </span>
          ) : (
            <span className="ml-3 text-sm text-slate-400">Sin adjuntos</span>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={!isEditing}
          onClick={onSave}
          className={`px-4 py-2 rounded-lg text-white font-semibold ${
            isEditing
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-emerald-300 cursor-not-allowed"
          }`}
        >
          Guardar cambios
        </button>
        <button
          type="button"
          onClick={() => setIsEditing((s) => !s)}
          className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-black text-white font-semibold"
        >
          {isEditing ? "Salir de edición" : "Editar"}
        </button>
      </div>

      {/* Modales SOLO lectura */}
      <ViewFilesModal
        open={showDocModal}
        title="Documento(s) - Identificación / RUT"
        items={form.docFiles}
        onClose={() => setShowDocModal(false)}
      />
      <ViewFilesModal
        open={showOtherDocsModal}
        title="Otros documentos"
        items={form.otherDocs}
        onClose={() => setShowOtherDocsModal(false)}
      />
    </div>
  );
}
