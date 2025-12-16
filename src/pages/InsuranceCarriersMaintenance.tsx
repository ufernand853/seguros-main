import { ReactNode, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { apiCreateInsurer, apiListInsurers, type CreateInsurerPayload, type InsurerListItem } from "../services/api";

type Contact = {
  nombre: string;
  email: string;
  telefono: string;
};

type Carrier = {
  id: string;
  nombre: string;
  pais: string;
  ramos: string[];
  estado: "Activa" | "En revisión" | "Suspendida";
  calificacion: number;
  primasAnuales: number;
  polizasVigentes: number;
  siniestralidad: number;
  contacto: Contact;
  acuerdosClaves: string[];
  ultimaActualizacion: string | null;
  notas?: string | null;
};

const ESTADOS: Carrier["estado"][] = ["Activa", "En revisión", "Suspendida"];
const DEFAULT_RAMO_OPTIONS = [
  "Automotor",
  "Hogar",
  "Vida",
  "Accidentes personales",
  "Agro",
  "Salud",
  "Integral de comercio",
  "Transporte",
];

function parseEstado(value?: string | null): Carrier["estado"] {
  if (value === "En revisión") return "En revisión";
  if (value === "Suspendida") return "Suspendida";
  return "Activa";
}

function mapApiInsurerToCarrier(insurer: InsurerListItem): Carrier {
  return {
    id: insurer.id,
    nombre: insurer.name ?? "Sin nombre",
    pais: insurer.country ?? "—",
    ramos: insurer.lines ?? [],
    estado: parseEstado(insurer.status),
    calificacion: insurer.rating ?? 0,
    primasAnuales: insurer.annual_premium ?? 0,
    polizasVigentes: insurer.active_policies ?? 0,
    siniestralidad: insurer.loss_ratio ?? 0,
    contacto: {
      nombre: insurer.contact?.name ?? "—",
      email: insurer.contact?.email ?? "—",
      telefono: insurer.contact?.phone ?? "—",
    },
    acuerdosClaves: insurer.key_deals ?? [],
    ultimaActualizacion: insurer.last_review ?? insurer.created_at ?? null,
    notas: insurer.notes ?? null,
  };
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-UY", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

const formatDate = (isoDate: string | null) =>
  isoDate ? new Intl.DateTimeFormat("es-UY", { dateStyle: "medium" }).format(new Date(isoDate)) : "Sin fecha";

export default function InsuranceCarriersMaintenance() {
  const { token } = useAuth();
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState<string>("todos");
  const [ramo, setRamo] = useState<string>("todos");
  const [selectedId, setSelectedId] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customRamos, setCustomRamos] = useState<string[]>([]);
  const [newRamoOption, setNewRamoOption] = useState("");
  const [newCarrier, setNewCarrier] = useState<Carrier>({
    id: "",
    nombre: "",
    pais: "",
    ramos: [],
    estado: "Activa",
    calificacion: 4,
    primasAnuales: 0,
    polizasVigentes: 0,
    siniestralidad: 0,
    contacto: { nombre: "", email: "", telefono: "" },
    acuerdosClaves: [],
    ultimaActualizacion: new Date().toISOString().slice(0, 10),
    notas: "",
  });

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);

    apiListInsurers(token)
      .then((data) => {
        const mapped = data.items.map(mapApiInsurerToCarrier);
        setCarriers(mapped);
        setSelectedId((prev) => {
          if (prev && mapped.some((item) => item.id === prev)) return prev;
          return mapped[0]?.id ?? "";
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar las aseguradoras"))
      .finally(() => setLoading(false));
  }, [token]);

  const carrierRamos = useMemo(() => {
    const values = new Set<string>();
    carriers.forEach((carrier) => carrier.ramos.forEach((item) => values.add(item)));
    return Array.from(values).sort((a, b) => a.localeCompare(b, "es"));
  }, [carriers]);

  const ramoOptions = useMemo(() => {
    const combined = [...DEFAULT_RAMO_OPTIONS, ...customRamos, ...carrierRamos]
      .map((value) => value.trim())
      .filter(Boolean);

    const byValue = new Map<string, string>();
    combined.forEach((value) => {
      const key = value.toLowerCase();
      if (!byValue.has(key)) byValue.set(key, value);
    });

    return Array.from(byValue.values()).sort((a, b) => a.localeCompare(b, "es"));
  }, [carrierRamos, customRamos]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return carriers.filter((carrier) => {
      if (estado !== "todos" && carrier.estado !== estado) return false;
      if (ramo !== "todos" && !carrier.ramos.includes(ramo)) return false;
      if (!q) return true;
      return (
        carrier.nombre.toLowerCase().includes(q) ||
        carrier.pais.toLowerCase().includes(q) ||
        carrier.contacto.nombre.toLowerCase().includes(q)
      );
    }).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [carriers, estado, ramo, search]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId("");
      return;
    }

    const exists = filtered.some((item) => item.id === selectedId);
    if (!exists) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selectedCarrier = filtered.find((item) => item.id === selectedId) ?? filtered[0];

  const handleAddRamoOption = () => {
    const value = newRamoOption.trim();
    if (!value) return;

    const exists = customRamos.some((item) => item.toLowerCase() === value.toLowerCase());
    if (!exists) {
      setCustomRamos((prev) => [...prev, value]);
    }

    setNewRamoOption("");

    setNewCarrier((prev) => {
      const alreadySelected = prev.ramos.some((item) => item.toLowerCase() === value.toLowerCase());
      if (alreadySelected) return prev;
      return { ...prev, ramos: [...prev.ramos, value] };
    });
  };

  const handleRemoveCustomRamo = (value: string) => {
    setCustomRamos((prev) => prev.filter((item) => item.toLowerCase() !== value.toLowerCase()));
    setNewCarrier((prev) => ({
      ...prev,
      ramos: prev.ramos.filter((item) => item.toLowerCase() !== value.toLowerCase()),
    }));
  };

  const resumen = useMemo(() => {
    const totales = filtered.reduce(
      (acc, carrier) => {
        acc.polizas += carrier.polizasVigentes;
        acc.primas += carrier.primasAnuales;
        acc.siniestralidad += carrier.siniestralidad;
        acc.cantidad += 1;
        if (carrier.estado === "Activa") acc.activos += 1;
        if (carrier.estado === "En revisión") acc.revision += 1;
        if (carrier.estado === "Suspendida") acc.suspendidos += 1;
        return acc;
      },
      { cantidad: 0, polizas: 0, primas: 0, siniestralidad: 0, activos: 0, revision: 0, suspendidos: 0 }
    );

    return {
      ...totales,
      siniestralidadPromedio: totales.cantidad ? Math.round(totales.siniestralidad / totales.cantidad) : 0,
    };
  }, [filtered]);

  const handleSubmit = async () => {
    const ramosLimpios = newCarrier.ramos
      .map((value) => value.trim())
      .filter(Boolean)
      .filter((value, index, array) => array.findIndex((item) => item.toLowerCase() === value.toLowerCase()) === index);
    const acuerdosLimpios = newCarrier.acuerdosClaves.map((value) => value.trim()).filter(Boolean);

    if (!newCarrier.nombre.trim() || !newCarrier.pais.trim() || ramosLimpios.length === 0) {
      setError("Nombre, país y al menos un ramo son obligatorios");
      return;
    }

    if (!token) {
      setError("Debes iniciar sesión para crear aseguradoras");
      return;
    }

    const payload: CreateInsurerPayload = {
      name: newCarrier.nombre.trim(),
      country: newCarrier.pais.trim(),
      lines: ramosLimpios,
      status: newCarrier.estado,
      rating: Number.isFinite(newCarrier.calificacion) ? Number(newCarrier.calificacion) : 0,
      annual_premium: Number.isFinite(newCarrier.primasAnuales) ? Number(newCarrier.primasAnuales) : 0,
      active_policies: Number.isFinite(newCarrier.polizasVigentes) ? Number(newCarrier.polizasVigentes) : 0,
      loss_ratio: Number.isFinite(newCarrier.siniestralidad) ? Number(newCarrier.siniestralidad) : 0,
      contact: {
        name: newCarrier.contacto.nombre?.trim() || null,
        email: newCarrier.contacto.email?.trim() || null,
        phone: newCarrier.contacto.telefono?.trim() || null,
      },
      key_deals: acuerdosLimpios,
      last_review: newCarrier.ultimaActualizacion || null,
      notes: newCarrier.notas?.trim() || null,
    };

    setSaving(true);
    setError(null);

    try {
      const created = await apiCreateInsurer(payload, token);
      const mapped = mapApiInsurerToCarrier(created);
      setCarriers((prev) => [...prev, mapped].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
      setSelectedId(mapped.id);
      setShowForm(false);
      setNewCarrier({
        ...newCarrier,
        id: "",
        nombre: "",
        pais: "",
        ramos: [],
        acuerdosClaves: [],
        notas: "",
        ultimaActualizacion: new Date().toISOString().slice(0, 10),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la aseguradora");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6">
      <header className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Catálogo de compañías</p>
            <h1 className="text-2xl font-bold text-slate-900">Mantenimiento de aseguradoras</h1>
            <p className="mt-2 text-slate-600 max-w-2xl">
              Administra la información clave de las compañías con las que operamos, identifica acuerdos vigentes y
              gestiona las relaciones comerciales para tu equipo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((prev) => !prev)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-100"
          >
            <span className="text-lg">＋</span>
            {showForm ? "Ocultar formulario" : "Nueva aseguradora"}
          </button>
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ResumenCard title="Compañías activas" value={`${resumen.activos} / ${filtered.length}`} subtitle="Activas sobre las filtradas" />
          <ResumenCard title="Primas anuales" value={formatCurrency(resumen.primas)} subtitle="Total reportado" />
          <ResumenCard title="Pólizas vigentes" value={resumen.polizas.toLocaleString("es-UY")} subtitle="Portafolio asociado" />
          <ResumenCard title="Siniestralidad promedio" value={`${resumen.siniestralidadPromedio}%`} subtitle="Sobre las filtradas" />
        </dl>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Catálogo de ramos</p>
            <h2 className="text-lg font-bold text-slate-900">Mantenimiento de ramos</h2>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Agrega o elimina ramos disponibles para las aseguradoras. Los ramos que definas aquí alimentan el combo
              del formulario y el filtro de la tabla.
            </p>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <input
              value={newRamoOption}
              onChange={(event) => setNewRamoOption(event.target.value)}
              placeholder="Nuevo ramo (ej. Ingeniería)"
              className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <button
              type="button"
              onClick={handleAddRamoOption}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              Agregar ramo
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {ramoOptions.map((value) => {
            const isCustom = customRamos.some((item) => item.toLowerCase() === value.toLowerCase());
            return (
              <span
                key={value}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700"
              >
                {value}
                {isCustom && (
                  <button
                    type="button"
                    aria-label={`Eliminar ramo ${value}`}
                    onClick={() => handleRemoveCustomRamo(value)}
                    className="text-xs text-slate-500 hover:text-rose-600"
                  >
                    ✕
                  </button>
                )}
              </span>
            );
          })}
        </div>
      </section>

      {showForm && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Alta rápida</p>
              <h2 className="text-lg font-bold text-slate-900">Agregar nueva aseguradora</h2>
              <p className="text-sm text-slate-600 mt-1">Completa los datos mínimos para sumarla al catálogo.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Cerrar
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex flex-col text-sm text-slate-700 gap-1">
              Nombre comercial
              <input
                value={newCarrier.nombre}
                onChange={(event) => setNewCarrier((prev) => ({ ...prev, nombre: event.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Ej. Seguros Atlántico"
              />
            </label>

            <label className="flex flex-col text-sm text-slate-700 gap-1">
              País
              <input
                value={newCarrier.pais}
                onChange={(event) => setNewCarrier((prev) => ({ ...prev, pais: event.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Ej. Uruguay"
              />
            </label>

            <label className="flex flex-col text-sm text-slate-700 gap-1">
              Estado
              <select
                value={newCarrier.estado}
                onChange={(event) => setNewCarrier((prev) => ({ ...prev, estado: event.target.value as Carrier["estado"] }))}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {ESTADOS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col text-sm text-slate-700 gap-1">
              Ramos (selección múltiple)
              <select
                multiple
                value={newCarrier.ramos}
                onChange={(event) =>
                  setNewCarrier((prev) => ({
                    ...prev,
                    ramos: Array.from(event.target.selectedOptions).map((option) => option.value),
                  }))
                }
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 h-full min-h-[120px]"
              >
                {ramoOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-500">Selecciona los ramos disponibles para esta aseguradora.</span>
            </label>

            <label className="flex flex-col text-sm text-slate-700 gap-1">
              Calificación (0 a 5)
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={newCarrier.calificacion}
                onChange={(event) => setNewCarrier((prev) => ({ ...prev, calificacion: Number(event.target.value) }))}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </label>

            <label className="flex flex-col text-sm text-slate-700 gap-1">
              Primas anuales (USD)
              <input
                type="number"
                min="0"
                value={newCarrier.primasAnuales}
                onChange={(event) => setNewCarrier((prev) => ({ ...prev, primasAnuales: Number(event.target.value) }))}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="1200000"
              />
            </label>

            <label className="flex flex-col text-sm text-slate-700 gap-1">
              Pólizas vigentes
              <input
                type="number"
                min="0"
                value={newCarrier.polizasVigentes}
                onChange={(event) => setNewCarrier((prev) => ({ ...prev, polizasVigentes: Number(event.target.value) }))}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="300"
              />
            </label>

            <label className="flex flex-col text-sm text-slate-700 gap-1">
              Siniestralidad (%)
              <input
                type="number"
                min="0"
                max="100"
                value={newCarrier.siniestralidad}
                onChange={(event) => setNewCarrier((prev) => ({ ...prev, siniestralidad: Number(event.target.value) }))}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="35"
              />
            </label>

            <label className="flex flex-col text-sm text-slate-700 gap-1">
              Responsable comercial
              <input
                value={newCarrier.contacto.nombre}
                onChange={(event) =>
                  setNewCarrier((prev) => ({ ...prev, contacto: { ...prev.contacto, nombre: event.target.value } }))
                }
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Nombre y apellido"
              />
            </label>

            <label className="flex flex-col text-sm text-slate-700 gap-1">
              Email
              <input
                type="email"
                value={newCarrier.contacto.email}
                onChange={(event) =>
                  setNewCarrier((prev) => ({ ...prev, contacto: { ...prev.contacto, email: event.target.value } }))
                }
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="correo@aseguradora.com"
              />
            </label>

            <label className="flex flex-col text-sm text-slate-700 gap-1">
              Teléfono
              <input
                value={newCarrier.contacto.telefono}
                onChange={(event) =>
                  setNewCarrier((prev) => ({ ...prev, contacto: { ...prev.contacto, telefono: event.target.value } }))
                }
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="+598 99 000 000"
              />
            </label>

            <label className="flex flex-col text-sm text-slate-700 gap-1 md:col-span-2">
              Acuerdos clave (separados por coma)
              <input
                value={newCarrier.acuerdosClaves.join(", ")}
                onChange={(event) =>
                  setNewCarrier((prev) => ({ ...prev, acuerdosClaves: event.target.value.split(",").map((item) => item.trim()) }))
                }
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Bonificación, Coberturas especiales"
              />
            </label>

            <label className="flex flex-col text-sm text-slate-700 gap-1 md:col-span-2">
              Notas internas
              <textarea
                value={newCarrier.notas}
                onChange={(event) => setNewCarrier((prev) => ({ ...prev, notas: event.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Información adicional para el equipo comercial"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 items-center">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? "Guardando..." : "Guardar aseguradora"}
            </button>
            <p className="text-xs text-slate-500">
              Se asignará un ID automático y quedará disponible en la tabla y el panel lateral.
            </p>
          </div>
        </section>
      )}

      <section className="flex-1 grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 flex flex-col min-h-0">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <label htmlFor="carrier-search" className="block text-sm font-semibold text-slate-700 mb-2">
                Buscar aseguradora
              </label>
              <input
                id="carrier-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nombre, país o responsable comercial"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label htmlFor="estado-filter" className="block text-sm font-semibold text-slate-700 mb-2">
                Estado
              </label>
              <select
                id="estado-filter"
                value={estado}
                onChange={(event) => setEstado(event.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="todos">Todos</option>
                {ESTADOS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ramo-filter" className="block text-sm font-semibold text-slate-700 mb-2">
                Ramo
              </label>
              <select
                id="ramo-filter"
                value={ramo}
                onChange={(event) => setRamo(event.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="todos">Todos</option>
                {ramoOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Cargando aseguradoras…
            </div>
          )}

          <div className="mt-6 overflow-auto -mx-4 md:mx-0">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Aseguradora</th>
                  <th className="px-4 py-3">Ramos</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Calificación</th>
                  <th className="px-4 py-3">Primas</th>
                  <th className="px-4 py-3">Pólizas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
                {filtered.map((carrier) => (
                  <tr
                    key={carrier.id}
                    onClick={() => setSelectedId(carrier.id)}
                    className={`cursor-pointer transition-colors hover:bg-indigo-50 ${
                      carrier.id === selectedCarrier?.id ? "bg-indigo-50" : "bg-white"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{carrier.nombre}</div>
                      <div className="text-xs text-slate-500">{carrier.pais}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {carrier.ramos.map((item) => (
                          <span
                            key={item}
                            className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <EstadoPill value={carrier.estado} />
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{carrier.calificacion.toFixed(1)} / 5</td>
                    <td className="px-4 py-3">{formatCurrency(carrier.primasAnuales)}</td>
                    <td className="px-4 py-3">{carrier.polizasVigentes.toLocaleString("es-UY")}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                      No hay aseguradoras que coincidan con los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 flex flex-col min-h-0">
          <h2 className="text-lg font-semibold text-slate-900">Detalle de la aseguradora</h2>
          {selectedCarrier ? (
            <div className="mt-4 space-y-5 text-sm text-slate-700">
              <div>
                <div className="text-xl font-bold text-slate-900">{selectedCarrier.nombre}</div>
                <div className="text-xs uppercase tracking-wide text-slate-500">{selectedCarrier.id}</div>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedCarrier.ramos.map((ramoName) => (
                  <span
                    key={ramoName}
                    className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600"
                  >
                    {ramoName}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <DetailItem label="País" value={selectedCarrier.pais} />
                <DetailItem label="Estado" value={<EstadoPill value={selectedCarrier.estado} />} />
                <DetailItem label="Calificación" value={`${selectedCarrier.calificacion.toFixed(1)} / 5`} />
                <DetailItem label="Primas" value={formatCurrency(selectedCarrier.primasAnuales)} />
                <DetailItem label="Pólizas" value={selectedCarrier.polizasVigentes.toLocaleString("es-UY")} />
                <DetailItem label="Siniestralidad" value={`${selectedCarrier.siniestralidad}%`} />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900">Responsable comercial</h3>
                <p className="mt-1 text-slate-700">{selectedCarrier.contacto.nombre}</p>
                <p className="text-slate-500 text-xs">{selectedCarrier.contacto.email}</p>
                <p className="text-slate-500 text-xs">{selectedCarrier.contacto.telefono}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900">Acuerdos vigentes</h3>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  {selectedCarrier.acuerdosClaves.map((item) => (
                    <li key={item} className="text-slate-700">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {selectedCarrier.notas && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Notas internas</h3>
                  <p className="mt-1 text-slate-600 whitespace-pre-line">{selectedCarrier.notas}</p>
                </div>
              )}

              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-500">
                Última actualización: {formatDate(selectedCarrier.ultimaActualizacion)}
              </div>

              <button
                type="button"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                Editar información
              </button>
            </div>
          ) : (
            <div className="mt-8 text-sm text-slate-500">Selecciona una aseguradora para ver sus detalles.</div>
          )}
        </aside>
      </section>
    </div>
  );
}

type ResumenCardProps = {
  title: string;
  value: string;
  subtitle: string;
};

function ResumenCard({ title, value, subtitle }: ResumenCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</dt>
      <dd className="mt-2 text-2xl font-bold text-slate-900">{value}</dd>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

type EstadoPillProps = {
  value: Carrier["estado"];
};

function EstadoPill({ value }: EstadoPillProps) {
  const config: Record<Carrier["estado"], { bg: string; text: string }> = {
    Activa: { bg: "bg-emerald-100", text: "text-emerald-700" },
    "En revisión": { bg: "bg-amber-100", text: "text-amber-700" },
    Suspendida: { bg: "bg-rose-100", text: "text-rose-700" },
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${config[value].bg} ${config[value].text}`}
    >
      {value}
    </span>
  );
}

type DetailItemProps = {
  label: string;
  value: ReactNode;
};

function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}
