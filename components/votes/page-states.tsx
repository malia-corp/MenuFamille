import { Loader2 } from 'lucide-react'

export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-[var(--kkb-coral)]" />
    </div>
  )
}

export function EmptyState({ icon, title, message, action, children }: {
  icon?: React.ReactNode
  title: string
  message: string
  action?: { label: string; onClick: () => void }
  children?: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="space-y-3 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-6 text-center">
        {icon && <div className="flex justify-center">{icon}</div>}
        <p className="font-dosis font-semibold text-lg text-[var(--kkb-text-primary)]">{title}</p>
        <p className="text-sm font-quicksand text-[var(--kkb-text-secondary)]">{message}</p>
        {children}
        {action && (
          <button type="button" onClick={action.onClick} className="mt-1 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral)] px-5 py-2.5 text-sm font-quicksand font-bold text-white">
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}
