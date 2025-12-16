import { useEffect, useMemo, useState } from "react";
import UploadModal, { DEFAULT_DOCUMENT_CATEGORIES } from "../components/UploadModal";
import type { DocumentAttachment } from "../components/UploadModal";
import { useAuth } from "../auth/AuthProvider";
import {
  apiCreateTask,
  apiListClients,
  apiListEmployees,
  apiListTasks,
  apiUpdateTask,
  type ClientListItem,
  type Employee,
  type TaskItem,
} from "../services/api";

type TaskStatus = "pendiente" | "en_curso" | "completada" | "sin_estado";

type Task = {
  id: string;
  fecha: string;
  cliente: string;
  clienteId?: string | null;
  titulo: string;
  responsableId?: string | null;
  responsableNombre?: string | null;
  estado: TaskStatus;
};

type TaskForm = {
  titulo: string;
  clienteId: string;
  responsableId: string;
  fecha: string;
  estado: TaskStatus;
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  completada: "Completada",
  sin_estado: "Sin estado",
};

export default function TaskTracker() {
  const { token } = useAuth();
  const [estado, setEstado] = useState<string>("activos");
  const [search, setSearch] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [taskForm, setTaskForm] = useState<TaskForm>({
    titulo: "",
    clienteId: "",
    responsableId: "",
    fecha: "",
    estado: "pendiente",
  });
  const [creating, setCreating] = useState(false);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
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

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    setActionError(null);

    Promise.all([apiListTasks(token), apiListEmployees(token), apiListClients(token)])
      .then(([tasksResponse, employeesResponse, clientsResponse]) => {
        setTasks(tasksResponse.items.map(mapTaskFromApi));
        setEmployees(employeesResponse.items);
        setClients(clientsResponse.items);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar las gestiones"))
      .finally(() => setLoading(false));
  }, [token]);

  const statusOptions = useMemo(
    () => [
      { value: "pendiente", label: STATUS_LABELS.pendiente },
      { value: "en_curso", label: STATUS_LABELS.en_curso },
      { value: "completada", label: STATUS_LABELS.completada },
    ],
    [],
  );

  const agrupadas = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtradas = tasks.filter((task) => {
      if (estado === "activos" && task.estado === "completada") return false;
      if (estado === "completadas" && task.estado !== "completada") return false;
      if (!q) return true;
      return task.cliente.toLowerCase().includes(q) || task.titulo.toLowerCase().includes(q);
    });

    return filtradas.reduce<Record<string, Task[]>>((acc, task) => {
      const key = task.fecha || "Sin fecha";
      if (!acc[key]) acc[key] = [];
      acc[key].push(task);
      return acc;
    }, {});
  }, [estado, search, tasks]);

  const fechas = useMemo(() => Object.keys(agrupadas).sort((a, b) => b.localeCompare(a)), [agrupadas]);

  const closeModal = () => setActiveTaskId(null);

  const handleCreateTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    setCreating(true);
    setActionError(null);

    try {
      const payload = {
        title: taskForm.titulo.trim(),
        client_id: taskForm.clienteId || null,
        owner_id: taskForm.responsableId || null,
        due_date: taskForm.fecha || null,
        status: taskForm.estado,
      };

      const newTask = await apiCreateTask(payload, token);
      setTasks((current) => [mapTaskFromApi(newTask), ...current]);
      setTaskForm({ titulo: "", clienteId: "", responsableId: "", fecha: "", estado: "pendiente" });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "No se pudo crear la tarea");
    } finally {
      setCreating(false);
    }
  };

  const handleTaskUpdate = async (task: Task, updates: Partial<{ owner_id: string | null; status: TaskStatus }>) => {
    if (!token) return;

    setSavingTaskId(task.id);
    setActionError(null);

    try {
      const updated = await apiUpdateTask(task.id, updates, token);
      setTasks((current) => current.map((item) => (item.id === task.id ? mapTaskFromApi(updated) : item)));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "No se pudo actualizar la tarea");
    } finally {
      setSavingTaskId(null);
    }
  };

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

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
        <div className="flex flex-col gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Registrar nueva gestión</h2>
            <p className="text-sm text-slate-600">Guarda la tarea con su fecha compromiso y responsable asignado.</p>
          </div>
          <form onSubmit={handleCreateTask} className="mt-3 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="task-title">
                  Título de la gestión
                </label>
                <input
                  id="task-title"
                  value={taskForm.titulo}
                  onChange={(event) => setTaskForm((current) => ({ ...current, titulo: event.target.value }))}
                  placeholder="Ej: Enviar propuesta de auto"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="task-client">
                  Cliente
                </label>
                <select
                  id="task-client"
                  value={taskForm.clienteId}
                  onChange={(event) => setTaskForm((current) => ({ ...current, clienteId: event.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="">Sin cliente asignado</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="task-owner">
                  Responsable
                </label>
                <select
                  id="task-owner"
                  value={taskForm.responsableId}
                  onChange={(event) => setTaskForm((current) => ({ ...current, responsableId: event.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="">Sin responsable</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="task-date">
                    Fecha compromiso
                  </label>
                  <input
                    id="task-date"
                    type="date"
                    value={taskForm.fecha}
                    onChange={(event) => setTaskForm((current) => ({ ...current, fecha: event.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="task-status">
                    Estado inicial
                  </label>
                  <select
                    id="task-status"
                    value={taskForm.estado}
                    onChange={(event) =>
                      setTaskForm((current) => ({ ...current, estado: event.target.value as TaskStatus }))
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {actionError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {actionError}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {creating ? "Guardando…" : "Registrar gestión"}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 flex-1 flex flex-col min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="tasks-search">
              Buscar cliente o tarea
            </label>
            <input
              id="tasks-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cliente o título de la tarea"
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
          {isLoading && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
              Cargando gestiones…
            </div>
          )}

          {error && !isLoading && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-600">
              {error}
            </div>
          )}

          {actionError && !isLoading && !error && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
              {actionError}
            </div>
          )}

          {fechas.length === 0 && !isLoading && !error && (
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
                        <div className="text-xs text-slate-500">{task.titulo}</div>
                      </div>
                      <StatusBadge estado={task.estado} />
                    </div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-500">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500" htmlFor={`owner-${task.id}`}>
                          Responsable
                        </label>
                        <select
                          id={`owner-${task.id}`}
                          value={task.responsableId ?? ""}
                          onChange={(event) => {
                            const newOwner = event.target.value || null;
                            if (newOwner === (task.responsableId ?? null)) return;
                            void handleTaskUpdate(task, { owner_id: newOwner });
                          }}
                          disabled={savingTaskId === task.id}
                          className="w-full border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        >
                          <option value="">Sin responsable</option>
                          {employees.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500" htmlFor={`status-${task.id}`}>
                          Estado
                        </label>
                        <select
                          id={`status-${task.id}`}
                          value={task.estado}
                          onChange={(event) => {
                            const newStatus = event.target.value as TaskStatus;
                            if (newStatus === task.estado) return;
                            void handleTaskUpdate(task, { status: newStatus });
                          }}
                          disabled={savingTaskId === task.id}
                          className="w-full border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        >
                          {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Responsable actual: {task.responsableNombre ?? "—"}</span>
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
    pendiente: "bg-rose-100 text-rose-700",
    en_curso: "bg-amber-100 text-amber-700",
    completada: "bg-emerald-100 text-emerald-700",
    sin_estado: "bg-slate-100 text-slate-600",
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${colors[estado]}`}>
      {STATUS_LABELS[estado]}
    </span>
  );
}

function formatDate(date: string) {
  if (!date) return "Sin fecha";
  return new Date(date + "T00:00:00").toLocaleDateString("es-UY", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function normalizeStatusFromApi(status?: string): TaskStatus {
  if (status === "pendiente") return "pendiente";
  if (status === "en_curso" || status === "en curso" || status === "en_progreso") return "en_curso";
  if (status === "completada" || status === "completado") return "completada";
  return "sin_estado";
}

function mapTaskFromApi(task: TaskItem): Task {
  const dueDate = task.due_date ? new Date(task.due_date).toISOString().slice(0, 10) : "";

  return {
    id: task.id,
    fecha: dueDate,
    cliente: task.client_name ?? "—",
    clienteId: task.client_id ?? null,
    titulo: task.title,
    responsableId: task.owner_id ?? null,
    responsableNombre: task.owner_name ?? null,
    estado: normalizeStatusFromApi(task.status),
  };
}
