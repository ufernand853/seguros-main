import { useMemo, useState } from "react";

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
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
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
