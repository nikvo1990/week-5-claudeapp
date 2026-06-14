interface KPICardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  delta?: { value: string; positive: boolean }
}

export default function KPICard({ label, value, icon, delta }: KPICardProps) {
  return (
    <div className="bg-an-bg-surface border border-an-border rounded-md p-4">
      <div className="flex items-start justify-between mb-3">
        <span className="text-body-sm text-an-fg-subtle">{label}</span>
        <span className="text-an-fg-muted">{icon}</span>
      </div>
      <div className="text-display font-medium text-an-fg-base">{value}</div>
      {delta && (
        <div className={`text-caption mt-1 ${delta.positive ? 'text-an-success' : 'text-an-error'}`}>
          {delta.positive ? '+' : ''}{delta.value}
        </div>
      )}
    </div>
  )
}
