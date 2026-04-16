import { useNavigate } from "react-router-dom";

type WorkflowStep = {
  title: string;
  description: string;
  actionLabel: string;
  actionPath: string;
  tone: string;
};

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    title: "1) Elegir cliente",
    description:
      "Inicia siempre desde el cliente: busca, valida datos de contacto y crea nuevos clientes cuando sea necesario.",
    actionLabel: "Ir a Clientes",
    actionPath: "/clientes",
    tone: "bg-blue-50 border-blue-200",
  },
  {
    title: "2) Cargar póliza contratada",
    description:
      "Luego registra o sigue el alta de la póliza para ese cliente, manteniendo el pipeline ordenado por etapas.",
    actionLabel: "Ir a Pipeline de pólizas",
    actionPath: "/pipeline",
    tone: "bg-emerald-50 border-emerald-200",
  },
  {
    title: "3) Dar de alta siniestro",
    description:
      "Cuando ocurra un evento, registra el siniestro vinculado al cliente y a su póliza para mantener trazabilidad completa.",
    actionLabel: "Ir a Siniestros",
    actionPath: "/siniestros/registro",
    tone: "bg-amber-50 border-amber-200",
  },
];

export default function ClientWorkflow() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col gap-5">
      <header className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
          Workflow recomendado
        </p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">Operación centrada en cliente</h1>
        <p className="mt-2 text-slate-600 max-w-3xl">
          Reordenamos el flujo para trabajar desde el cliente como entidad principal: primero identificas al cliente, luego
          cargas sus pólizas y finalmente registras los siniestros sobre esas pólizas activas.
        </p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {WORKFLOW_STEPS.map((step) => (
          <article
            key={step.title}
            className={`rounded-2xl border p-5 flex flex-col gap-4 shadow-sm ${step.tone}`}
          >
            <h2 className="text-lg font-semibold text-slate-900">{step.title}</h2>
            <p className="text-sm text-slate-700 flex-1">{step.description}</p>
            <button
              type="button"
              onClick={() => navigate(step.actionPath)}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-slate-900 hover:bg-black text-white font-semibold"
            >
              {step.actionLabel}
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}
