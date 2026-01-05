import { useEffect, useMemo, useState } from "react";
import UploadModal, { DEFAULT_DOCUMENT_CATEGORIES } from "../components/UploadModal";
import type { DocumentAttachment } from "../components/UploadModal";
import { useAuth } from "../auth/AuthProvider";
import { apiListProduction, apiListProductionPeriods, type ProductionProducer } from "../services/api";

type Producer = ProductionProducer;

export default function ProductionControl() {
  const { token } = useAuth();
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [periodo, setPeriodo] = useState("");
  const [search, setSearch] = useState("");
  const [activeProducerId, setActiveProducerId] = useState<string | null>(null);
  const [attachmentsByProducer, setAttachmentsByProducer] = useState<
    Record<string, DocumentAttachment[]>
  >({});
  const [producers, setProducers] = useState<Producer[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);

    apiListProductionPeriods(token)
      .then((data) => {
        const items = Array.isArray(data.items) ? data.items : [];
        setPeriodos(items);
        setPeriodo((current) => (current && items.includes(current) ? current : items[0] ?? ""));
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "No se pudieron cargar los periodos"),
      )
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    if (!periodo) {
      setProducers([]);
      return;
    }
    setLoading(true);
    setError(null);

    apiListProduction(periodo, token)
      .then((data) => setProducers(data.items ?? []))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "No se pudo cargar la producción"),
      )
      .finally(() => setLoading(false));
  }, [periodo, token]);

  const documentCategories = DEFAULT_DOCUMENT_CATEGORIES;

  const categoryLabels = useMemo(
    () =>
      documentCategories.reduce<Record<string, string>>((acc, option) => {
        acc[option.value] = option.label;
        return acc;
      }, {}),
    [documentCategories]
  );

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return producers.filter((prod) => {
      if (!q) return true;
      return (
        prod.nombre.toLowerCase().includes(q) ||
        prod.localidad?.toLowerCase().includes(q) ||
        prod.companias.some((c) => c.nombre.toLowerCase().includes(q))
      );
    });
  }, [producers, search]);

  const totales = useMemo(() => {
    return filtrados.reduce(
      (acc, prod) => {
        acc.produccionMes += prod.produccionMes;
        acc.objetivo += prod.objetivoMensual;
        return acc;
      },
      { produccionMes: 0, objetivo: 0 }
    );
  }, [filtrados]);

  const cumplimiento = totales.objetivo === 0 ? 0 : Math.round((totales.produccionMes / totales.objetivo) * 100);

  const escapeCsv = (value: string | number | null | undefined) => {
    const stringValue = value === null || value === undefined ? "" : String(value);
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const handleExport = () => {
    const headers = [
      "Periodo",
      "Productor",
      "Localidad",
      "Correo",
      "Celular",
      "Compania",
      "Bonificacion",
      "Automotor",
      "Hogar",
      "Vida",
      "Caucion",
      "ProduccionMes",
      "ObjetivoMensual",
      "Cumplimiento",
      "Seguimiento",
    ];

    const rows = filtrados.flatMap((prod) => {
      const cumplimientoProd =
        prod.objetivoMensual === 0 ? 0 : Math.round((prod.produccionMes / prod.objetivoMensual) * 100);
      const baseRow = [
        periodo,
        prod.nombre,
        prod.localidad ?? "",
        prod.correo ?? "",
        prod.celular ?? "",
      ];

      if (!prod.companias.length) {
        return [
          [
            ...baseRow,
            "",
            "",
            "",
            "",
            "",
            "",
            prod.produccionMes,
            prod.objetivoMensual,
            `${cumplimientoProd}%`,
            prod.seguimiento ?? "",
          ],
        ];
      }

      return prod.companias.map((compania) => [
        ...baseRow,
        compania.nombre,
        compania.bonificacion,
        compania.automotor,
        compania.hogar,
        compania.vida,
        compania.caucion,
        prod.produccionMes,
        prod.objetivoMensual,
        `${cumplimientoProd}%`,
        prod.seguimiento ?? "",
      ]);
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");

    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `produccion-${periodo || "sin-periodo"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const closeModal = () => setActiveProducerId(null);

  const handleConfirmAttachments = (files: DocumentAttachment[]) => {
    if (!activeProducerId) return;
    const producerId = activeProducerId;
    setAttachmentsByProducer((prev) => ({
      ...prev,
      [producerId]: files,
    }));
    setActiveProducerId(null);
  };

  return (
    <div className="flex-1 flex flex-col gap-5">
      <header className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Control de producción y comisiones</h1>
            <p className="mt-2 text-slate-600 max-w-2xl">
              Compara la producción mensual contra los objetivos acordados con cada compañía, identifica
              oportunidades de bonificación y planifica acciones comerciales.
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="periodo-select">
              Periodo de análisis
            </label>
            <select
              id="periodo-select"
              value={periodo}
              onChange={(event) => setPeriodo(event.target.value)}
              className="border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
              disabled={isLoading || periodos.length === 0}
            >
              {periodos.length ? (
                periodos.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))
              ) : (
                <option value="">Sin periodos disponibles</option>
              )}
            </select>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard label="Producción del mes" value={`USD ${totales.produccionMes.toLocaleString("es-UY")}`} />
          <SummaryCard label="Objetivo mensual" value={`USD ${totales.objetivo.toLocaleString("es-UY")}`} />
          <SummaryCard label="Cumplimiento promedio" value={`${cumplimiento}%`} highlight={cumplimiento >= 100} />
        </div>
        <p className="mt-3 text-sm text-slate-500">
          {periodo ? `Datos correspondientes a ${periodo}.` : "No hay periodos con información disponible."}
        </p>
      </header>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 flex-1 flex flex-col min-h-0">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="producer-search">
              Buscar productor o compañía
            </label>
            <input
              id="producer-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre, localidad o aseguradora"
              className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">Exportación</span>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center justify-center rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
              disabled={!filtrados.length}
            >
              Exportar listado a Excel
            </button>
            <span className="text-xs text-slate-500">Descarga CSV con detalle por compañía.</span>
          </div>
        </div>

        <div className="mt-6 overflow-auto -mx-4 md:mx-0">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 font-semibold">Productor</th>
                <th className="px-4 py-3 font-semibold">Localidad</th>
                <th className="px-4 py-3 font-semibold">Producción mes</th>
                <th className="px-4 py-3 font-semibold">Objetivo</th>
                <th className="px-4 py-3 font-semibold">Bonificaciones / compañías</th>
                <th className="px-4 py-3 font-semibold">Seguimiento</th>
                <th className="px-4 py-3 font-semibold">Documentos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    Cargando producción…
                  </td>
                </tr>
              )}
              {!isLoading && error && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              )}
              {!isLoading &&
                !error &&
                filtrados.map((prod) => {
                  const cumplimientoProd =
                    prod.objetivoMensual === 0 ? 0 : Math.round((prod.produccionMes / prod.objetivoMensual) * 100);
                  return (
                    <tr key={prod.id} className="align-top hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{prod.nombre}</div>
                        <div className="text-xs text-slate-500">{prod.correo ?? "—"}</div>
                        <div className="text-xs text-slate-500">{prod.celular ?? "—"}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{prod.localidad ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-700">USD {prod.produccionMes.toLocaleString("es-UY")}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <div>USD {prod.objetivoMensual.toLocaleString("es-UY")}</div>
                        <div className="text-xs text-slate-500 mt-1">{cumplimientoProd}% del objetivo</div>
                      </td>
                      <td className="px-4 py-3">
                        <ul className="space-y-2">
                          {prod.companias.map((compania) => (
                            <li key={compania.nombre} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                              <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
                                <span>{compania.nombre}</span>
                                <span className="text-emerald-700">{compania.bonificacion}</span>
                              </div>
                              <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                                <div>
                                  <dt className="font-medium text-slate-500">Automotor</dt>
                                  <dd>USD {compania.automotor.toLocaleString("es-UY")}</dd>
                                </div>
                                <div>
                                  <dt className="font-medium text-slate-500">Hogar</dt>
                                  <dd>USD {compania.hogar.toLocaleString("es-UY")}</dd>
                                </div>
                                <div>
                                  <dt className="font-medium text-slate-500">Vida</dt>
                                  <dd>USD {compania.vida.toLocaleString("es-UY")}</dd>
                                </div>
                                <div>
                                  <dt className="font-medium text-slate-500">Caución</dt>
                                  <dd>USD {compania.caucion.toLocaleString("es-UY")}</dd>
                                </div>
                              </dl>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-sm">{prod.seguimiento ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2">
                          {attachmentsByProducer[prod.id]?.length ? (
                            <ul className="space-y-1 text-xs text-slate-600">
                              {attachmentsByProducer[prod.id].map((attachment, index) => (
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
                            onClick={() => setActiveProducerId(prod.id)}
                            className="inline-flex items-center justify-center rounded-lg border border-emerald-500 px-3 py-1 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-50"
                          >
                            Gestionar adjuntos
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              {!isLoading && !error && filtrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    No se encontraron productores para el criterio seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <UploadModal
        open={Boolean(activeProducerId)}
        title="Adjuntar documentos"
        categories={documentCategories}
        initialFiles={
          activeProducerId ? attachmentsByProducer[activeProducerId] ?? [] : []
        }
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
