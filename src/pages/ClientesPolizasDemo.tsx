import { useMemo, useState } from "react";

type Policy = {
  id: string;
  tipo: string;
  ramo: string;
  aseguradora: string;
  numero: string;
  vigenciaDesde: string;
  vigenciaHasta: string;
  prima?: number;
  deducible?: string;
  beneficiario?: string;
  formaPago?: string;
  estado?: string;
};

type Claim = {
  id: string;
  descripcion: string;
  estado: "En análisis" | "Documentación" | "Liquidadas" | "Finalizado";
  fecha: string;
  policyId?: string;
};

type PolicyTypeOption = {
  id: string;
  label: string;
  ramo: string;
  descripcion: string;
};

const POLICY_RAMO = [
  "Automotor",
  "Hogar",
  "Vida Colectivo",
  "Agro",
  "Accidentes Personales",
  "Garantía de alquiler",
];

const POLICY_TYPES: PolicyTypeOption[] = [
  {
    id: "auto-particular",
    label: "Auto particular",
    ramo: "Automotor",
    descripcion: "Siniestros de tránsito, robo parcial/total y asistencia en ruta.",
  },
  {
    id: "hogar-premium",
    label: "Hogar premium",
    ramo: "Hogar",
    descripcion: "Incendio, robo de contenidos y responsabilidad civil en el hogar.",
  },
  {
    id: "vida-colectivo",
    label: "Vida colectivo",
    ramo: "Vida Colectivo",
    descripcion: "Cobertura para nóminas, renovación anual y suma asegurada pactada.",
  },
  {
    id: "agro-integral",
    label: "Agro integral",
    ramo: "Agro",
    descripcion: "Granizo, heladas y eventos climáticos sobre cultivos.",
  },
  {
    id: "accidentes-personales",
    label: "Accidentes personales",
    ramo: "Accidentes Personales",
    descripcion: "Cobertura individual o por nómina ante lesiones y gastos médicos.",
  },
  {
    id: "garantia-alquiler",
    label: "Garantía de alquiler",
    ramo: "Garantía de alquiler",
    descripcion: "Daños y falta de pago en contratos de arrendamiento.",
  },
];

const CLAIM_STATES: Claim["estado"][] = [
  "En análisis",
  "Documentación",
  "Liquidadas",
  "Finalizado",
];

const PAYMENT_METHODS = [
  "Débito automático",
  "Transferencia mensual",
  "Tarjeta de crédito",
  "Efectivo en agencia",
];

const INSURERS = [
  "Porto",
  "Mapfre",
  "Sura",
  "Allianz",
  "Liberty",
];

const INITIAL_POLICIES: Policy[] = [
  {
    id: "pol-100",
    tipo: "auto-particular",
    ramo: "Automotor",
    aseguradora: "Porto",
    numero: "AU-2024-0345",
    vigenciaDesde: "2024-02-01",
    vigenciaHasta: "2025-01-31",
    prima: 450,
    deducible: "USD 500",
    beneficiario: "Titular",
    formaPago: "Débito automático",
    estado: "Vigente",
  },
  {
    id: "pol-101",
    tipo: "vida-colectivo",
    ramo: "Vida Colectivo",
    aseguradora: "Sura",
    numero: "VC-2023-0911",
    vigenciaDesde: "2023-09-01",
    vigenciaHasta: "2024-08-31",
    prima: 320,
    deducible: "Sin deducible",
    beneficiario: "Colaboradores",
    formaPago: "Transferencia mensual",
    estado: "Vigente",
  },
];

const INITIAL_CLAIMS: Claim[] = [
  {
    id: "sin-51",
    descripcion: "Choque leve - vehículo titular",
    estado: "En análisis",
    fecha: "2024-03-02",
    policyId: "pol-100",
  },
  {
    id: "sin-52",
    descripcion: "Humo en cocina - departamento",
    estado: "Documentación",
    fecha: "2024-02-18",
  },
  {
    id: "sin-53",
    descripcion: "Caída de colaborador",
    estado: "Liquidadas",
    fecha: "2024-01-25",
  },
];

export default function ClientesPolizasDemo() {
  const [policies, setPolicies] = useState(INITIAL_POLICIES);
  const [claims, setClaims] = useState(INITIAL_CLAIMS);

  const [form, setForm] = useState({
    tipo: POLICY_TYPES[0].id,
    ramo: POLICY_RAMO[0],
    aseguradora: INSURERS[0],
    numero: "",
    vigenciaDesde: "",
    vigenciaHasta: "",
    prima: "",
    deducible: "",
    beneficiario: "Titular",
    formaPago: PAYMENT_METHODS[0],
  });

  const [constancia, setConstancia] = useState<Policy | null>(null);
  const [constanciaMensaje, setConstanciaMensaje] = useState("");

  const [claimForm, setClaimForm] = useState({
    descripcion: "",
    fecha: "",
    estado: CLAIM_STATES[0],
    policyId: "",
  });

  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("");

  const findPolicyType = (id: string) => POLICY_TYPES.find((type) => type.id === id);
  const selectedPolicyType = useMemo(() => findPolicyType(form.tipo), [form.tipo]);

  const nextPolicyId = useMemo(() => `pol-${100 + policies.length}`, [policies.length]);
  const nextClaimId = useMemo(() => `sin-${50 + claims.length + 1}`, [claims.length]);

  const addPolicy = () => {
    if (!form.vigenciaDesde || !form.vigenciaHasta) {
      return;
    }

    const generatedNumber = form.numero || `${form.ramo.slice(0, 3).toUpperCase()}-${new Date().getFullYear()}-${String(100 + policies.length).padStart(4, "0")}`;

    const newPolicy: Policy = {
      id: nextPolicyId,
      tipo: form.tipo,
      ramo: form.ramo,
      aseguradora: form.aseguradora,
      numero: generatedNumber,
      vigenciaDesde: form.vigenciaDesde,
      vigenciaHasta: form.vigenciaHasta,
      prima: form.prima ? Number(form.prima) : undefined,
      deducible: form.deducible || undefined,
      beneficiario: form.beneficiario || undefined,
      formaPago: form.formaPago,
      estado: "Generada",
    };

    setPolicies((prev) => [...prev, newPolicy]);
    setForm({ tipo: POLICY_TYPES[0].id, ramo: POLICY_RAMO[0], aseguradora: INSURERS[0], numero: "", vigenciaDesde: "", vigenciaHasta: "", prima: "", deducible: "", beneficiario: "Titular", formaPago: PAYMENT_METHODS[0] });
    setSelectedPolicyId(newPolicy.id);

    setConstancia(newPolicy);
    setConstanciaMensaje(
      `Póliza ${generatedNumber} (${getPolicyTypeLabel(newPolicy.tipo)}) generada para ${newPolicy.aseguradora}. Listo para enviar constancia al cliente con deducible ${newPolicy.deducible || "pendiente"} y forma de pago ${newPolicy.formaPago?.toLowerCase()}.`,
    );
  };

  const addClaim = () => {
    if (!claimForm.descripcion || !claimForm.fecha) return;

    const newClaim: Claim = {
      id: nextClaimId,
      descripcion: claimForm.descripcion,
      estado: claimForm.estado,
      fecha: claimForm.fecha,
      policyId: claimForm.policyId || undefined,
    };

    setClaims((prev) => [...prev, newClaim]);
    setSelectedClaim(newClaim);
    setSelectedPolicyId(claimForm.policyId);
    setClaimForm({ descripcion: "", fecha: "", estado: CLAIM_STATES[0], policyId: "" });
  };

  const associateClaim = () => {
    if (!selectedClaim || !selectedPolicyId) return;

    setClaims((prev) =>
      prev.map((claim) =>
        claim.id === selectedClaim.id
          ? {
              ...claim,
              policyId: selectedPolicyId,
              estado: claim.estado === "Finalizado" ? claim.estado : "Documentación",
            }
          : claim,
      ),
    );
  };

  const selectedPolicy = policies.find((policy) => policy.id === selectedPolicyId);

  const getPolicyTypeLabel = (id?: string) => (id ? findPolicyType(id)?.label ?? id : "");

  const formatCurrency = (value?: number) =>
    typeof value === "number"
      ? new Intl.NumberFormat("es-UY", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)
      : "";

  const copiarConstancia = async () => {
    if (!constancia) return;

    const texto = [
      `Póliza ${constancia.numero}`,
      constancia.tipo ? `Tipo: ${getPolicyTypeLabel(constancia.tipo)}` : null,
      `Ramo: ${constancia.ramo}`,
      `Aseguradora: ${constancia.aseguradora}`,
      `Vigencia: ${constancia.vigenciaDesde} → ${constancia.vigenciaHasta}`,
      constancia.prima ? `Prima: ${formatCurrency(constancia.prima)}` : null,
      constancia.deducible ? `Deducible: ${constancia.deducible}` : null,
      constancia.formaPago ? `Forma de pago: ${constancia.formaPago}` : null,
      constancia.beneficiario ? `Beneficiario: ${constancia.beneficiario}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    if (!navigator.clipboard) {
      setConstanciaMensaje("No se pudo copiar automáticamente. Usa la constancia visual para compartirla.");
      return;
    }

    await navigator.clipboard.writeText(texto);
    setConstanciaMensaje("Constancia copiada. Compártela por correo o WhatsApp.");
  };

  return (
    <div className="flex-1 flex flex-col gap-6">
      <header className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-slate-900">Demo: alta de pólizas y asociación con siniestros</h1>
        <p className="mt-2 text-slate-600 max-w-3xl">
          Esta vista simula el flujo mínimo que el equipo quiere construir: cargar una póliza nueva y vincularla con un
          siniestro reportado por el cliente.
        </p>
      </header>

      <section className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-800">Alta rápida de póliza</h2>
          <p className="mt-1 text-sm text-slate-600">
            Completa el formulario para generar la póliza, guardar la constancia y dejarla lista para compartir con el cliente.
          </p>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col text-sm text-slate-700 gap-1">
              Ramo
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={form.ramo}
                onChange={(event) => setForm((prev) => ({ ...prev, ramo: event.target.value }))}
              >
                {POLICY_RAMO.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col text-sm text-slate-700 gap-1">
              Tipo de póliza
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={form.tipo}
                onChange={(event) => setForm((prev) => ({ ...prev, tipo: event.target.value }))}
              >
                {POLICY_TYPES.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} · {option.ramo}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-500">{selectedPolicyType?.descripcion}</span>
            </label>

            <label className="flex flex-col text-sm text-slate-700 gap-1">
              Aseguradora
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={form.aseguradora}
                onChange={(event) => setForm((prev) => ({ ...prev, aseguradora: event.target.value }))}
              >
                {INSURERS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col text-sm text-slate-700 gap-1 md:col-span-2">
              Número de póliza
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={form.numero}
                placeholder="Ej. AU-2024-0456"
                onChange={(event) => setForm((prev) => ({ ...prev, numero: event.target.value }))}
              />
            </label>

            <label className="flex flex-col text-sm text-slate-700 gap-1">
              Vigencia desde
              <input
                type="date"
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={form.vigenciaDesde}
                onChange={(event) => setForm((prev) => ({ ...prev, vigenciaDesde: event.target.value }))}
              />
            </label>

            <label className="flex flex-col text-sm text-slate-700 gap-1">
              Vigencia hasta
              <input
                type="date"
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={form.vigenciaHasta}
                onChange={(event) => setForm((prev) => ({ ...prev, vigenciaHasta: event.target.value }))}
              />
            </label>

            <label className="flex flex-col text-sm text-slate-700 gap-1">
              Prima mensual (USD)
              <input
                type="number"
                min={0}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={form.prima}
                placeholder="Ej. 420"
                onChange={(event) => setForm((prev) => ({ ...prev, prima: event.target.value }))}
              />
            </label>

            <label className="flex flex-col text-sm text-slate-700 gap-1">
              Deducible
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={form.deducible}
                placeholder="Ej. USD 500"
                onChange={(event) => setForm((prev) => ({ ...prev, deducible: event.target.value }))}
              />
            </label>

            <label className="flex flex-col text-sm text-slate-700 gap-1">
              Beneficiario
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={form.beneficiario}
                placeholder="Titular / Nómina / Bien"
                onChange={(event) => setForm((prev) => ({ ...prev, beneficiario: event.target.value }))}
              />
            </label>

            <label className="flex flex-col text-sm text-slate-700 gap-1">
              Forma de pago
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={form.formaPago}
                onChange={(event) => setForm((prev) => ({ ...prev, formaPago: event.target.value }))}
              >
                {PAYMENT_METHODS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={addPolicy}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
            >
              Generar póliza y constancia
            </button>
            <span className="text-xs text-slate-500">
              ID sugerido: <strong className="font-semibold text-slate-700">{nextPolicyId}</strong>
            </span>
          </div>

          {constancia && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wide font-semibold text-emerald-700">Constancia generada</div>
                  <div className="text-sm font-semibold text-slate-900">{constancia.numero} · {constancia.aseguradora}</div>
                  <div className="text-xs text-slate-600">{constancia.vigenciaDesde} → {constancia.vigenciaHasta}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
                  {constancia.tipo && <span className="rounded-full bg-white px-3 py-1 font-semibold text-emerald-700">{getPolicyTypeLabel(constancia.tipo)}</span>}
                  {constancia.prima !== undefined && <span className="rounded-full bg-white px-3 py-1 font-semibold text-emerald-700">Prima {formatCurrency(constancia.prima)}</span>}
                  {constancia.deducible && <span className="rounded-full bg-white px-3 py-1">Deducible {constancia.deducible}</span>}
                  {constancia.formaPago && <span className="rounded-full bg-white px-3 py-1">{constancia.formaPago}</span>}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
                <div className="rounded-lg bg-white/80 px-3 py-2">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Beneficiario</div>
                  <div className="font-semibold text-slate-900">{constancia.beneficiario || "Titular"}</div>
                </div>
                <div className="rounded-lg bg-white/80 px-3 py-2">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Estado</div>
                  <div className="font-semibold text-slate-900">{constancia.estado ?? "Generada"}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-emerald-800 sm:max-w-xl">{constanciaMensaje}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={copiarConstancia}
                    className="inline-flex items-center justify-center rounded-lg border border-emerald-600 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-white"
                  >
                    Copiar constancia
                  </button>
                  <button
                    type="button"
                    onClick={() => setConstanciaMensaje("Constancia marcada como enviada al cliente.")}
                    className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Marcar como enviada
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="xl:col-span-2 bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-800">Resumen de pólizas</h2>
          <p className="mt-1 text-sm text-slate-600">Todas las pólizas vigentes quedarán disponibles para asociarlas con siniestros.</p>
          <ul className="mt-4 space-y-3">
            {policies.map((policy) => (
              <li key={policy.id} className="rounded-xl border border-slate-100 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {policy.numero}
                    </div>
                    <div className="text-xs text-slate-500">
                      {getPolicyTypeLabel(policy.tipo)} · {policy.ramo} · {policy.aseguradora}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {policy.vigenciaDesde} → {policy.vigenciaHasta}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                      {policy.tipo && <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">{getPolicyTypeLabel(policy.tipo)}</span>}
                      {policy.prima !== undefined && <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">Prima {formatCurrency(policy.prima)}</span>}
                      {policy.deducible && <span className="rounded-full bg-slate-100 px-2 py-0.5">Deducible {policy.deducible}</span>}
                      {policy.estado && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700 font-semibold">{policy.estado}</span>}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">{policy.id}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-2 bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-slate-800">Seleccionar siniestro</h2>
            <p className="text-sm text-slate-600">Elige uno para asignarle la póliza recién creada o alguna existente.</p>
          </div>

          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-800">Alta express de siniestro</h3>
            <p className="mt-1 text-xs text-slate-500">
              Carga los datos mínimos para registrar el reclamo del cliente y habilitar la asociación inmediata con una póliza.
            </p>

            <div className="mt-3 grid grid-cols-1 gap-3">
              <label className="flex flex-col text-sm text-slate-700 gap-1">
                Descripción
                <input
                  value={claimForm.descripcion}
                  onChange={(event) => setClaimForm((prev) => ({ ...prev, descripcion: event.target.value }))}
                  placeholder="Ej. Impacto leve en paragolpes"
                  className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex flex-col text-sm text-slate-700 gap-1">
                  Fecha del siniestro
                  <input
                    type="date"
                    value={claimForm.fecha}
                    onChange={(event) => setClaimForm((prev) => ({ ...prev, fecha: event.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </label>

                <label className="flex flex-col text-sm text-slate-700 gap-1">
                  Estado inicial
                  <select
                    value={claimForm.estado}
                    onChange={(event) => setClaimForm((prev) => ({ ...prev, estado: event.target.value as Claim["estado"] }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {CLAIM_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex flex-col text-sm text-slate-700 gap-1">
                Vincular póliza (opcional)
                <select
                  value={claimForm.policyId}
                  onChange={(event) => setClaimForm((prev) => ({ ...prev, policyId: event.target.value }))}
                  className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Seleccionar</option>
                  {policies.map((policy) => (
                    <option key={policy.id} value={policy.id}>
                      {policy.numero} · {getPolicyTypeLabel(policy.tipo) || policy.ramo}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-500">ID sugerido: {nextClaimId}</span>
              </label>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={addClaim}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Registrar siniestro demo
                </button>
              </div>
            </div>
          </div>

          <ul className="mt-4 space-y-3">
            {claims.map((claim) => {
              const isSelected = selectedClaim?.id === claim.id;
              const policy = policies.find((item) => item.id === claim.policyId);

              return (
                <li key={claim.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedClaim(claim)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition hover:border-emerald-400 hover:bg-emerald-50 ${
                      isSelected ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{claim.id}</span>
                      <span>{claim.fecha}</span>
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{claim.descripcion}</div>
                    <div className="mt-0.5 text-xs text-slate-600">Estado: {claim.estado}</div>
                    <div className="mt-0.5 text-xs text-slate-600">
                      Póliza asociada: {policy ? `${policy.numero} (${getPolicyTypeLabel(policy.tipo) || policy.ramo})` : "sin vínculo"}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="xl:col-span-3 bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-800">Asociar póliza al siniestro</h2>
          <p className="mt-1 text-sm text-slate-600">
            Con un click se guarda la relación para que el equipo de siniestros siga la trazabilidad.
          </p>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Siniestro seleccionado</div>
              {selectedClaim ? (
                <div className="mt-2 text-sm text-slate-800">
                  <div className="font-semibold text-slate-900">{selectedClaim.descripcion}</div>
                  <div className="text-xs text-slate-500">
                    {selectedClaim.id} · {selectedClaim.fecha}
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-sm text-slate-500">Elige un siniestro para habilitar la asociación.</div>
              )}
            </div>

            <label className="flex flex-col text-sm text-slate-700 gap-1">
              Póliza disponible
              <select
                disabled={!selectedClaim}
                value={selectedPolicyId}
                onChange={(event) => setSelectedPolicyId(event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100"
              >
                <option value="">Seleccionar</option>
                {policies.map((policy) => (
                  <option key={policy.id} value={policy.id}>
                    {policy.numero} · {getPolicyTypeLabel(policy.tipo) || policy.ramo}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <button
              type="button"
              onClick={associateClaim}
              disabled={!selectedClaim || !selectedPolicyId}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Guardar asociación demo
            </button>

            {selectedClaim && selectedPolicy ? (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs text-indigo-700">
                <div className="font-semibold">Resultado simulado</div>
                <p>
                  El siniestro <strong>{selectedClaim.id}</strong> queda vinculado a la póliza <strong>{selectedPolicy.numero}</strong> ({getPolicyTypeLabel(selectedPolicy.tipo)}).
                  El equipo verá la trazabilidad completa en la ficha integral del cliente.
                </p>
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                Selecciona siniestro y póliza para mostrar la confirmación.
              </div>
            )}
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-800">Próximos pasos sugeridos</h3>
            <ol className="mt-3 space-y-2 text-sm text-slate-600 list-decimal list-inside">
              <li>Enviar correo automático al cliente confirmando el alta y cobertura.</li>
              <li>Adjuntar documentación del siniestro y habilitar subida desde el portal.</li>
              <li>Sincronizar el estado de la póliza con el workflow de siniestros.</li>
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
}
