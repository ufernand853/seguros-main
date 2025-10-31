import { useMemo, useState } from "react";
import UploadModal, { DEFAULT_DOCUMENT_CATEGORIES } from "../components/UploadModal";
import type { DocumentAttachment } from "../components/UploadModal";

type Task = {
  id: string;
  fecha: string;
  cliente: string;
  movimiento: string;
  item: string;
  compania: string;
  responsable: string;
  estado: "Pendiente" | "En curso" | "Completado";
  notas?: string;
};

const TASKS: Task[] = [
  {
    id: "T-101",
    fecha: "2024-03-12",
    cliente: "Alquileres del Prado",
    movimiento: "MV-4401",
    item: "Alquiler",
    compania: "Porto",
    responsable: "Valentina",
    estado: "Pendiente",
    notas: "Subir planilla de datos y enviar al drive",
  },
  {
    id: "T-102",
    fecha: "2024-03-12",
    cliente: "Transportes Atlántico",
    movimiento: "SIN-8821",
    item: "Siniestro",
    compania: "Sura",
    responsable: "Rodrigo",
    estado: "En curso",
    notas: "Ingresar denuncia en portal y solicitar fotos adicionales",
  },
  {
    id: "T-103",
    fecha: "2024-03-11",
    cliente: "Constructora Horizonte",
    movimiento: "MV-4393",
    item: "Caución",
    compania: "Sancor",
    responsable: "María",
    estado: "Pendiente",
    notas: "Corregir contrato y reenviar a la compañía",
  },
  {
    id: "T-104",
    fecha: "2024-03-10",
    cliente: "Club Náutico",
    movimiento: "REN-3302",
    item: "Salud",
    compania: "BSE",
    responsable: "Andrés",
    estado: "Completado",
    notas: "Confirmar altas nuevas y actualizar padrón",
  },
  {
    id: "T-105",
    fecha: "2024-03-09",
    cliente: "Servicios Industriales",
    movimiento: "SIN-8712",
    item: "Siniestro",
    compania: "Mapfre",
    responsable: "Lucía",
    estado: "En curso",
    notas: "Coordinar inspección presencial",
  },
];

export default function TaskTracker() {
  const [estado, setEstado] = useState<string>("activos");
  const [search, setSearch] = useState("");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [attachmentsByTask, setAttachmentsByTask] = useState<
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

  const agrupadas = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtradas = TASKS.filter((task) => {
      if (estado === "activos" && task.estado === "Completado") return false;
      if (estado === "completadas" && task.estado !== "Completado") return false;
      if (!q) return true;
      return (
        task.cliente.toLowerCase().includes(q) ||
        task.movimiento.toLowerCase().includes(q) ||
        task.compania.toLowerCase().includes(q)
      );
    });

    return filtradas.reduce<Record<string, Task[]>>((acc, task) => {
      if (!acc[task.fecha]) acc[task.fecha] = [];
      acc[task.fecha].push(task);
      return acc;
    }, {});
  }, [estado, search]);

  const fechas = useMemo(() => Object.keys(agrupadas).sort((a, b) => b.localeCompare(a)), [agrupadas]);

  const closeModal = () => setActiveTaskId(null);

  const handleConfirmAttachments = (files: DocumentAttachment[]) => {
    if (!activeTaskId) return;
    const taskId = activeTaskId;
    setAttachmentsByTask((prev) => ({
      ...prev,
      [taskId]: files,
    }));
    setActiveTaskId(null);
  };

  return (
    <div className="flex-1 flex flex-col gap-5">
      <header className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-slate-900">Seguimiento de gestiones</h1>
        <p className="mt-2 text-slate-600 max-w-2xl">
          Coordina las tareas operativas pendientes por cliente, identifica responsables y registra el
          estado de cada movimiento sin depender de planillas compartidas.
        </p>
      </header>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 flex-1 flex flex-col min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="tasks-search">
              Buscar cliente o movimiento
            </label>
            <input
              id="tasks-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cliente, movimiento o compañía"
              className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="status-filter">
              Estado
            </label>
            <select
              id="status-filter"
              value={estado}
              onChange={(event) => setEstado(event.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="activos">Pendientes y en curso</option>
              <option value="todos">Todos</option>
              <option value="completadas">Completados</option>
            </select>
          </div>
        </div>

        <div className="mt-6 space-y-6 overflow-auto pr-2">
          {fechas.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
              No hay gestiones que coincidan con los filtros seleccionados.
            </div>
          )}

          {fechas.map((fecha) => (
            <div key={fecha} className="space-y-3">
              <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                {formatDate(fecha)}
              </div>
              <ul className="space-y-3">
                {agrupadas[fecha].map((task) => (
                  <li key={task.id} className="border border-slate-200 rounded-2xl p-4 hover:border-emerald-200">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{task.cliente}</div>
                        <div className="text-xs text-slate-500">{task.movimiento} · {task.item} · {task.compania}</div>
                      </div>
                      <StatusBadge estado={task.estado} />
                    </div>
                    <div className="mt-3 text-sm text-slate-600">{task.notas ?? "Sin notas"}</div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>Responsable: {task.responsable}</span>
                      <span>ID: {task.id}</span>
                    </div>
                    <div className="mt-3 rounded-xl border border-dashed border-slate-200 p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Documentos
                      </div>
                      {attachmentsByTask[task.id]?.length ? (
                        <ul className="mt-2 space-y-1 text-xs text-slate-600">
                          {attachmentsByTask[task.id].map((attachment, index) => (
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
                        <p className="mt-2 text-xs text-slate-400">Sin adjuntos</p>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveTaskId(task.id)}
                        className="mt-3 inline-flex items-center justify-center rounded-lg border border-emerald-500 px-3 py-1 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-50"
                      >
                        Gestionar adjuntos
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
      <UploadModal
        open={Boolean(activeTaskId)}
        title="Adjuntar documentos"
        categories={documentCategories}
        initialFiles={activeTaskId ? attachmentsByTask[activeTaskId] ?? [] : []}
        onClose={closeModal}
        onConfirm={handleConfirmAttachments}
      />
    </div>
  );
}

function StatusBadge({ estado }: { estado: Task["estado"] }) {
  const colors: Record<Task["estado"], string> = {
    Pendiente: "bg-rose-100 text-rose-700",
    "En curso": "bg-amber-100 text-amber-700",
    Completado: "bg-emerald-100 text-emerald-700",
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${colors[estado]}`}>
      {estado}
    </span>
  );
}

function formatDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("es-UY", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}
