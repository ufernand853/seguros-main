// src/pages/VerCliente.tsx
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ViewFilesModal, { ViewFileItem } from "../components/ViewFilesModal";

type ClientePayload = {
  nombre: string;
  rut: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  pais?: string;
  contacto?: string;
  notas?: string;
  docFiles: ViewFileItem[];    // solo visualización
  otherDocs: ViewFileItem[];   // solo visualización
};

export default function VerCliente() {
  const navigate = useNavigate();
  const { id } = useParams();

  // TODO: traer datos reales por id; por ahora, placeholders de demo:
  const initial: ClientePayload = useMemo(
    () => ({
      nombre: "Cliente de ejemplo",
      rut: "RUT 21.000.000-001",
      telefono: "+598 2 000 000",
      email: "cliente@ejemplo.com",
      direccion: "Calle Falsa 123",
      ciudad: "Montevideo",
      departamento: "Montevideo",
      pais: "Uruguay",
      contacto: "Nombre Apellido - Cargo",
      notas: "Notas internas…",
      docFiles: [
        { name: "RUT.pdf", type: "application/pdf", size: 120000, url: "#" },
      ],
      otherDocs: [],
    }),
    [id]
  );

  const [form, setForm] = useState<ClientePayload>(initial);
  const [isEditing, setIsEditing] = useState(true);

  // Modales SOLO lectura
  const [showDocModal, setShowDocModal] = useState(false);
  const [showOtherDocsModal, setShowOtherDocsModal] = useState(false);

  const onChange = (k: keyof ClientePayload, v: string) =>
    setForm((s) => ({ ...s, [k]: v }));

  const onCancel = () => navigate("/clientes");
  const onSave = () => {
    if (!isEditing) return; // bloqueado si no está en edición
    // TODO: enviar a API (PUT/PATCH)
    console.log("Guardar cambios (cliente)", form);
    setIsEditing(false);
  };

  return (
    <div className="flex-1 flex flex-col gap-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <h1 className="text-xl font-bold text-slate-800 mb-4">Editar Cliente</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nombre */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Nombre o Razón Social *
            </label>
            <input
              value={form.nombre}
              disabled={!isEditing}
              onChange={(e) => onChange("nombre", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          {/* RUT + Ver documento(s) */}
          <div className="flex flex-col gap-2">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Documento / RUT
              </label>
              <input
                value={form.rut}
                disabled={!isEditing}
                onChange={(e) => onChange("rut", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowDocModal(true)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 hover:bg-black text-white font-semibold"
              >
                Ver documento(s)
              </button>
              {form.docFiles?.length ? (
                <span className="text-sm text-slate-600">
                  {form.docFiles.length} archivo(s)
                </span>
              ) : (
                <span className="text-sm text-slate-400">Sin adjuntos</span>
              )}
            </div>
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Teléfono
            </label>
            <input
              value={form.telefono ?? ""}
              disabled={!isEditing}
              onChange={(e) => onChange("telefono", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Email de contacto
            </label>
            <input
              type="email"
              value={form.email ?? ""}
              disabled={!isEditing}
              onChange={(e) => onChange("email", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          {/* Dirección */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Dirección
            </label>
            <input
              value={form.direccion ?? ""}
              disabled={!isEditing}
              onChange={(e) => onChange("direccion", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          {/* Ciudad */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Ciudad / Localidad
            </label>
            <input
              value={form.ciudad ?? ""}
              disabled={!isEditing}
              onChange={(e) => onChange("ciudad", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          {/* Departamento */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Departamento / Provincia
            </label>
            <input
              value={form.departamento ?? ""}
              disabled={!isEditing}
              onChange={(e) => onChange("departamento", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          {/* País */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              País
            </label>
            <input
              value={form.pais ?? ""}
              disabled={!isEditing}
              onChange={(e) => onChange("pais", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          {/* Contacto principal */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Contacto principal (opcional)
            </label>
            <input
              value={form.contacto ?? ""}
              disabled={!isEditing}
              onChange={(e) => onChange("contacto", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          {/* Notas */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Notas internas (opcional)
            </label>
            <textarea
              value={form.notas ?? ""}
              disabled={!isEditing}
              onChange={(e) => onChange("notas", e.target.value)}
              className="w-full min-h-[96px] rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
        </div>

        {/* Otros documentos (solo ver) */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowOtherDocsModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-black text-white font-semibold"
          >
            Ver otros documentos
          </button>
          {form.otherDocs?.length ? (
            <span className="ml-3 text-sm text-slate-600">
              {form.otherDocs.length} archivo(s)
            </span>
          ) : (
            <span className="ml-3 text-sm text-slate-400">Sin adjuntos</span>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={!isEditing}
          onClick={onSave}
          className={`px-4 py-2 rounded-lg text-white font-semibold ${
            isEditing
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-emerald-300 cursor-not-allowed"
          }`}
        >
          Guardar cambios
        </button>
        <button
          type="button"
          onClick={() => setIsEditing((s) => !s)}
          className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-black text-white font-semibold"
        >
          {isEditing ? "Salir de edición" : "Editar"}
        </button>
      </div>

      {/* Modales SOLO lectura */}
      <ViewFilesModal
        open={showDocModal}
        title="Documento(s) - Identificación / RUT"
        items={form.docFiles}
        onClose={() => setShowDocModal(false)}
      />
      <ViewFilesModal
        open={showOtherDocsModal}
        title="Otros documentos"
        items={form.otherDocs}
        onClose={() => setShowOtherDocsModal(false)}
      />
    </div>
  );
}
