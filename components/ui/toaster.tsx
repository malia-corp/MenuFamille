'use client'

import { AlertTriangle, CheckCircle, Info, X, XCircle, type LucideIcon } from 'lucide-react'
import { useToastStore, type ToastVariant } from '@/lib/stores/toast-store'

const STYLE: Record<ToastVariant, { icon: LucideIcon; box: string; iconColor: string }> = {
  success: { icon: CheckCircle,   box: 'bg-[var(--kkb-success-light)] border-[var(--kkb-success)]', iconColor: 'text-[var(--kkb-success)]' },
  error:   { icon: XCircle,       box: 'bg-[var(--kkb-danger-light)] border-[var(--kkb-danger)]',   iconColor: 'text-[var(--kkb-danger)]' },
  warning: { icon: AlertTriangle, box: 'bg-[var(--kkb-warning-light)] border-[var(--kkb-warning)]', iconColor: 'text-[var(--kkb-warning)]' },
  info:    { icon: Info,          box: 'bg-[var(--kkb-teal-light)] border-[var(--kkb-teal)]',       iconColor: 'text-[var(--kkb-teal)]' },
}

// Pile de toasts globale : en haut au centre (mobile), en haut à droite (desktop).
export function Toaster() {
  const toasts  = useToastStore(s => s.toasts)
  const dismiss = useToastStore(s => s.dismiss)

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2 lg:left-auto lg:right-6 lg:translate-x-0 print:hidden"
    >
      {toasts.map(t => {
        const { icon: Icon, box, iconColor } = STYLE[t.variant]
        return (
          <div
            key={t.id}
            role={t.variant === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex animate-kkb-toast-in items-center gap-2.5 rounded-[var(--kkb-radius-sm)] border px-4 py-3 shadow-[var(--kkb-shadow-card)] ${box}`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
            <p className="min-w-0 flex-1 text-sm font-quicksand font-semibold text-[var(--kkb-text-primary)]">{t.message}</p>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Fermer" className="shrink-0 text-[var(--kkb-text-tertiary)] hover:text-[var(--kkb-text-primary)]">
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
