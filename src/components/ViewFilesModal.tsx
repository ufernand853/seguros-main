import { useEffect } from "react";

export type ViewFileItem = {
  name: string;
  size?: number;
  type?: string;
  url: string;   // debe venir un enlace válido o un objectURL
};

type ViewFilesModalProps = {
  open: boolean;
  title?: string;
  items?: ViewFileItem[];
  onClose: () => void;
};

export default function ViewFilesModal({
  open,
  title = "Archivos",
  items = [],
  onClose,
}: ViewFilesModalProps) {
  // Cleanup de objectURLs si fueran generados en otro lado
  useEffect(() => {
    return () => {
      items.forEach((f) => {
        if (f.url?.startsWith("blob:")) URL.revokeObjectURL(f.url);
      });
    };
  }, [items]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Fondo */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      {/* Card */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="p-5">
          {items.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-500">
              No hay archivos para mostrar.
            </div>
          ) : (
            <ul className="divide-y divide-slate-200 max-h-72 overflow-auto">
              {items.map((f, idx) => (
                <li key={idx} className="flex items-center gap-3 p-3">
                  <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center overflow-hidden">
                    {f.type?.startsWith("image/") ? (
                      <img
                        src={f.url}
                        alt={f.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-slate-500 text-xs">DOC</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 truncate">{f.name}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {f.type ?? "archivo"} · {(f.size ?? 0 / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-black text-white text-sm"
                  >
                    Abrir
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
