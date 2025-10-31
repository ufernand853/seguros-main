import { useState } from "react";
import { useNavigate } from "react-router-dom";
import UploadModal from "../components/UploadModal";

type NuevoClientePayload = {
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
  docFiles: File[];       // fotos del documento
  otherDocs: File[];      // otros documentos
};

export default function NuevoCliente() {
  const navigate = useNavigate();
  const [form, setForm] = useState<NuevoClientePayload>({
    nombre: "",
    rut: "",
    telefono: "",
    email: "",
    direccion: "",
    ciudad: "",
    departamento: "",
    pais: "",
    contacto: "",
    notas: "",
    docFiles: [],
    otherDocs: [],
  });

  // modales
  const [showDocModal, setShowDocModal] = useState(false);
  const [showOtherDocsModal, setShowOtherDocsModal] = useState(false);

  const onChange = (k: keyof NuevoClientePayload, v: string) =>
    setForm((s) => ({ ...s, [k]: v }));

  const onSave = () => {
    // TODO: enviar a API. Por ahora mostramos payload en consola.
    // NOTA: los File[] no se “stringifican”; se envían con FormData si hay backend.
    // Ejemplo:
    // const fd = new FormData();
    // Object.entries(payloadSinFiles).forEach(([k,v])=> fd.append(k, String(v ?? "")));
    // form.docFiles.forEach(f => fd.append("docFiles", f));
    // form.otherDocs.forEach(f => fd.append("otherDocs", f));
    console.log("NuevoCliente payload", form);
    navigate("/clientes");
  };

  return (
    <div className="flex-1 flex flex-col gap-4">
      {/* Sección: Datos generales */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <h1 className="text-xl font-bold text-slate-800 mb-4">Nuevo Cliente</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nombre */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Nombre o Razón Social *
            </label>
            <input
              value={form.nombre}
              onChange={(e) => onChange("nombre", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="Ej: Casarone Agroindustrial S.A."
            />
          </div>

          {/* RUT + subir documento */}
          <div className="flex flex-col gap-2">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Documento / RUT
              </label>
              <input
                value={form.rut}
                onChange={(e) => onChange("rut", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="RUT / Documento"
              />
            </div>
            <div>
              <button
                type="button"
                onClick={() => setShowDocModal(true)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 hover:bg-black text-white font-semibold"
              >
                Subir documento
              </button>
              {form.docFiles.length > 0 && (
                <span className="ml-3 text-sm text-slate-600">
                  {form.docFiles.length} archivo(s) adjunto(s)
                </span>
              )}
            </div>
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Teléfono
            </label>
            <input
              value={form.telefono}
              onChange={(e) => onChange("telefono", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="+598 ..."
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Email de contacto
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => onChange("email", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="email@dominio.com"
            />
          </div>

          {/* Dirección */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Dirección
            </label>
            <input
              value={form.direccion}
              onChange={(e) => onChange("direccion", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="Calle y número"
            />
          </div>

          {/* Ciudad */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Ciudad / Localidad
            </label>
            <input
              value={form.ciudad}
              onChange={(e) => onChange("ciudad", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="Ciudad"
            />
          </div>

          {/* Departamento */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Departamento / Provincia
            </label>
            <input
              value={form.departamento}
              onChange={(e) => onChange("departamento", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="Departamento/Provincia"
            />
          </div>

          {/* País */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              País
            </label>
            <input
              value={form.pais}
              onChange={(e) => onChange("pais", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="País"
            />
          </div>

          {/* Contacto principal */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Contacto principal (opcional)
            </label>
            <input
              value={form.contacto}
              onChange={(e) => onChange("contacto", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="Nombre y cargo"
            />
          </div>

          {/* Notas */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Notas internas (opcional)
            </label>
            <textarea
              value={form.notas}
              onChange={(e) => onChange("notas", e.target.value)}
              className="w-full min-h-[96px] rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="Notas internas..."
            />
          </div>
        </div>

        {/* Otros documentos */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowOtherDocsModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-black text-white font-semibold"
          >
            Otros documentos de identificación o de interés
          </button>
          {form.otherDocs.length > 0 && (
            <span className="ml-3 text-sm text-slate-600">
              {form.otherDocs.length} archivo(s) adjunto(s)
            </span>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => navigate("/clientes")}
          className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSave}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
        >
          Guardar cliente
        </button>
      </div>

      {/* Modales */}
      <UploadModal
        open={showDocModal}
        title="Subir documento (RUT / identificación)"
        initialFiles={form.docFiles}
        onClose={() => setShowDocModal(false)}
        onConfirm={(files) => {
          setForm((s) => ({ ...s, docFiles: files }));
          setShowDocModal(false);
        }}
      />

      <UploadModal
        open={showOtherDocsModal}
        title="Otros documentos"
        initialFiles={form.otherDocs}
        onClose={() => setShowOtherDocsModal(false)}
        onConfirm={(files) => {
          setForm((s) => ({ ...s, otherDocs: files }));
          setShowOtherDocsModal(false);
        }}
      />
    </div>
  );
}
