import { CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import type { Step, DocumentPreview } from '@/lib/types'

interface RightPanelProps {
  steps: Step[]
  documentPreview: DocumentPreview | null
}

const STEP_ICON = {
  pending:   <span className="w-2 h-2 rounded-full bg-an-fg-muted" />,
  running:   <Loader2 size={13} strokeWidth={1.5} className="text-an-accent animate-spin" />,
  completed: <CheckCircle size={13} strokeWidth={1.5} className="text-an-success" />,
  error:     <AlertCircle size={13} strokeWidth={1.5} className="text-an-error" />,
}

export default function RightPanel({ steps, documentPreview }: RightPanelProps) {
  return (
    <aside className="w-[304px] shrink-0 bg-an-bg-subtle border-l border-an-border flex flex-col h-full overflow-y-auto">

      {/* Execution steps */}
      <div className="p-4 border-b border-an-border">
        <h3 className="text-body-sm font-medium text-an-fg-base mb-3">Execution steps</h3>
        {steps.length === 0 ? (
          <p className="text-caption text-an-fg-muted">Waiting for activity…</p>
        ) : (
          <div className="flex flex-col gap-2">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="shrink-0">{STEP_ICON[step.status]}</span>
                <span className={`text-body-sm ${
                  step.status === 'error' ? 'text-an-error' :
                  step.status === 'completed' ? 'text-an-fg-subtle' :
                  'text-an-fg-base'
                }`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document preview */}
      {documentPreview && (
        <div className="p-4 flex flex-col gap-3">
          <h3 className="text-body-sm font-medium text-an-fg-base">Document preview</h3>
          <p className="text-caption text-an-fg-muted truncate">{documentPreview.filename}</p>

          {documentPreview.type === 'pdf' ? (
            <div>
              <iframe
                src={documentPreview.url}
                className="w-full h-56 rounded border border-an-border"
                title={documentPreview.filename}
              />
              <p className="text-caption text-an-fg-muted mt-2">Scroll inside the preview to navigate pages.</p>
            </div>
          ) : (
            <div className="bg-an-bg-surface border border-an-border rounded p-3 max-h-56 overflow-y-auto">
              <pre className="font-mono text-[12px] text-an-fg-subtle whitespace-pre-wrap leading-relaxed">
                {documentPreview.text
                  ? documentPreview.text.slice(0, 4000) + (documentPreview.text.length > 4000 ? '\n… (preview truncated)' : '')
                  : 'Document parsed and ready.'}
              </pre>
            </div>
          )}
        </div>
      )}

    </aside>
  )
}
