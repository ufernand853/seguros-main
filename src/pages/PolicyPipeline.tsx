import { useEffect, useMemo, useState } from "react";
import UploadModal, { DEFAULT_DOCUMENT_CATEGORIES } from "../components/UploadModal";
import type { DocumentAttachment } from "../components/UploadModal";
import { useAuth } from "../auth/AuthProvider";
import { apiListPipeline, type PipelineItem } from "../services/api";

type PipelineCase = {
  id: string;
  cliente: string;
  etapa?: string;
  monto?: number | null;
  probabilidad?: number | null;
  responsable?: string | null;
  actualizado?: string | null;
};

export default function PolicyPipeline() {
  const { token } = useAuth();
  const [stageFilter, setStageFilter] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [attachmentsByCase, setAttachmentsByCase] = useState<
    Record<string, DocumentAttachment[]>
  >({});
  const [cases, setCases] = useState<PipelineCase[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);

    apiListPipeline(token)
      .then((data) => {
        setCases(
          data.items.map((item: PipelineItem) => ({
            id: item.id,
            cliente: item.client_name ?? "—",
            etapa: item.stage ?? "Sin etapa",
            monto: item.amount ?? null,
            probabilidad: item.probability ?? null,
            responsable: item.owner ?? null,
            actualizado: item.updated_at ?? null,
          })),
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el pipeline"))
      .finally(() => setLoading(false));
  }, [token]);

  const documentCategories = DEFAULT_DOCUMENT_CATEGORIES;

  const categoryLabels = useMemo(
    () =>
      documentCategories.reduce<Record<string, string>>((acc, option) => {
        acc[option.value] = option.label;
        return acc;
      }, {}),
    [documentCategories]
  );

  const stages = useMemo(() => {
    const uniques = new Set<string>();
    cases.forEach((c) => c.etapa && uniques.add(c.etapa));
    return Array.from(uniques);
  }, [cases]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cases.filter((item) => {
      if (stageFilter !== "todos" && item.etapa !== stageFilter) return false;
      if (!q) return true;
      return item.cliente.toLowerCase().includes(q) || item.id.toLowerCase().includes(q);
    });
  }, [cases, stageFilter, search]);

  const summary = useMemo(() => {
    const byStage = stages.reduce<Record<string, number>>((acc, stage) => {
      acc[stage] = 0;
      return acc;
    }, {});

    cases.forEach((item) => {
      if (item.etapa) {
        byStage[item.etapa] = (byStage[item.etapa] ?? 0) + 1;
      }
    });

    const withDocsPending = cases.filter((item) => item.etapa === "Documentación").length;

    return { total: cases.length, byStage, withDocsPending };
  }, [cases, stages]);

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
          <SummaryCard label="En presentación" value={(summary.byStage["Presentación"] ?? 0).toString()} />
          <SummaryCard label="Etapas distintas" value={stages.length.toString()} />
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
              placeholder="Cliente o ID"
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
              {stages.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 overflow-auto -mx-4 md:mx-0">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Etapa</th>
                <th className="px-4 py-3 font-semibold">Probabilidad</th>
                <th className="px-4 py-3 font-semibold">Monto</th>
                <th className="px-4 py-3 font-semibold">Responsable</th>
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
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="indigo">{item.etapa}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {typeof item.probabilidad === "number"
                      ? `${Math.round(item.probabilidad * 100)}%`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {typeof item.monto === "number"
                      ? new Intl.NumberFormat("es-UY", {
                          style: "currency",
                          currency: "USD",
                          maximumFractionDigits: 0,
                        }).format(item.monto)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.responsable ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{item.actualizado ?? "—"}</td>
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
