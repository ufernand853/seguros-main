import { useMemo, useState } from "react";

type Policy = {
  id: string;
  ramo: string;
  aseguradora: string;
  numero: string;
  vigenciaDesde: string;
  vigenciaHasta: string;
};

type Claim = {
  id: string;
  descripcion: string;
  estado: "En análisis" | "Documentación" | "Liquidadas" | "Finalizado";
  fecha: string;
  policyId?: string;
};

const POLICY_RAMO = [
  "Automotor",
  "Hogar",
  "Vida Colectivo",
  "Agro",
  "Accidentes Personales",
  "Garantía de alquiler",
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
    ramo: "Automotor",
    aseguradora: "Porto",
    numero: "AU-2024-0345",
    vigenciaDesde: "2024-02-01",
    vigenciaHasta: "2025-01-31",
  },
  {
    id: "pol-101",
    ramo: "Vida Colectivo",
    aseguradora: "Sura",
    numero: "VC-2023-0911",
    vigenciaDesde: "2023-09-01",
    vigenciaHasta: "2024-08-31",
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
    ramo: POLICY_RAMO[0],
    aseguradora: INSURERS[0],
    numero: "",
    vigenciaDesde: "",
    vigenciaHasta: "",
  });

  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("");

  const nextPolicyId = useMemo(() => `pol-${100 + policies.length}`, [policies.length]);

  const addPolicy = () => {
    if (!form.numero || !form.vigenciaDesde || !form.vigenciaHasta) {
      return;
    }

    const newPolicy: Policy = {
      id: nextPolicyId,
      ramo: form.ramo,
      aseguradora: form.aseguradora,
      numero: form.numero,
      vigenciaDesde: form.vigenciaDesde,
      vigenciaHasta: form.vigenciaHasta,
    };

    setPolicies((prev) => [...prev, newPolicy]);
    setForm({ ramo: POLICY_RAMO[0], aseguradora: INSURERS[0], numero: "", vigenciaDesde: "", vigenciaHasta: "" });
    setSelectedPolicyId(newPolicy.id);
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
            Completa el formulario para ver cómo quedaría el registro de una póliza emitida desde la ficha del cliente.
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
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={addPolicy}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
            >
              Guardar póliza demo
            </button>
            <span className="text-xs text-slate-500">
              ID sugerido: <strong className="font-semibold text-slate-700">{nextPolicyId}</strong>
            </span>
          </div>
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
                      {policy.ramo} · {policy.aseguradora}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {policy.vigenciaDesde} → {policy.vigenciaHasta}
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
          <h2 className="text-lg font-semibold text-slate-800">Seleccionar siniestro</h2>
          <p className="mt-1 text-sm text-slate-600">
            Elige uno para asignarle la póliza recién creada o alguna existente.
          </p>
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
                      Póliza asociada: {policy ? `${policy.numero} (${policy.ramo})` : "sin vínculo"}
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
                    {policy.numero} · {policy.ramo}
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
                  El siniestro <strong>{selectedClaim.id}</strong> queda vinculado a la póliza <strong>{selectedPolicy.numero}</strong>.
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
