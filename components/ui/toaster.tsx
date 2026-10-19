'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, CircleAlert, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react'
import { useToastStore, type ToastItem, type ToastVariant } from '@/lib/stores/toast-store'

// Pastille d'icône et couleur de la barre de temps, par type de message.
const STYLE: Record<ToastVariant, { icon: LucideIcon; tile: string; bar: string }> = {
  success: { icon: Check,         tile: 'bg-[var(--kkb-sauge)] text-[var(--kkb-profond)]', bar: 'bg-[var(--kkb-sauge)]' },
  error:   { icon: CircleAlert,   tile: 'bg-[var(--kkb-orange)] text-white',               bar: 'bg-[var(--kkb-orange-300)]' },
  warning: { icon: TriangleAlert, tile: 'bg-[var(--kkb-jaune)] text-[var(--kkb-profond)]', bar: 'bg-[var(--kkb-jaune)]' },
  info:    { icon: Info,          tile: 'bg-white/15 text-[var(--kkb-creme)]',             bar: 'bg-white/50' },
}

const EXIT_MS = 180

// Pile de messages : en haut au centre (mobile), sous l'en-tête à droite (desktop).
export function Toaster() {
  const toasts  = useToastStore(s => s.toasts)
  const dismiss = useToastStore(s => s.dismiss)

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+12px)] z-[100] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2 lg:left-auto lg:right-[var(--kkb-gutter)] lg:top-[84px] lg:translate-x-0 print:hidden"
    >
      {toasts.map(t => <Toast key={t.id} toast={t} onDismiss={dismiss} />)}
    </div>
  )
}

// Un message : se ferme seul après sa durée, en pause tant qu'on le survole
// ou qu'il a le focus (le temps de le lire), avec une courte sortie animée.
function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const { icon: Icon, tile, bar } = STYLE[toast.variant]
  const [paused,  setPaused]  = useState(false)
  const [leaving, setLeaving] = useState(false)
  const remaining = useRef(toast.duration)

  const close = useCallback(() => {
    setLeaving(true)
    setTimeout(() => onDismiss(toast.id), EXIT_MS)
  }, [onDismiss, toast.id])

  useEffect(() => {
    if (paused || leaving) return
    const startedAt = Date.now()
    const timer = setTimeout(close, remaining.current)
    return () => {
      clearTimeout(timer)
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt))
    }
  }, [paused, leaving, close])

  return (
    <div
      role={toast.variant === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`pointer-events-auto relative flex items-center gap-3 overflow-hidden rounded-[var(--kkb-r-lg)] bg-[var(--kkb-profond)] py-2 pl-2 pr-1.5 shadow-[0_12px_32px_rgba(31,58,46,0.32)] ring-1 ring-white/10 motion-reduce:animate-none ${
        leaving ? 'animate-kkb-toast-out' : 'animate-kkb-toast-in'
      }`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tile}`}>
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <p className="min-w-0 flex-1 py-1 font-quicksand text-sm font-semibold leading-snug text-[var(--kkb-creme)]">{toast.message}</p>
      <button
        type="button"
        onClick={close}
        aria-label="Fermer"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--kkb-foret-100)] transition-colors hover:bg-white/10 hover:text-[var(--kkb-creme)]"
      >
        <X className="h-4 w-4" />
      </button>
      {/* Temps restant avant fermeture, en pause au survol */}
      <span aria-hidden="true" className="absolute inset-x-4 bottom-1 h-[3px] overflow-hidden rounded-full bg-white/10">
        <span
          className={`block h-full origin-left rounded-full motion-reduce:hidden ${bar}`}
          style={{
            animation: `kkb-toast-progress ${toast.duration}ms linear forwards`,
            animationPlayState: paused || leaving ? 'paused' : 'running',
          }}
        />
      </span>
    </div>
  )
}
