import { useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { apiAiChat, apiConfirmCommand, apiParseCommand, type ParsedCommand } from "../services/api";

type ChatRow = { role: "user" | "assistant"; content: string };

type PendingConfirmation = {
  token: string;
  parsed: ParsedCommand;
  summary: string;
};

const CONFIRM_WORDS = ["hazlo", "confirmado", "confirmar", "ok", "dale"];

export default function AICommands() {
  const { token } = useAuth();
  const [input, setInput] = useState("");
  const [rows, setRows] = useState<ChatRow[]>([]);
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = useMemo(() => Boolean(input.trim()) && !busy, [input, busy]);

  const send = async () => {
    if (!token || !input.trim() || busy) return;
    const prompt = input.trim();
    setInput("");
    setBusy(true);
    setError(null);
    setRows((current) => [...current, { role: "user", content: prompt }]);

    try {
      if (pending && CONFIRM_WORDS.includes(prompt.toLowerCase())) {
        const result = await apiConfirmCommand(
          {
            confirmationToken: pending.token,
            parsedIntent: pending.parsed,
            confirmWord: prompt,
          },
          token,
        );
        setRows((current) => [
          ...current,
          {
            role: "assistant",
            content: result.alreadyApplied
              ? "Esta confirmación ya había sido aplicada previamente."
              : `✅ Acción confirmada y aplicada: ${pending.summary}`,
          },
        ]);
        setPending(null);
        return;
      }

      if (pending && !CONFIRM_WORDS.includes(prompt.toLowerCase())) {
        setRows((current) => [
          ...current,
          {
            role: "assistant",
            content: `Hay un comando pendiente. Confirma con: ${CONFIRM_WORDS.join(", ")}. Si quieres descartarlo, escribe: cancelar pendiente.`,
          },
        ]);
        if (prompt.toLowerCase() === "cancelar pendiente") {
          setPending(null);
          setRows((current) => [...current, { role: "assistant", content: "Comando pendiente descartado." }]);
        }
        return;
      }

      const parseResult = await apiParseCommand(prompt, token);
      if (parseResult.parsedCommand?.complete && parseResult.confirmationToken) {
        setPending({
          token: parseResult.confirmationToken,
          parsed: parseResult.parsedCommand,
          summary: parseResult.requestPreview?.summary ?? parseResult.parsedCommand.summary ?? parseResult.parsedCommand.intent,
        });
        setRows((current) => [
          ...current,
          {
            role: "assistant",
            content: `🧾 Previsualización: ${
              parseResult.requestPreview?.summary ?? parseResult.parsedCommand?.summary ?? parseResult.parsedCommand.intent
            }.\nEscribe una confirmación (${CONFIRM_WORDS.join(", ")}) para ejecutar.`,
          },
        ]);
        return;
      }

      const chat = await apiAiChat(
        {
          prompt,
          history: rows.slice(-8),
        },
        token,
      );
      setRows((current) => [...current, { role: "assistant", content: chat.response }]);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error desconocido";
      setError(message);
      setRows((current) => [...current, { role: "assistant", content: `⚠️ ${message}` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Modo IA (texto + confirmación)</h1>
        {pending ? <span className="text-xs rounded bg-amber-100 px-2 py-1 text-amber-800">Comando pendiente</span> : null}
      </div>

      <div className="flex-1 min-h-[380px] overflow-auto rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-2">
        {rows.length === 0 ? <p className="text-sm text-slate-500">Escribe una consulta o instrucción operativa.</p> : null}
        {rows.map((row, index) => (
          <div
            key={`${row.role}-${index}`}
            className={`rounded-lg px-3 py-2 whitespace-pre-wrap text-sm ${
              row.role === "user" ? "bg-blue-600 text-white ml-12" : "bg-white text-slate-800 mr-12 border border-slate-200"
            }`}
          >
            {row.content}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ej.: crear tarea: llamar al cliente Gómez por documentación faltante"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[84px]"
        />
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500">Confirmaciones válidas: {CONFIRM_WORDS.join(", ")}.</div>
          <button
            type="button"
            onClick={send}
            disabled={!canSend}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Procesando..." : "Enviar"}
          </button>
        </div>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
