export default function EntrySelector() {
  const defaultGanaderiaUrl = `${window.location.protocol}//${window.location.hostname}:3000/EstablecimientoGanadero`;
  const ganaderiaUrl = import.meta.env.VITE_GANADERIA_URL || defaultGanaderiaUrl;

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <section className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-slate-900 text-center mb-3">
          Seleccioná el portal
        </h1>
        <p className="text-slate-600 text-center mb-8">
          Elegí el sistema que querés usar para iniciar.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <a
            href="/seguros/login"
            className="rounded-xl border border-indigo-200 bg-indigo-50 p-6 hover:bg-indigo-100 transition block"
          >
            <h2 className="text-xl font-semibold text-indigo-900 mb-2">Seguros</h2>
            <p className="text-sm text-indigo-800">
              Inicia en el portal de seguros.
            </p>
          </a>

          <a
            href={ganaderiaUrl}
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 hover:bg-emerald-100 transition block"
          >
            <h2 className="text-xl font-semibold text-emerald-900 mb-2">Ganadería</h2>
            <p className="text-sm text-emerald-800">
              Abre el acceso del módulo ganadero.
            </p>
          </a>
        </div>
      </section>
    </main>
  );
}
