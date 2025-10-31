import { useEffect, useMemo, useRef, useState } from "react";

export type DocumentCategoryOption = {
  value: string;
  label: string;
};

export type DocumentAttachment = {
  file: File;
  category: string;
};

type UploadModalProps = {
  open: boolean;
  title?: string;
  initialFiles?: DocumentAttachment[];
  categories?: DocumentCategoryOption[];
  onClose: () => void;
  onConfirm: (files: DocumentAttachment[]) => void;
};

export default function UploadModal({
  open,
  title = "Subir archivos",
  initialFiles = [],
  categories,
  onClose,
  onConfirm,
}: UploadModalProps) {
  const fallbackCategories: DocumentCategoryOption[] = [
    { value: "contrato", label: "Contratos" },
    { value: "poliza", label: "Pólizas" },
    { value: "factura", label: "Facturas" },
    { value: "imagen", label: "Imágenes" },
    { value: "otros", label: "Otros" },
  ];

  const availableCategories = categories?.length
    ? categories
    : fallbackCategories;

  const defaultCategory = availableCategories[0]?.value ?? "otros";

  const [files, setFiles] = useState<DocumentAttachment[]>(initialFiles);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    setFiles(initialFiles);
  }, [initialFiles, open]);

  const onPick = () => inputRef.current?.click();

  const addFiles = (fl: FileList | File[]) => {
    const incoming = Array.from(fl).map<DocumentAttachment>((file) => ({
      file,
      category: defaultCategory,
    }));
    setFiles((prev) => [...prev, ...incoming]);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => setDragOver(false);

  const removeAt = (idx: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== idx));

  const updateCategory = (idx: number, category: string) => {
    setFiles((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, category } : item))
    );
  };

  const totalSize = useMemo(
    () => files.reduce((acc, f) => acc + (f?.file.size || 0), 0),
    [files]
  );

  const previews = useMemo(() => {
    return files.map((f) => {
      const isImg = f.file.type.startsWith("image/");
      return {
        name: f.file.name,
        size: f.file.size,
        type: f.file.type || "application/octet-stream",
        isImg,
        category: f.category,
        url: isImg ? URL.createObjectURL(f.file) : "",
      };
    });
  }, [files]);

  useEffect(() => {
    return () => previews.forEach((p) => p.url && URL.revokeObjectURL(p.url));
  }, [previews]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* back layer */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      {/* modal card */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <button
            type="button"
            className="px-3 py-1 rounded-lg hover:bg-slate-100"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Dropzone */}
          <div
            ref={dropRef}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition ${
              dragOver ? "border-emerald-500 bg-emerald-50" : "border-slate-300"
            }`}
          >
            <p className="mb-2 font-medium text-slate-700">
              Arrastrá y soltá archivos aquí
            </p>
            <p className="text-sm text-slate-500 mb-4">
              o elegilos desde tu dispositivo
            </p>
            <button
              type="button"
              onClick={onPick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              Elegir archivos
            </button>
            <input
              ref={inputRef}
              type="file"
              multiple
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.currentTarget.value = "";
              }}
              className="hidden"
            />
          </div>

          {/* Lista / previews */}
          {files.length > 0 && (
            <div className="max-h-64 overflow-auto border border-slate-200 rounded-xl">
              <ul className="divide-y divide-slate-200">
                {previews.map((p, idx) => (
                  <li key={idx} className="flex flex-wrap items-center gap-3 p-3">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
                      {p.isImg ? (
                        <img
                          src={p.url}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-slate-500 text-sm">DOC</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 truncate">
                        {p.name}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {p.type || "archivo"} · {(p.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <div className="min-w-[160px]">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Tipo de documento
                      </label>
                      <select
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={p.category}
                        onChange={(e) => updateCategory(idx, e.target.value)}
                      >
                        {availableCategories.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAt(idx)}
                      className="px-3 py-1 rounded-lg hover:bg-slate-100 text-slate-700"
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Resumen */}
          <div className="text-xs text-slate-500">
            Archivos: {files.length} · Tamaño total:{" "}
            {(totalSize / (1024 * 1024)).toFixed(2)} MB
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(files)}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
