import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { apiListConfirmedChanges, apiUndoCommand } from "../services/api";

type ChangeItem = {
  id: string;
  confirmationToken: string;
  intent?: string | null;
  summary?: string | null;
  createdAt?: string | null;
  undoneAt?: string | null;
};

export default function AIChanges() {
  const { token } = useAuth();
  const [items, setItems] = useState<ChangeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiListConfirmedChanges(token);
      setItems(response.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los cambios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const undo = async (item: ChangeItem) => {
    if (!token) return;
    const reason = window.prompt("Motivo de deshacer", "Reversión operativa manual") ?? "Reversión operativa manual";
    try {
      await apiUndoCommand({ confirmationId: item.id, reason }, token);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo deshacer");
    }
  };

  return (
    <div className="flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Cambios confirmados (Undo)</h1>
        <button type="button" onClick={load} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
          Recargar
        </button>
      </div>
      {loading ? <p className="mt-4 text-sm text-slate-600">Cargando…</p> : null}
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {!loading && items.length === 0 ? <p className="mt-4 text-sm text-slate-500">Sin cambios confirmados aún.</p> : null}
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-lg border border-slate-200 px-3 py-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-800">{item.summary ?? item.intent ?? "Cambio"}</p>
                <p className="text-xs text-slate-500">ID: {item.id}</p>
                <p className="text-xs text-slate-500">Token: {item.confirmationToken}</p>
                <p className="text-xs text-slate-500">Fecha: {item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}</p>
                {item.undoneAt ? (
                  <p className="text-xs font-medium text-emerald-700">Deshecho: {new Date(item.undoneAt).toLocaleString()}</p>
                ) : null}
              </div>
              <button
                type="button"
                disabled={Boolean(item.undoneAt)}
                onClick={() => undo(item)}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                Deshacer
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
