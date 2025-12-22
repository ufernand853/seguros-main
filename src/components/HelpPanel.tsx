import { Fragment } from "react";
import type { HelpContent } from "../content/helpContent";

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
  content: HelpContent;
}

export default function HelpPanel({ isOpen, onClose, content }: HelpPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-end sm:items-stretch">
      <button
        type="button"
        aria-label="Cerrar ayuda"
        className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <div
        className="relative z-50 w-full sm:max-w-md h-full bg-white shadow-2xl flex flex-col
                   transition-transform duration-300 ease-out translate-x-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-panel-title"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-wide text-gray-500">Ayuda contextual</p>
            <h2 id="help-panel-title" className="text-lg font-semibold text-gray-900">
              {content.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Cerrar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-sm text-gray-700 mb-3">{content.summary}</p>
          {content.steps?.length ? (
            <ul className="space-y-2">
              {content.steps.map((step, idx) => (
                <li key={step} className="flex items-start gap-2 text-sm text-gray-800">
                  <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 text-xs font-semibold">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {content.links?.length ? (
            <div className="mt-4 space-y-1">
              {content.links.map((link) => (
                <Fragment key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {link.label}
                  </a>
                </Fragment>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
