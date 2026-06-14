'use client'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ open, title, description, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-an-bg-elevated border border-an-border rounded-md p-6 w-full max-w-sm mx-4 an-fade-in">
        <h2 className="text-body font-medium text-an-fg-base mb-2">{title}</h2>
        <p className="text-body-sm text-an-fg-subtle mb-6 leading-relaxed">{description}</p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="h-8 px-4 bg-transparent border border-an-border hover:bg-an-bg-surface text-an-fg-base text-label rounded transition-colors duration-150"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="h-8 px-4 bg-an-error/20 hover:bg-an-error/30 text-an-error text-label rounded transition-colors duration-150"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
