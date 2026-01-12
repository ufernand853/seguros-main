// src/pages/VerCliente.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import UploadModal, {
  DEFAULT_DOCUMENT_CATEGORIES,
  type DocumentAttachment,
} from "../components/UploadModal";
import ViewFilesModal from "../components/ViewFilesModal";
import type { ViewFileItem } from "../components/ViewFilesModal";
import {
  apiGetClientSummary,
  apiCreatePolicy,
  apiListInsurers,
  apiListPolicies,
  apiUpdateClient,
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
  apoderados: ApoderadoItem[];
  laboralHistorial: LaboralHistorialItem[];
  docFiles: ViewFileItem[];    // solo visualización
  otherDocs: ViewFileItem[];   // solo visualización
};

type ApoderadoItem = {
  figura: string;
  tipoPersona: string;
  nombre: string;
  documentoTipo: string;
  documento: string;
  telefono: string;
  email: string;
  direccion: string;
  notas: string;
};

type LaboralHistorialItem = {
  tipoEmpresa: string;
  tipoVinculo: string;
  nombreEmpresa: string;
  fechaIngreso: string;
  nominal: string;
  promedio: string;
};

const ROLE_OPTIONS = [
  { value: "asegurados", label: "Asegurado" },
  { value: "tomadores", label: "Tomador" },
  { value: "cesionarios", label: "Cesionario" },
];
const POLICY_STATUSES = ["Vigente", "En revisión", "Suspendida"];
const DRAFT_POLICY_ID = "draft-policy";
const FIGURA_APODERADO_OPTIONS = ["Empresa", "Particular"];
const TIPO_PERSONA_OPTIONS = ["Persona física", "Persona jurídica"];
const DOCUMENTO_APODERADO_OPTIONS = ["DNI", "Pasaporte"];
const VINCULO_OPTIONS = ["Empleado", "Dependiente", "Renta"];
const emptyApoderadoItem: ApoderadoItem = {
  figura: FIGURA_APODERADO_OPTIONS[0],
  tipoPersona: TIPO_PERSONA_OPTIONS[0],
  nombre: "",
  documentoTipo: DOCUMENTO_APODERADO_OPTIONS[0],
  documento: "",
  telefono: "",
  email: "",
  direccion: "",
  notas: "",
};
const emptyLaboralHistorialItem: LaboralHistorialItem = {
  tipoEmpresa: "",
  tipoVinculo: VINCULO_OPTIONS[0],
  nombreEmpresa: "",
  fechaIngreso: "",
  nominal: "",
  promedio: "",
};

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
    apoderados: [{ ...emptyApoderadoItem }],
    laboralHistorial: [{ ...emptyLaboralHistorialItem }],
    docFiles: [],
    otherDocs: [],
  };

  const [form, setForm] = useState<ClientePayload>(emptyForm);
  const [isEditing, setIsEditing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [policies, setPolicies] = useState<PolicySummary[]>([]);
  const [availablePolicies, setAvailablePolicies] = useState<PolicyItem[]>([]);
  const [insurers, setInsurers] = useState<InsurerListItem[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState("");
  const [selectedRole, setSelectedRole] = useState(ROLE_OPTIONS[0].value);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [policySuccess, setPolicySuccess] = useState<string | null>(null);
  const [activePolicyId, setActivePolicyId] = useState<string | null>(null);
  const [policyAttachments, setPolicyAttachments] = useState<Record<string, DocumentAttachment[]>>({});
  const [newPolicyAttachments, setNewPolicyAttachments] = useState<DocumentAttachment[]>([]);

  const policyCategoryLabels = useMemo(
    () =>
      DEFAULT_DOCUMENT_CATEGORIES.reduce<Record<string, string>>((acc, option) => {
        acc[option.value] = option.label;
        return acc;
      }, {}),
    [],
  );
  const activePolicyAttachments = useMemo(() => {
    if (!activePolicyId) return [];
    if (activePolicyId === DRAFT_POLICY_ID) return newPolicyAttachments;
    return policyAttachments[activePolicyId] ?? [];
  }, [activePolicyId, newPolicyAttachments, policyAttachments]);
  const [isPolicySaving, setPolicySaving] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    insurerId: "",
    type: "",
    policyNumber: "",
    status: POLICY_STATUSES[0],
    premium: "",
    nextRenewal: "",
  });

  // Modales SOLO lectura
  const [showDocModal, setShowDocModal] = useState(false);
  const [showOtherDocsModal, setShowOtherDocsModal] = useState(false);

  const normalizeApoderado = (item: Partial<ApoderadoItem>): ApoderadoItem => ({
    figura: item.figura ?? FIGURA_APODERADO_OPTIONS[0],
    tipoPersona: item.tipoPersona ?? TIPO_PERSONA_OPTIONS[0],
    nombre: item.nombre ?? "",
    documentoTipo: item.documentoTipo ?? DOCUMENTO_APODERADO_OPTIONS[0],
    documento: item.documento ?? "",
    telefono: item.telefono ?? "",
    email: item.email ?? "",
    direccion: item.direccion ?? "",
    notas: item.notas ?? "",
  });

  const normalizeLaboral = (item: Partial<LaboralHistorialItem>): LaboralHistorialItem => ({
    tipoEmpresa: item.tipoEmpresa ?? "",
    tipoVinculo: item.tipoVinculo ?? VINCULO_OPTIONS[0],
    nombreEmpresa: item.nombreEmpresa ?? "",
    fechaIngreso: item.fechaIngreso ?? "",
    nominal: item.nominal ?? "",
    promedio: item.promedio ?? "",
  });

  const hasApoderadoData = (item: ApoderadoItem) =>
    Boolean(
      item.nombre.trim() ||
        item.documento.trim() ||
        item.telefono.trim() ||
        item.email.trim() ||
        item.direccion.trim() ||
        item.notas.trim() ||
        item.figura !== FIGURA_APODERADO_OPTIONS[0] ||
        item.tipoPersona !== TIPO_PERSONA_OPTIONS[0] ||
        item.documentoTipo !== DOCUMENTO_APODERADO_OPTIONS[0],
    );

  const hasLaboralData = (item: LaboralHistorialItem) =>
    Boolean(
      item.tipoEmpresa.trim() ||
        item.nombreEmpresa.trim() ||
        item.fechaIngreso.trim() ||
        item.nominal.trim() ||
        item.promedio.trim() ||
        item.tipoVinculo !== VINCULO_OPTIONS[0],
    );

  const normalizeApoderadosPayload = (items: ApoderadoItem[]) =>
    items.filter(hasApoderadoData).map((item) => ({
      figura: item.figura,
      tipoPersona: item.tipoPersona,
      nombre: item.nombre.trim(),
      documentoTipo: item.documentoTipo,
      documento: item.documento.trim(),
      telefono: item.telefono.trim(),
      email: item.email.trim(),
      direccion: item.direccion.trim(),
      notas: item.notas.trim(),
    }));

  const normalizeLaboralPayload = (items: LaboralHistorialItem[]) =>
    items.filter(hasLaboralData).map((item) => ({
      tipoEmpresa: item.tipoEmpresa.trim(),
      tipoVinculo: item.tipoVinculo,
      nombreEmpresa: item.nombreEmpresa.trim(),
      fechaIngreso: item.fechaIngreso.trim(),
      nominal: item.nominal.trim(),
      promedio: item.promedio.trim(),
    }));

  useEffect(() => {
    if (!id || !token) return;
    setIsLoading(true);
    setError(null);

    Promise.all([apiGetClientSummary(id, token), apiListPolicies(token), apiListInsurers(token)])
      .then(([data, policiesResponse, insurersResponse]) => {
        const mainContact = data.contacts?.[0];
        const address = data.address ?? data.direccion ?? "";
        const apoderados = (data.apoderados ?? []).map(normalizeApoderado);
        const laboralHistorial = (data.laboralHistorial ?? []).map(normalizeLaboral);
        setForm({
          nombre: data.name ?? "",
          rut: data.document ?? "",
          telefono: mainContact?.phone ?? "",
          email: mainContact?.email ?? "",
          direccion: address,
          ciudad: data.city ?? "",
          departamento: data.department ?? (data as { departamento?: string | null }).departamento ?? "",
          pais: data.country ?? (data as { pais?: string | null }).pais ?? "",
          contacto: mainContact?.name ?? "",
          notas: "",
          apoderados: apoderados.length ? apoderados : [{ ...emptyApoderadoItem }],
          laboralHistorial: laboralHistorial.length ? laboralHistorial : [{ ...emptyLaboralHistorialItem }],
          docFiles: [],
          otherDocs: [],
        });
        setPolicies(data.policies ?? []);
        setAvailablePolicies(policiesResponse.items ?? []);
        setInsurers(insurersResponse.items ?? []);
        setPolicyForm((prev) => ({
          ...prev,
          insurerId: prev.insurerId || insurersResponse.items?.[0]?.id || "",
        }));
        setIsEditing(true);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el cliente"))
      .finally(() => setIsLoading(false));
  }, [id, token]);

  const onChange = (k: keyof ClientePayload, v: string) =>
    setForm((s) => ({ ...s, [k]: v }));

  const onApoderadoChange = (index: number, field: keyof ApoderadoItem, value: string) =>
    setForm((current) => {
      const next = [...current.apoderados];
      next[index] = { ...next[index], [field]: value };
      return { ...current, apoderados: next };
    });

  const addApoderado = () =>
    setForm((current) => ({
      ...current,
      apoderados: [...current.apoderados, { ...emptyApoderadoItem }],
    }));

  const removeApoderado = (index: number) =>
    setForm((current) => {
      const next = current.apoderados.filter((_, idx) => idx !== index);
      return { ...current, apoderados: next.length ? next : [{ ...emptyApoderadoItem }] };
    });

  const onLaboralHistorialChange = (index: number, field: keyof LaboralHistorialItem, value: string) =>
    setForm((current) => {
      const next = [...current.laboralHistorial];
      next[index] = { ...next[index], [field]: value };
      return { ...current, laboralHistorial: next };
    });

  const addLaboralHistorial = () =>
    setForm((current) => ({
      ...current,
      laboralHistorial: [...current.laboralHistorial, { ...emptyLaboralHistorialItem }],
    }));

  const removeLaboralHistorial = (index: number) =>
    setForm((current) => {
      const next = current.laboralHistorial.filter((_, idx) => idx !== index);
      return { ...current, laboralHistorial: next.length ? next : [{ ...emptyLaboralHistorialItem }] };
    });

  const onCancel = () => navigate("/clientes");
  const onSave = async () => {
    if (!isEditing) return; // bloqueado si no está en edición
    if (!id || !token) {
      setError("Sesión no válida. Iniciá sesión nuevamente para guardar cambios.");
      return;
    }
    if (!form.nombre.trim() || !form.rut.trim()) {
      setError("Nombre y documento son obligatorios.");
      return;
    }

    setError(null);
    setIsSaving(true);

    let saved = false;
    let updatedId: string | null = null;
    try {
      const contacts =
        form.contacto?.trim() || form.email?.trim() || form.telefono?.trim()
          ? [
              {
                name: form.contacto?.trim() || "Contacto principal",
                email: form.email?.trim() || null,
                phone: form.telefono?.trim() || null,
              },
            ]
          : [];
      const apoderados = normalizeApoderadosPayload(form.apoderados);
      const laboralHistorial = normalizeLaboralPayload(form.laboralHistorial);

      const updated = await apiUpdateClient(
        id,
        {
          name: form.nombre.trim(),
          document: form.rut.trim(),
          city: form.ciudad?.trim() || null,
          department: form.departamento?.trim() || null,
          country: form.pais?.trim() || null,
          address: form.direccion?.trim() || null,
          contacts,
          apoderados,
          laboralHistorial,
        },
        token,
      );

      const mainContact = updated.contacts?.[0];
      setForm((current) => ({
        ...current,
        nombre: updated.name ?? current.nombre,
        rut: updated.document ?? current.rut,
        direccion: updated.address ?? current.direccion,
        ciudad: updated.city ?? current.ciudad,
        departamento: updated.department ?? current.departamento,
        pais: updated.country ?? current.pais,
        telefono: mainContact?.phone ?? current.telefono,
        email: mainContact?.email ?? current.email,
        contacto: mainContact?.name ?? current.contacto,
      }));
      updatedId = updated.id ?? null;
      setIsEditing(false);
      saved = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar los cambios.");
    } finally {
      setIsSaving(false);
    }

    if (saved) {
      if (updatedId && updatedId !== id) {
        navigate(`/clientes/${encodeURIComponent(updatedId)}/editar`, { replace: true });
        return;
      }
      navigate("/clientes", { replace: true });
    }
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

  const handleCreatePolicy = async () => {
    if (!id || !token) return;
    setPolicyError(null);
    setPolicySuccess(null);

    if (!policyForm.insurerId || !policyForm.type.trim()) {
      setPolicyError("Completa aseguradora y tipo de póliza para crearla.");
      return;
    }

    setPolicySaving(true);
    try {
      const createdPolicy = await apiCreatePolicy(
        {
          type: policyForm.type.trim(),
          policy_number: policyForm.policyNumber.trim() || null,
          insurer_id: policyForm.insurerId,
          status: policyForm.status || null,
          premium: policyForm.premium ? Number(policyForm.premium) : null,
          next_renewal: policyForm.nextRenewal || null,
          asegurados: [id],
        },
        token,
      );

      const [clientData, policiesResponse] = await Promise.all([
        apiGetClientSummary(id, token),
        apiListPolicies(token),
      ]);
      setPolicies(clientData.policies ?? []);
      setAvailablePolicies(policiesResponse.items ?? []);

      if (newPolicyAttachments.length) {
        setPolicyAttachments((prev) => ({ ...prev, [createdPolicy.id]: newPolicyAttachments }));
        setNewPolicyAttachments([]);
      }

      setPolicyForm((prev) => ({ ...prev, type: "", policyNumber: "", premium: "", nextRenewal: "" }));
      setPolicySuccess("Póliza creada y asociada al cliente.");
    } catch (err) {
      setPolicyError(err instanceof Error ? err.message : "No se pudo crear la póliza.");
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

            <div className="md:col-span-2">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-800">Figuras de apoderado</h2>
                  <p className="text-sm text-slate-500">
                    Registra apoderados (empresa o particular), tipo de persona y documentos asociados.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addApoderado}
                  disabled={!isEditing}
                  className="mt-2 inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 md:mt-0"
                >
                  + Agregar apoderado
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {form.apoderados.map((item, index) => (
                  <div key={`apoderado-${index}`} className="rounded-lg border border-slate-200 p-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Figura
                        </label>
                        <select
                          value={item.figura}
                          disabled={!isEditing}
                          onChange={(event) => onApoderadoChange(index, "figura", event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100 disabled:text-slate-500"
                        >
                          {FIGURA_APODERADO_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Tipo de persona
                        </label>
                        <select
                          value={item.tipoPersona}
                          disabled={!isEditing}
                          onChange={(event) => onApoderadoChange(index, "tipoPersona", event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100 disabled:text-slate-500"
                        >
                          {TIPO_PERSONA_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Nombre / Razón social
                        </label>
                        <input
                          value={item.nombre}
                          disabled={!isEditing}
                          onChange={(event) => onApoderadoChange(index, "nombre", event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100 disabled:text-slate-500"
                          placeholder="Ej: Juan Pérez o Apoderados S.A."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Tipo de documento
                        </label>
                        <select
                          value={item.documentoTipo}
                          disabled={!isEditing}
                          onChange={(event) => onApoderadoChange(index, "documentoTipo", event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100 disabled:text-slate-500"
                        >
                          {DOCUMENTO_APODERADO_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Número de documento
                        </label>
                        <input
                          value={item.documento}
                          disabled={!isEditing}
                          onChange={(event) => onApoderadoChange(index, "documento", event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100 disabled:text-slate-500"
                          placeholder="DNI / Pasaporte"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Teléfono
                        </label>
                        <input
                          value={item.telefono}
                          disabled={!isEditing}
                          onChange={(event) => onApoderadoChange(index, "telefono", event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100 disabled:text-slate-500"
                          placeholder="+598..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Email
                        </label>
                        <input
                          type="email"
                          value={item.email}
                          disabled={!isEditing}
                          onChange={(event) => onApoderadoChange(index, "email", event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100 disabled:text-slate-500"
                          placeholder="apoderado@email.com"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Dirección
                        </label>
                        <input
                          value={item.direccion}
                          disabled={!isEditing}
                          onChange={(event) => onApoderadoChange(index, "direccion", event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100 disabled:text-slate-500"
                          placeholder="Calle, número, ciudad"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Notas
                        </label>
                        <textarea
                          value={item.notas}
                          disabled={!isEditing}
                          onChange={(event) => onApoderadoChange(index, "notas", event.target.value)}
                          className="mt-1 w-full min-h-[80px] rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100 disabled:text-slate-500"
                          placeholder="Observaciones del apoderado"
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeApoderado(index)}
                        disabled={!isEditing}
                        className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:text-red-300"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-800">Histórico de cambios laborales</h2>
                  <p className="text-sm text-slate-500">
                    Gestiona tipo de empresa, vínculo, nombre, fecha de ingreso y valores nominales/promedio.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addLaboralHistorial}
                  disabled={!isEditing}
                  className="mt-2 inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 md:mt-0"
                >
                  + Agregar cambio laboral
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {form.laboralHistorial.map((item, index) => (
                  <div key={`laboral-${index}`} className="rounded-lg border border-slate-200 p-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Tipo de empresa
                        </label>
                        <input
                          value={item.tipoEmpresa}
                          disabled={!isEditing}
                          onChange={(event) => onLaboralHistorialChange(index, "tipoEmpresa", event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100 disabled:text-slate-500"
                          placeholder="Ej: Privada / Pública"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Vínculo
                        </label>
                        <select
                          value={item.tipoVinculo}
                          disabled={!isEditing}
                          onChange={(event) => onLaboralHistorialChange(index, "tipoVinculo", event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100 disabled:text-slate-500"
                        >
                          {VINCULO_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Nombre empresa
                        </label>
                        <input
                          value={item.nombreEmpresa}
                          disabled={!isEditing}
                          onChange={(event) => onLaboralHistorialChange(index, "nombreEmpresa", event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100 disabled:text-slate-500"
                          placeholder="Ej: Empresa S.A."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Fecha de ingreso
                        </label>
                        <input
                          type="date"
                          value={item.fechaIngreso}
                          disabled={!isEditing}
                          onChange={(event) => onLaboralHistorialChange(index, "fechaIngreso", event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100 disabled:text-slate-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Nominal
                        </label>
                        <input
                          value={item.nominal}
                          disabled={!isEditing}
                          onChange={(event) => onLaboralHistorialChange(index, "nominal", event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100 disabled:text-slate-500"
                          placeholder="Ej: 120000"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Promedio
                        </label>
                        <input
                          value={item.promedio}
                          disabled={!isEditing}
                          onChange={(event) => onLaboralHistorialChange(index, "promedio", event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100 disabled:text-slate-500"
                          placeholder="Ej: 95000"
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeLaboralHistorial(index)}
                        disabled={!isEditing}
                        className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:text-red-300"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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
                  {policies.map((policy) => {
                    const policyDocs = policyAttachments[policy.id] ?? [];
                    return (
                      <li key={policy.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-slate-800">{policy.type ?? "Póliza"}</div>
                            {policy.policy_number && (
                              <div className="text-xs text-slate-500">Número: {policy.policy_number}</div>
                            )}
                            <div className="text-xs text-slate-500">
                              {policy.insurer ?? insurerNameById(policy.insurer_id)} · {policy.status ?? "Sin estado"}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActivePolicyId(policy.id)}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                          >
                            {policyDocs.length ? "Documentos" : "Adjuntar documentos"}
                          </button>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          {policyDocs.length ? (
                            <ul className="space-y-1">
                              {policyDocs.map((attachment, index) => (
                                <li key={`${attachment.file.name}-${index}`} className="flex flex-wrap gap-2">
                                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                    {policyCategoryLabels[attachment.category] ?? attachment.category}
                                  </span>
                                  {attachment.label?.trim() ? (
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                      {attachment.label}
                                    </span>
                                  ) : null}
                                  <span className="truncate text-slate-500" title={attachment.file.name}>
                                    {attachment.file.name}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            "Sin documentos adjuntos."
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-base font-semibold text-slate-800">Crear nueva póliza</h3>
              <p className="text-sm text-slate-500">
                Crea una póliza vinculada a una aseguradora y asignala directamente al cliente.
              </p>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Aseguradora
                  </label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={policyForm.insurerId}
                    onChange={(event) => setPolicyForm((prev) => ({ ...prev, insurerId: event.target.value }))}
                    disabled={insurers.length === 0}
                  >
                    <option value="">
                      {insurers.length === 0 ? "No hay aseguradoras cargadas" : "Selecciona una aseguradora"}
                    </option>
                    {insurers.map((insurer) => (
                      <option key={insurer.id} value={insurer.id}>
                        {insurer.name ?? insurer.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Tipo de póliza
                  </label>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={policyForm.type}
                    onChange={(event) => setPolicyForm((prev) => ({ ...prev, type: event.target.value }))}
                    placeholder="Ej: Hogar"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Número de póliza
                  </label>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={policyForm.policyNumber}
                    onChange={(event) => setPolicyForm((prev) => ({ ...prev, policyNumber: event.target.value }))}
                    placeholder="Ej: POL-2024-0098"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Estado
                  </label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={policyForm.status}
                    onChange={(event) => setPolicyForm((prev) => ({ ...prev, status: event.target.value }))}
                  >
                    {POLICY_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Prima (USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={policyForm.premium}
                    onChange={(event) => setPolicyForm((prev) => ({ ...prev, premium: event.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Próxima renovación
                  </label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={policyForm.nextRenewal}
                    onChange={(event) => setPolicyForm((prev) => ({ ...prev, nextRenewal: event.target.value }))}
                  />
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-600">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">Documentos de la póliza</h4>
                    <p className="text-xs text-slate-500">Adjunta respaldos antes de crear la póliza.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActivePolicyId(DRAFT_POLICY_ID)}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    {newPolicyAttachments.length ? "Gestionar adjuntos" : "Adjuntar documentos"}
                  </button>
                </div>
                <div className="mt-2">
                  {newPolicyAttachments.length ? (
                    <ul className="space-y-1">
                      {newPolicyAttachments.map((attachment, index) => (
                        <li key={`${attachment.file.name}-${index}`} className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            {policyCategoryLabels[attachment.category] ?? attachment.category}
                          </span>
                          {attachment.label?.trim() ? (
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              {attachment.label}
                            </span>
                          ) : null}
                          <span className="truncate text-slate-500" title={attachment.file.name}>
                            {attachment.file.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400">No hay documentos adjuntos todavía.</p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Se agregará la póliza y quedará asociada al cliente actual.
                </span>
                <button
                  type="button"
                  onClick={handleCreatePolicy}
                  disabled={isPolicySaving || !policyForm.insurerId}
                  className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {isPolicySaving ? "Guardando…" : "Crear póliza"}
                </button>
              </div>
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
                        {(policy.type ?? "Póliza") +
                          (policy.policy_number ? ` #${policy.policy_number}` : "") +
                          ` · ${insurerNameById(policy.insurer_id)}`}
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
          disabled={!isEditing || isSaving}
          onClick={onSave}
          className={`px-4 py-2 rounded-lg text-white font-semibold ${
            isEditing && !isSaving
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-emerald-300 cursor-not-allowed"
          }`}
        >
          {isSaving ? "Guardando..." : "Guardar cambios"}
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
      <UploadModal
        open={Boolean(activePolicyId)}
        title="Adjuntar documentos a póliza"
        categories={DEFAULT_DOCUMENT_CATEGORIES}
        initialFiles={activePolicyAttachments}
        onClose={() => setActivePolicyId(null)}
        onConfirm={(files) => {
          if (activePolicyId === DRAFT_POLICY_ID) {
            setNewPolicyAttachments(files);
          } else if (activePolicyId) {
            setPolicyAttachments((prev) => ({ ...prev, [activePolicyId]: files }));
          }
          setActivePolicyId(null);
        }}
      />
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
