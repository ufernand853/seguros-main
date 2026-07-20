import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiListPublicPlans, apiRegisterSaas } from "../services/api";
import type { BillingPlan } from "../services/api";

export default function RegisterSaas() {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState("basico");
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [isLoadingPlans, setLoadingPlans] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    apiListPublicPlans()
      .then((response) => {
        if (!mounted) return;
        setPlans(response.items);
        setSelectedPlan(response.items[0]?.slug ?? "basico");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar los planes"))
      .finally(() => mounted && setLoadingPlans(false));
    return () => {
      mounted = false;
    };
  }, []);

  const selectedPlanInfo = useMemo(
    () => plans.find((plan) => plan.slug === selectedPlan) ?? plans[0] ?? null,
    [plans, selectedPlan],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setCheckoutUrl(null);
    setSubmitting(true);

    try {
      const response = await apiRegisterSaas({ companyName, name, email, password, planSlug: selectedPlan });
      if (response.subscription.initPoint) {
        window.location.href = response.subscription.initPoint;
        return;
      }
      setCheckoutUrl("Cuenta creada. Configura MERCADOPAGO_ACCESS_TOKEN para generar el checkout real.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_420px]">
        <section className="rounded-3xl bg-slate-900 p-8 text-white shadow-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-300">SaaS Seguros</p>
          <h1 className="mt-4 text-4xl font-bold">Planes y funcionalidades para corredoras de seguros</h1>
          <p className="mt-4 text-slate-300">
            Gestión de Seguros centraliza la cartera comercial, clientes, aseguradoras, pólizas, renovaciones,
            seguimiento de gestiones y registro de siniestros en una solución SaaS con licencia por empresa.
          </p>

          <div className="mt-6 grid gap-3 text-sm text-slate-200 sm:grid-cols-2">
            {[
              "Clientes y ficha 360° con documentos y contactos.",
              "Agenda de renovaciones y vencimientos priorizados.",
              "Seguimiento de gestiones con responsables y estados.",
              "Registro de siniestros asociado a cliente y póliza.",
              "Catálogo de aseguradoras y condiciones operativas.",
              "Modo IA para consultas y comandos asistidos.",
            ].map((feature) => (
              <div key={feature} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                {feature}
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {plans.map((plan) => (
              <button
                key={plan.slug}
                type="button"
                onClick={() => setSelectedPlan(plan.slug)}
                className={`rounded-2xl border p-4 text-left transition ${
                  selectedPlan === plan.slug ? "border-indigo-300 bg-white text-slate-900" : "border-slate-700 bg-slate-800"
                }`}
              >
                <p className="font-bold">{plan.name}</p>
                <p className="mt-2 text-2xl font-black">
                  {plan.currency} {plan.price.toLocaleString("es-UY")}
                </p>
                <p className="mt-2 text-sm opacity-80">Hasta {plan.limits.clients ?? "—"} clientes</p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-8 shadow-2xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Crear cuenta</h2>
              <p className="text-sm text-slate-500">Plan: {selectedPlanInfo?.name ?? "cargando..."}</p>
            </div>
            <Link to="/login" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
              Ingresar
            </Link>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <input
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="Empresa / corredora"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nombre del administrador"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email de facturación"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Contraseña"
              minLength={8}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />

            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            {checkoutUrl && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">{checkoutUrl}</p>}

            <button
              type="submit"
              disabled={isSubmitting || isLoadingPlans}
              className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {isSubmitting ? "Creando cuenta..." : "Crear cuenta y pagar"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
