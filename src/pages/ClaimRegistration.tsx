import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import {
  apiCreateClaim,
  apiListClaims,
  apiListClients,
  type CreateClaimPayload,
  type ClaimItem,
  type ClientListItem,
  type PolicySummary,
} from "../services/api";

type ClaimRecord = {
  id: string;
  poliza?: string | null;
  policyType?: string | null;
  insurerName?: string | null;
  tipo: string;
  fecha: string;
  estado: string;
  resumen: string;
  prioridad?: string | null;
  canal?: string | null;
  asegurado?: string | null;
  ubicacion?: string | null;
};

type ClientWithPolicies = ClientListItem & { policies?: PolicySummary[] };

const EVENT_TYPES = ["Automotor", "Hogar", "Accidentes personales", "Responsabilidad civil", "Garantía de alquiler"];
const PRIORITIES = ["Alta", "Media", "Baja"];
const NOTIFICATION_CHANNELS = ["WhatsApp", "Email", "Teléfono"];

export default function ClaimRegistration() {
  const { token } = useAuth();
  const [claimForm, setClaimForm] = useState({
    clienteId: "",
    asegurado: "",
    documento: "",
    contacto: "",
    telefono: "",
    poliza: "",
    tipo: EVENT_TYPES[0],
    fecha: "",
    hora: "",
    ubicacion: "",
    descripcion: "",
    danosTerceros: false,
    requiereGrua: false,
    prioridad: PRIORITIES[0],
    canal: NOTIFICATION_CHANNELS[0],
    responsableInterno: "Equipo Siniestros",
    observaciones: "",
    notificarCliente: true,
    notificarProductor: true,
  });

  const [clients, setClients] = useState<ClientWithPolicies[]>([]);
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [documentChecklist, setDocumentChecklist] = useState({
    fotos: true,
    denunciaPolicial: true,
    cedula: false,
    informeMedico: false,
    presupuesto: false,
  });

  const [isLoadingData, setLoadingData] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedClient = useMemo(() => clients.find((client) => client.id === claimForm.clienteId), [clients, claimForm.clienteId]);
  const policyOptions = selectedClient?.policies ?? [];
  const selectedPolicy = useMemo(() => policyOptions.find((policy) => policy.id === claimForm.poliza), [policyOptions, claimForm.poliza]);
  const formatPolicyLabel = (policy?: PolicySummary) =>
    [policy?.type ?? "Póliza", policy?.insurer ? `· ${policy.insurer}` : null, policy?.id ? `(${policy.id})` : null]
      .filter(Boolean)
      .join(" ");
  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleDateString("es-UY");
  };

  const checklistCount = useMemo(() => {
    const total = Object.keys(documentChecklist).length;
    const ready = Object.values(documentChecklist).filter(Boolean).length;
    return { total, ready };
  }, [documentChecklist]);

  const mapClaimFromApi = (item: ClaimItem): ClaimRecord => ({
    id: item.id,
    poliza: item.policy_id ?? null,
    policyType: item.policy_type ?? null,
    insurerName: item.insurer_name ?? null,
    tipo: item.type ?? "Siniestro",
    fecha: item.event_date ? item.event_date.slice(0, 10) : "",
    estado: item.status ?? "Denuncia ingresada",
    resumen: item.description ?? "",
    prioridad: item.priority ?? null,
    canal: item.channel ?? null,
    asegurado: item.client_name ?? null,
    ubicacion: item.location ?? null,
  });

  useEffect(() => {
    if (!token) return;
    setLoadingData(true);
    setError(null);

    Promise.all([apiListClients(token), apiListClaims(token)])
      .then(([clientsResponse, claimsResponse]) => {
        const clientsFromApi: ClientWithPolicies[] = (clientsResponse.items ?? []).map((item: ClientListItem) => ({
          ...item,
          policies: item.policies ?? [],
        }));

        setClients(clientsFromApi);

        if (clientsFromApi.length > 0) {
          const defaultClient = clientsFromApi[0];
          setClaimForm((current) => ({
            ...current,
            clienteId: defaultClient.id,
            asegurado: defaultClient.name,
            documento: defaultClient.document ?? "",
            contacto: defaultClient.contacts?.[0]?.email ?? "",
            telefono: defaultClient.contacts?.[0]?.phone ?? "",
            poliza: defaultClient.policies?.[0]?.id ?? "",
          }));
        }

        const mappedClaims = (claimsResponse.items ?? []).map((item: ClaimItem) => mapClaimFromApi(item));
        setClaims(mappedClaims);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar los datos de siniestros"))
      .finally(() => setLoadingData(false));
  }, [token]);

  const toggleChecklist = (field: keyof typeof documentChecklist) => {
    setDocumentChecklist((current) => ({ ...current, [field]: !current[field] }));
  };

  const handleClientChange = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    setClaimForm((current) => ({
      ...current,
      clienteId: clientId,
      asegurado: client?.name ?? "",
      documento: client?.document ?? "",
      contacto: client?.contacts?.[0]?.email ?? "",
      telefono: client?.contacts?.[0]?.phone ?? "",
      poliza: client?.policies?.[0]?.id ?? "",
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError("Debes iniciar sesión para registrar el siniestro.");
      return;
    }

    if (!claimForm.clienteId || !claimForm.poliza || !claimForm.fecha || !claimForm.descripcion || !claimForm.ubicacion) {
      setError("Completa cliente, póliza, fecha, ubicación y descripción del evento para registrar el siniestro.");
      return;
    }

    setSubmitting(true);

    try {
      const payload: CreateClaimPayload = {
        client_id: claimForm.clienteId,
        policy_id: claimForm.poliza,
        type: claimForm.tipo,
        event_date: claimForm.fecha,
        event_time: claimForm.hora || null,
        location: claimForm.ubicacion,
        description: claimForm.descripcion,
        priority: claimForm.prioridad,
        channel: claimForm.canal,
        internal_owner: claimForm.responsableInterno,
        third_party_damage: claimForm.danosTerceros,
        tow_needed: claimForm.requiereGrua,
        notify_client: claimForm.notificarCliente,
        notify_broker: claimForm.notificarProductor,
        notes: claimForm.observaciones,
        contact_email: claimForm.contacto || null,
        contact_phone: claimForm.telefono || null,
      };

      const response = await apiCreateClaim(payload, token);
      const newClaim = mapClaimFromApi(response.item);

      setClaims((current) => [newClaim, ...current.filter((claim) => claim.id !== newClaim.id)]);

      const policyLabel = selectedPolicy?.type ?? selectedPolicy?.id ?? claimForm.poliza;
      setSuccess(
        `Denuncia registrada en base para la póliza ${policyLabel}. Se notifica al asegurado por ${claimForm.canal} y queda en seguimiento interno.`,
      );

      setClaimForm((current) => ({
        ...current,
        fecha: "",
        hora: "",
        ubicacion: "",
        descripcion: "",
        observaciones: "",
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el siniestro en la base de datos");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6">
      <header className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-slate-900">Registro de siniestro</h1>
          <p className="text-slate-600 max-w-3xl">
            Toma la denuncia con datos mínimos, valida la póliza y genera tareas internas automáticas. El registro deja
            preparada la comunicación al cliente y al equipo de siniestros.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="xl:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Datos del asegurado</h2>
                <p className="text-sm text-slate-600">Confirmamos identidad y contacto antes de registrar.</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                Pólizas vinculadas: {policyOptions.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="cliente">
                  Cliente
                </label>
                <select
                  id="cliente"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                  value={claimForm.clienteId}
                  onChange={(event) => handleClientChange(event.target.value)}
                  disabled={isLoadingData || clients.length === 0}
                >
                  <option value="">Selecciona un cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="documento">
                  Documento
                </label>
                <input
                  id="documento"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                  value={claimForm.documento}
                  onChange={(event) => setClaimForm((current) => ({ ...current, documento: event.target.value }))}
                  placeholder="RUT o documento"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="asegurado">
                  Asegurado
                </label>
                <input
                  id="asegurado"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                  value={claimForm.asegurado}
                  onChange={(event) => setClaimForm((current) => ({ ...current, asegurado: event.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="contacto">
                  Email de contacto
                </label>
                <input
                  id="contacto"
                  type="email"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                  value={claimForm.contacto}
                  onChange={(event) => setClaimForm((current) => ({ ...current, contacto: event.target.value }))}
                  placeholder="correo@cliente.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="telefono">
                  Teléfono
                </label>
                <input
                  id="telefono"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                  value={claimForm.telefono}
                  onChange={(event) => setClaimForm((current) => ({ ...current, telefono: event.target.value }))}
                  placeholder="+598 …"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="responsableInterno">
                  Responsable interno
                </label>
                <input
                  id="responsableInterno"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                  value={claimForm.responsableInterno}
                  onChange={(event) => setClaimForm((current) => ({ ...current, responsableInterno: event.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Detalles del siniestro</h2>
                <p className="text-sm text-slate-600">Datos mínimos para abrir el expediente y solicitar documentación.</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Canal: {claimForm.canal}
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  Prioridad: {claimForm.prioridad}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="poliza">
                  Póliza
                </label>
                <select
                  id="poliza"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                  value={claimForm.poliza}
                  onChange={(event) => setClaimForm((current) => ({ ...current, poliza: event.target.value }))}
                  disabled={policyOptions.length === 0}
                >
                  {policyOptions.length === 0 && <option value="">No hay pólizas para el cliente seleccionado</option>}
                  {policyOptions.map((policy) => (
                    <option key={policy.id} value={policy.id}>
                      {formatPolicyLabel(policy)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="tipo">
                  Tipo de evento
                </label>
                <select
                  id="tipo"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                  value={claimForm.tipo}
                  onChange={(event) => setClaimForm((current) => ({ ...current, tipo: event.target.value }))}
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="fecha">
                  Fecha
                </label>
                <input
                  id="fecha"
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                  value={claimForm.fecha}
                  onChange={(event) => setClaimForm((current) => ({ ...current, fecha: event.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="hora">
                  Hora
                </label>
                <input
                  id="hora"
                  type="time"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                  value={claimForm.hora}
                  onChange={(event) => setClaimForm((current) => ({ ...current, hora: event.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="prioridad">
                  Prioridad
                </label>
                <select
                  id="prioridad"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                  value={claimForm.prioridad}
                  onChange={(event) => setClaimForm((current) => ({ ...current, prioridad: event.target.value }))}
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="ubicacion">
                  Ubicación
                </label>
                <input
                  id="ubicacion"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                  placeholder="Ej: Av. Italia y Propios, Montevideo"
                  value={claimForm.ubicacion}
                  onChange={(event) => setClaimForm((current) => ({ ...current, ubicacion: event.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="canal">
                  Canal de ingreso
                </label>
                <select
                  id="canal"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                  value={claimForm.canal}
                  onChange={(event) => setClaimForm((current) => ({ ...current, canal: event.target.value }))}
                >
                  {NOTIFICATION_CHANNELS.map((channel) => (
                    <option key={channel} value={channel}>
                      {channel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="descripcion">
                Descripción del evento
              </label>
              <textarea
                id="descripcion"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                rows={4}
                placeholder="Ej: Choque leve con tercero, sin lesionados. Vehículo en condiciones de circular."
                value={claimForm.descripcion}
                onChange={(event) => setClaimForm((current) => ({ ...current, descripcion: event.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  checked={claimForm.danosTerceros}
                  onChange={(event) => setClaimForm((current) => ({ ...current, danosTerceros: event.target.checked }))}
                />
                <div className="text-sm">
                  <div className="font-semibold text-slate-800">Hay daños a terceros</div>
                  <div className="text-slate-500 text-xs">Activa solicitud de documentación adicional.</div>
                </div>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  checked={claimForm.requiereGrua}
                  onChange={(event) => setClaimForm((current) => ({ ...current, requiereGrua: event.target.checked }))}
                />
                <div className="text-sm">
                  <div className="font-semibold text-slate-800">Requiere asistencia grúa</div>
                  <div className="text-slate-500 text-xs">Se agenda servicio y se notifica al asegurado.</div>
                </div>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  checked={claimForm.notificarCliente}
                  onChange={(event) => setClaimForm((current) => ({ ...current, notificarCliente: event.target.checked }))}
                />
                <div className="text-sm">
                  <div className="font-semibold text-slate-800">Notificar al cliente</div>
                  <div className="text-slate-500 text-xs">Envía confirmación y checklist actualizado.</div>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  checked={claimForm.notificarProductor}
                  onChange={(event) =>
                    setClaimForm((current) => ({ ...current, notificarProductor: event.target.checked }))
                  }
                />
                <div className="text-sm">
                  <div className="font-semibold text-slate-800">Notificar al productor</div>
                  <div className="text-slate-500 text-xs">Copia a ejecutivo comercial y backoffice.</div>
                </div>
              </label>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="observaciones">
                  Observaciones internas
                </label>
                <textarea
                  id="observaciones"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                  rows={2}
                  placeholder="Notas para backoffice o ajustes."
                  value={claimForm.observaciones}
                  onChange={(event) => setClaimForm((current) => ({ ...current, observaciones: event.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-slate-500">
                Al registrar se crea la tarea interna y se guarda la constancia para el cliente.
              </div>
              <button
                type="submit"
                disabled={isSubmitting || isLoadingData || clients.length === 0}
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:opacity-60"
              >
                {isSubmitting ? "Registrando…" : "Registrar siniestro"}
              </button>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
            {success && (
              <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">{success}</p>
            )}
          </div>

          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Checklist de documentación</h3>
                <p className="text-sm text-slate-600">Control rápido antes de escalar el expediente.</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {checklistCount.ready} / {checklistCount.total} listo
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  checked={documentChecklist.fotos}
                  onChange={() => toggleChecklist("fotos")}
                />
                <div>
                  <div className="font-semibold text-slate-800 text-sm">Fotos del evento</div>
                  <div className="text-xs text-slate-500">Daño a vehículos o inmueble.</div>
                </div>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  checked={documentChecklist.denunciaPolicial}
                  onChange={() => toggleChecklist("denunciaPolicial")}
                />
                <div>
                  <div className="font-semibold text-slate-800 text-sm">Denuncia policial</div>
                  <div className="text-xs text-slate-500">Obligatoria para robo o accidente con terceros.</div>
                </div>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  checked={documentChecklist.cedula}
                  onChange={() => toggleChecklist("cedula")}
                />
                <div>
                  <div className="font-semibold text-slate-800 text-sm">Cédula y licencia</div>
                  <div className="text-xs text-slate-500">Identificación vigente del conductor.</div>
                </div>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  checked={documentChecklist.informeMedico}
                  onChange={() => toggleChecklist("informeMedico")}
                />
                <div>
                  <div className="font-semibold text-slate-800 text-sm">Informe médico</div>
                  <div className="text-xs text-slate-500">Solo si hubo lesionados.</div>
                </div>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  checked={documentChecklist.presupuesto}
                  onChange={() => toggleChecklist("presupuesto")}
                />
                <div>
                  <div className="font-semibold text-slate-800 text-sm">Presupuesto de reparación</div>
                  <div className="text-xs text-slate-500">Para habilitar adelanto de fondos.</div>
                </div>
              </label>
            </div>
          </div>
        </form>

        <div className="space-y-4">
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-3">
            <h3 className="text-lg font-semibold text-slate-800">Resumen del reporte</h3>
            <p className="text-sm text-slate-600">Validamos póliza, vigencia y contactos antes de enviar.</p>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">Cliente</span>
                <span>{selectedClient?.name ?? "Selecciona un cliente"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">Documento</span>
                <span>{selectedClient?.document ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">Póliza</span>
                <span>{selectedPolicy ? formatPolicyLabel(selectedPolicy) : "Sin póliza seleccionada"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">Aseguradora</span>
                <span>{selectedPolicy?.insurer ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">Vigencia</span>
                <span>{selectedPolicy?.next_renewal ? `Próxima renovación ${formatDate(selectedPolicy.next_renewal)}` : "Sin dato"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">Prioridad</span>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {claimForm.prioridad}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">Canal</span>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                  {claimForm.canal}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">Notificaciones</span>
                <span className="text-xs text-slate-600">
                  Cliente: {claimForm.notificarCliente ? "Sí" : "No"} · Productor: {claimForm.notificarProductor ? "Sí" : "No"}
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
              <div className="font-semibold text-emerald-900 mb-1">Próximo paso</div>
              <p className="leading-relaxed">
                Enviar acuse al cliente, solicitar documentación faltante y crear tarea para seguimiento de daños a terceros.
              </p>
              <p className="mt-2 text-xs text-emerald-700">
                Checklist: {checklistCount.ready}/{checklistCount.total} completado · Responsable: {claimForm.responsableInterno}
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Siniestros recientes</h3>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {claims.length} registros
              </span>
            </div>
            {isLoadingData ? (
              <div className="text-sm text-slate-500">Cargando siniestros desde la base…</div>
            ) : claims.length === 0 ? (
              <div className="text-sm text-slate-500">Aún no hay siniestros registrados en la base de datos.</div>
            ) : (
              <ul className="space-y-3">
                {claims.map((claim) => (
                  <li key={claim.id} className="rounded-xl border border-slate-100 px-4 py-3 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {claim.id} · {claim.tipo}
                        </div>
                        <div className="text-xs text-slate-500">
                          {claim.fecha} · Póliza {claim.policyType ?? claim.poliza}
                          {claim.insurerName ? ` · ${claim.insurerName}` : ""}
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 text-xs font-semibold">
                        {claim.estado}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{claim.resumen}</p>
                    <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
                      <span>Canal: {claim.canal ?? "—"}</span>
                      <span>Prioridad: {claim.prioridad ?? "—"}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
