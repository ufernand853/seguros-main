import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { apiGetOpenAiSettings, apiSaveOpenAiSettings, apiTestOpenAiSettings } from "../services/api";

export default function AISettings() {
  const { token } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [configured, setConfigured] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!token) return;
    try {
      const response = await apiGetOpenAiSettings(token);
      setConfigured(response.configured);
      setModel(response.model || "gpt-4o-mini");
      setUpdatedAt(response.updatedAt ?? null);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "No se pudo obtener configuración");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const save = async () => {
    if (!token) return;
    setBusy(true);
    setStatus(null);
    try {
      await apiSaveOpenAiSettings({ username, password, apiKey, model }, token);
      setStatus("Configuración guardada correctamente.");
      setApiKey("");
      await load();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    if (!token) return;
    setBusy(true);
    setStatus(null);
    try {
      const result = await apiTestOpenAiSettings({ username, password }, token);
      setStatus(result.ok ? `Conectividad OK (${result.model}): ${result.response}` : result.error || "Error en test");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Error de test");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900">Configuración IA</h1>
      <p className="mt-1 text-sm text-slate-600">Gestión de API key y modelo para OpenAI.</p>

      <div className="mt-4 grid grid-cols-1 gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-slate-700">Usuario admin</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded border px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-700">Contraseña admin</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-700">OpenAI API key</span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full rounded border px-3 py-2"
            placeholder="sk-..."
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-700">Modelo</span>
          <input value={model} onChange={(e) => setModel(e.target.value)} className="w-full rounded border px-3 py-2" />
        </label>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={test}
          disabled={busy}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
        >
          Probar conexión
        </button>
      </div>

      <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
        <p>Configurada: {configured ? "Sí" : "No"}</p>
        <p>Modelo actual: {model}</p>
        <p>Actualizada: {updatedAt ? new Date(updatedAt).toLocaleString() : "—"}</p>
      </div>

      {status ? <p className="mt-3 text-sm text-slate-700">{status}</p> : null}
    </div>
  );
}
