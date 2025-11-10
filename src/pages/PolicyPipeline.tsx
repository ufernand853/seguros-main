import { ReactNode, useMemo, useState } from "react";
import UploadModal, { DEFAULT_DOCUMENT_CATEGORIES } from "../components/UploadModal";
import type { DocumentAttachment } from "../components/UploadModal";

type PipelineCase = {
  id: string;
  cliente: string;
  documento: string;
  compania: string;
  ramo: string;
  etapa: "Análisis" | "Documentación" | "Cotización" | "Presentación" | "Seguimiento";
  tieneSiniestro: boolean;
  montoAprobado?: number;
  contacto?: string;
  observaciones?: string;
  actualizado: string;
};

const CASES: PipelineCase[] = [
  {
    id: "UTC44079",
    cliente: "Cliente Demo Uno S.A.",
    documento: "RUT 99.000.001-001",
    compania: "Porto",
    ramo: "Integral PyME",
    etapa: "Análisis",
    tieneSiniestro: false,
    observaciones: "No califican por scoring actual, revisar balance 2023",
    actualizado: "2024-03-11",
  },
  {
    id: "UTC44110",
    cliente: "Cliente Demo Dos SRL",
    documento: "RUT 99.000.002-001",
    compania: "Sura",
    ramo: "Todo Riesgo Operativo",
    etapa: "Documentación",
    tieneSiniestro: false,
    observaciones: "Nos piden ratificación de ingresos 2023",
    actualizado: "2024-03-12",
  },
  {
    id: "UTC44145",
    cliente: "Cliente Demo Tres Coop.",
    documento: "RUT 99.000.003-001",
    compania: "Mapfre",
    ramo: "Responsabilidad Profesional",
    etapa: "Cotización",
    tieneSiniestro: false,
    montoAprobado: 30000,
    observaciones: "Máximo de cobertura solicitado 30K",
    actualizado: "2024-03-08",
  },
  {
    id: "UTC44201",
    cliente: "Cliente Demo Cuatro Ltda.",
    documento: "RUT 99.000.004-001",
    compania: "Sancor",
    ramo: "Caución Obra Pública",
    etapa: "Presentación",
    tieneSiniestro: true,
    contacto: "comercial@sancor.com",
    observaciones: "Seguimiento siniestro abierto, presentar descargo",
    actualizado: "2024-03-14",
  },
  {
    id: "UTC44233",
    cliente: "Cliente Demo Cinco",
    documento: "RUT 99.000.005-001",
    compania: "Porto",
    ramo: "Accidentes Personales",
    etapa: "Seguimiento",
    tieneSiniestro: false,
    observaciones: "Esperando confirmación de cliente",
    actualizado: "2024-03-10",
  },
];

const STAGES: PipelineCase["etapa"][] = [
  "Análisis",
  "Documentación",
  "Cotización",
  "Presentación",
  "Seguimiento",
];

export default function PolicyPipeline() {
  const [stageFilter, setStageFilter] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [showOnlyOpenClaims, setShowOnlyOpenClaims] = useState(false);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [attachmentsByCase, setAttachmentsByCase] = useState<
    Record<string, DocumentAttachment[]>
  >({});

  const documentCategories = DEFAULT_DOCUMENT_CATEGORIES;

  const categoryLabels = useMemo(
    () =>
      documentCategories.reduce<Record<string, string>>((acc, option) => {
        acc[option.value] = option.label;
        return acc;
      }, {}),
    [documentCategories]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return CASES.filter((item) => {
      if (stageFilter !== "todos" && item.etapa !== stageFilter) return false;
      if (showOnlyOpenClaims && !item.tieneSiniestro) return false;
      if (!q) return true;
      return (
        item.cliente.toLowerCase().includes(q) ||
        item.documento.toLowerCase().includes(q) ||
        item.compania.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
      );
    });
  }, [stageFilter, search, showOnlyOpenClaims]);

  const summary = useMemo(() => {
    const total = CASES.length;
    const byStage = STAGES.reduce(
      (acc, stage) => {
        acc[stage] = 0;
        return acc;
      },
      {} as Record<PipelineCase["etapa"], number>
    );
    let withDocsPending = 0;
    let withClaims = 0;

    CASES.forEach((item) => {
      byStage[item.etapa] += 1;
      if (item.etapa === "Documentación") withDocsPending += 1;
      if (item.tieneSiniestro) withClaims += 1;
    });

    return { total, byStage, withDocsPending, withClaims };
  }, []);

  const closeModal = () => setActiveCaseId(null);

  const handleConfirmAttachments = (files: DocumentAttachment[]) => {
    if (!activeCaseId) return;
    const caseId = activeCaseId;
    setAttachmentsByCase((prev) => ({
      ...prev,
      [caseId]: files,
    }));
    setActiveCaseId(null);
  };

  return (
    <div className="flex-1 flex flex-col gap-5">
      <header className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-slate-900">Pipeline de pólizas</h1>
        <p className="mt-2 text-slate-600 max-w-2xl">
          Visualiza el estado de cada caso en análisis, identifica bloqueos por etapa y da seguimiento a
          requisitos pendientes, siniestros abiertos y montos aprobados.
        </p>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <SummaryCard label="Casos activos" value={summary.total.toString()} highlight />
          <SummaryCard label="Pendientes de documentación" value={summary.withDocsPending.toString()} />
          <SummaryCard label="Con siniestro asociado" value={summary.withClaims.toString()} />
          <SummaryCard label="En presentación" value={summary.byStage["Presentación"].toString()} />
        </div>
      </header>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 flex-1 flex flex-col min-h-0">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="pipeline-search">
              Buscar caso
            </label>
            <input
              id="pipeline-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cliente, documento, compañía o ID"
              className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="stage-filter">
              Etapa
            </label>
            <select
              id="stage-filter"
              value={stageFilter}
              onChange={(event) => setStageFilter(event.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="todos">Todas</option>
              {STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>

          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={showOnlyOpenClaims}
              onChange={(event) => setShowOnlyOpenClaims(event.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            Mostrar solo casos con siniestro
          </label>
        </div>

        <div className="mt-6 overflow-auto -mx-4 md:mx-0">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Compañía</th>
                <th className="px-4 py-3 font-semibold">Ramo</th>
                <th className="px-4 py-3 font-semibold">Etapa</th>
                <th className="px-4 py-3 font-semibold">Monto aprobado</th>
                <th className="px-4 py-3 font-semibold">Notas</th>
                <th className="px-4 py-3 font-semibold">Actualizado</th>
                <th className="px-4 py-3 font-semibold">Documentos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{item.cliente}</div>
                    <div className="text-xs text-slate-500">{item.documento}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-800">{item.compania}</div>
                    {item.tieneSiniestro && <Badge tone="amber">Siniestro</Badge>}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.ramo}</td>
                  <td className="px-4 py-3">
                    <Badge tone="indigo">{item.etapa}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {typeof item.montoAprobado === "number"
                      ? new Intl.NumberFormat("es-UY", {
                          style: "currency",
                          currency: "USD",
                          maximumFractionDigits: 0,
                        }).format(item.montoAprobado)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-sm">{item.observaciones ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{item.actualizado}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-2">
                      {attachmentsByCase[item.id]?.length ? (
                        <ul className="space-y-1 text-xs text-slate-600">
                          {attachmentsByCase[item.id].map((attachment, index) => (
                            <li
                              key={`${attachment.file.name}-${index}`}
                              className="flex flex-wrap items-center gap-2"
                            >
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                {categoryLabels[attachment.category] ?? attachment.category}
                              </span>
                              <span
                                className="truncate text-slate-500"
                                title={attachment.file.name}
                              >
                                {attachment.file.name}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs text-slate-400">Sin adjuntos</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveCaseId(item.id)}
                        className="inline-flex items-center justify-center rounded-lg border border-emerald-500 px-3 py-1 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-50"
                      >
                        Gestionar adjuntos
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                    No hay casos que coincidan con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <UploadModal
        open={Boolean(activeCaseId)}
        title="Adjuntar documentos"
        categories={documentCategories}
        initialFiles={activeCaseId ? attachmentsByCase[activeCaseId] ?? [] : []}
        onClose={closeModal}
        onConfirm={handleConfirmAttachments}
      />
    </div>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="text-sm font-medium text-slate-600">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function Badge({ tone = "slate", children }: { tone?: "slate" | "amber" | "indigo"; children: ReactNode }) {
  const colors: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    amber: "bg-amber-100 text-amber-700",
    indigo: "bg-indigo-100 text-indigo-700",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[tone]}`}>
      {children}
    </span>
  );
}
