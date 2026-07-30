import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiListPublicPlans, apiRegisterSaas } from "../services/api";
import type { BillingPlan } from "../services/api";

const PLAN_CLIENT_LIMITS = [100, 1000];
const PLAN_DISPLAY_NAMES = ["Inicial", "Crecimiento"];
const PRO_CONTACT_PLAN = "contacto-pro";
const WHATSAPP_NUMBER = import.meta.env.VITE_SALES_WHATSAPP ?? "59899123456";

const SOLUTION_AREAS = [
  { icon: "360°", title: "Clientes y cartera", detail: "Ficha integral con contactos, documentos, pólizas, roles y actividad relacionada." },
  { icon: "↻", title: "Renovaciones", detail: "Vencimientos priorizados para anticiparte y sostener la continuidad de cada cliente." },
  { icon: "✓", title: "Gestiones", detail: "Tareas, responsables, estados y fechas para que ningún seguimiento quede pendiente." },
  { icon: "!", title: "Siniestros", detail: "Registro conectado con cliente y póliza para ordenar la atención desde el primer aviso." },
  { icon: "+", title: "Aseguradoras", detail: "Información comercial y condiciones operativas disponibles para todo el equipo." },
  { icon: "IA", title: "Asistencia inteligente", detail: "Consultas y comandos asistidos para acceder más rápido a la información operativa." },
];

const BUSINESS_RESULTS = [
  { title: "Más oportunidades atendidas", detail: "Organizá la actividad comercial y detectá a tiempo renovaciones y próximos contactos." },
  { title: "Mejor experiencia del cliente", detail: "Respondé con contexto completo, sin buscar información en múltiples archivos o sistemas." },
  { title: "Un equipo más coordinado", detail: "Compartí prioridades, responsables y avances con una única fuente de información." },
];

function buildWhatsappUrl(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export default function RegisterSaas() {
  const location = useLocation();
  const loginPath = location.pathname.startsWith("/seguros") ? "/seguros/login" : "/login";
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState("basico");
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [contactMessage, setContactMessage] = useState("Hola, quiero recibir información sobre el plan Pro.");
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

  const paidPlans = useMemo(
    () =>
      plans.slice(0, 2).map((plan, index) => ({
        ...plan,
        name: PLAN_DISPLAY_NAMES[index] ?? plan.name,
        limits: { ...plan.limits, clients: PLAN_CLIENT_LIMITS[index] },
      })),
    [plans],
  );

  const selectedPlanInfo = useMemo(
    () => paidPlans.find((plan) => plan.slug === selectedPlan) ?? paidPlans[0] ?? null,
    [paidPlans, selectedPlan],
  );

  const isProContactSelected = selectedPlan === PRO_CONTACT_PLAN;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setCheckoutUrl(null);
    setSubmitting(true);

    if (isProContactSelected) {
      const message = [
        "Hola, quiero recibir información sobre el plan Pro de Gestión de Seguros.",
        companyName ? `Empresa: ${companyName}` : null,
        name ? `Contacto: ${name}` : null,
        email ? `Email: ${email}` : null,
        phone ? `Teléfono: ${phone}` : null,
        contactMessage ? `Mensaje: ${contactMessage}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      window.location.href = buildWhatsappUrl(message);
      setSubmitting(false);
      return;
    }

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
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-blue-950 via-blue-800 to-cyan-600 px-4 py-6 lg:px-8 lg:py-8">
      <div className="absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-sky-400/20 blur-3xl" />
      <div className="absolute -right-20 -top-24 h-[32rem] w-[32rem] rounded-full bg-indigo-500/30 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="relative mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-blue-950/95 via-blue-900/95 to-indigo-900/95 p-7 text-white shadow-2xl shadow-blue-950/40 backdrop-blur sm:p-9">
          <div className="flex items-center justify-between gap-4">
            <img src="/linsse.svg" alt="Linsse" className="h-10 w-auto rounded-lg bg-white px-3 py-2" />
            <span className="rounded-full border border-sky-300/30 bg-sky-300/10 px-3 py-1.5 text-xs font-bold text-sky-200">Software para corredores</span>
          </div>
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.3em] text-sky-300">Elegí cómo querés crecer</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight sm:text-5xl">Un plan para transformar tu gestión de seguros</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-blue-100">
            Centralizá tu cartera, anticipá renovaciones y acompañá cada oportunidad comercial desde una plataforma diseñada para hacer crecer tu corredora.
          </p>

          <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-sky-100">
            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-2">✓ Implementación simple</span>
            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-2">✓ Acceso desde cualquier lugar</span>
            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-2">✓ Información centralizada</span>
          </div>

          <div className="mt-7 grid gap-3 text-blue-50 sm:grid-cols-2">
            {SOLUTION_AREAS.map((feature) => (
              <div key={feature.title} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-300/15 text-xs font-black text-cyan-200">{feature.icon}</span>
                <div>
                  <p className="text-sm font-bold text-white">{feature.title}</p>
                  <p className="mt-1 text-xs leading-5 text-blue-200">{feature.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {paidPlans.map((plan) => (
              <button
                key={plan.slug}
                type="button"
                onClick={() => setSelectedPlan(plan.slug)}
                className={`rounded-2xl border p-4 text-left transition ${
                  selectedPlan === plan.slug ? "scale-[1.02] border-cyan-300 bg-white text-blue-950 shadow-xl" : "border-white/15 bg-white/[0.07] hover:bg-white/10"
                }`}
              >
                <p className="font-bold">{plan.name}</p>
                <p className="mt-2 text-2xl font-black">
                  {plan.currency} {plan.price.toLocaleString("es-UY")}
                </p>
                <p className="mt-2 text-sm opacity-80">Hasta {plan.limits.clients ?? "—"} clientes</p>
                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-cyan-500">Seleccionar plan →</p>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelectedPlan(PRO_CONTACT_PLAN)}
              className={`rounded-2xl border p-4 text-left transition ${
                isProContactSelected ? "scale-[1.02] border-cyan-300 bg-white text-blue-950 shadow-xl" : "border-white/15 bg-white/[0.07] hover:bg-white/10"
              }`}
            >
              <p className="font-bold">Pro</p>
              <p className="mt-2 text-2xl font-black">A medida</p>
              <p className="mt-2 text-sm opacity-80">Para carteras grandes o necesidades especiales</p>
              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-cyan-500">Hablar con ventas →</p>
            </button>
          </div>

          <div className="mt-8 border-t border-white/10 pt-7">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">Del primer contacto a la renovación</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {["Centralizá la información", "Priorizá cada gestión", "Medí y hacé crecer la cartera"].map((step, index) => (
                <div key={step} className="rounded-2xl bg-blue-950/40 p-4">
                  <span className="text-xs font-black text-cyan-300">0{index + 1}</span>
                  <p className="mt-2 text-sm font-bold text-white">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="self-start rounded-3xl border border-white/70 bg-white/95 p-7 shadow-2xl shadow-blue-950/30 backdrop-blur sm:p-8 lg:sticky lg:top-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Empezá hoy</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">{isProContactSelected ? "Diseñemos tu plan Pro" : "Creá tu cuenta"}</h2>
              <p className="text-sm text-slate-500">
                {isProContactSelected ? "Completá tus datos y hablamos por WhatsApp" : `Plan: ${selectedPlanInfo?.name ?? "cargando..."}`}
              </p>
            </div>
            <Link to={loginPath} className="shrink-0 text-sm font-semibold text-blue-700 hover:text-blue-900">
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

            {isProContactSelected ? (
              <>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Teléfono / WhatsApp"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <textarea
                  value={contactMessage}
                  onChange={(event) => setContactMessage(event.target.value)}
                  placeholder="Contanos cuántos usuarios, clientes o integraciones necesitás"
                  rows={4}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </>
            ) : (
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Contraseña"
                minLength={8}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            )}

            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            {checkoutUrl && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">{checkoutUrl}</p>}

            <button
              type="submit"
              disabled={isSubmitting || isLoadingPlans}
              className="w-full rounded-xl bg-gradient-to-r from-blue-700 to-cyan-600 py-3.5 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:from-blue-800 hover:to-cyan-700 disabled:opacity-60"
            >
              {isSubmitting
                ? isProContactSelected
                  ? "Preparando WhatsApp..."
                  : "Creando cuenta..."
                : isProContactSelected
                  ? "Enviar consulta por WhatsApp"
                  : "Crear cuenta y pagar"}
            </button>
          </form>

          {!isProContactSelected && (
            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-bold text-blue-950">¿Qué sucede después?</p>
              <ol className="mt-2 space-y-2 text-xs leading-5 text-blue-800">
                <li><strong>1.</strong> Creás el acceso administrador de tu empresa.</li>
                <li><strong>2.</strong> Confirmás el plan seleccionado en el checkout.</li>
                <li><strong>3.</strong> Ingresás a Linsse y comenzás a organizar tu cartera.</li>
              </ol>
            </div>
          )}

          <a
            href={buildWhatsappUrl("Hola, quiero recibir información sobre los planes de Gestión de Seguros.")}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex w-full items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            Contactar por WhatsApp
          </a>

        </section>
      </div>

      <section className="relative mx-auto mt-6 max-w-7xl rounded-3xl border border-white/60 bg-white/95 p-7 shadow-2xl shadow-blue-950/20 backdrop-blur sm:p-9">
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-600">Una plataforma, todo el negocio</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-blue-950">Información para operar mejor y argumentos para vender más</h2>
            <p className="mt-4 text-sm leading-6 text-slate-600">Linsse conecta la mirada comercial con la operación diaria. Cada cliente, póliza y gestión suma contexto para decidir el próximo paso con claridad.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {BUSINESS_RESULTS.map((result) => (
              <article key={result.title} className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50 to-white p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-700 text-sm font-bold text-white">✓</span>
                <h3 className="mt-4 font-bold text-blue-950">{result.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{result.detail}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="mt-8 grid gap-3 border-t border-slate-200 pt-6 text-sm text-slate-600 sm:grid-cols-3">
          <p><strong className="block text-blue-950">¿Puedo cambiar de plan?</strong>Sí, podés acompañar el crecimiento de tu cartera.</p>
          <p><strong className="block text-blue-950">¿Necesito instalar algo?</strong>No. El acceso es web y centralizado.</p>
          <p><strong className="block text-blue-950">¿Tengo una necesidad especial?</strong>El plan Pro se diseña junto a nuestro equipo.</p>
        </div>
      </section>
    </div>
  );
}
