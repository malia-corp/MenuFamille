'use client'

import { ArrowLeft, Check, type LucideIcon } from 'lucide-react'

// Mise en page commune à la création et à l'adhésion d'un cercle : panneau
// vert (explication, étapes) et carte blanche (formulaire), côte à côte sur
// desktop, empilés sur mobile.
export function EntryShell({ aside, onBack, children }: { aside: React.ReactNode; onBack?: () => void; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-lg px-4 pb-8 pt-2 lg:max-w-none lg:px-0 lg:pt-0">
      <div className="grid gap-4 lg:min-h-[calc(100vh-152px)] lg:grid-cols-12 lg:gap-5">
        <aside className="flex flex-col rounded-[var(--kkb-r-xl)] bg-[var(--kkb-foret)] p-5 lg:col-span-5 lg:p-10">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Retour"
              className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[var(--kkb-creme)] transition-colors hover:bg-white/20 lg:mb-8"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          {aside}
        </aside>
        <section className="flex flex-col justify-center rounded-[var(--kkb-r-xl)] bg-white p-5 lg:col-span-7 lg:p-10">
          <div className="mx-auto w-full max-w-md">{children}</div>
        </section>
      </div>
    </div>
  )
}

export interface EntryStep {
  icon:  LucideIcon
  title: string
  text:  string
}

// Étapes du parcours ; current = étape en cours (les précédentes sont cochées).
export function EntrySteps({ steps, current }: { steps: EntryStep[]; current: number }) {
  return (
    <ol className="mt-5 grid grid-cols-3 gap-2 lg:mt-auto lg:grid-cols-1 lg:gap-0 lg:pt-10">
      {steps.map(({ icon: Icon, title, text }, i) => {
        const done = i < current
        const now  = i === current
        return (
          <li
            key={title}
            aria-current={now ? 'step' : undefined}
            className="relative flex flex-col items-center gap-2 text-center lg:flex-row lg:items-start lg:gap-4 lg:pb-6 lg:text-left lg:last:pb-0"
          >
            {/* Fil entre les étapes (desktop) */}
            {i < steps.length - 1 && (
              <span aria-hidden="true" className={`absolute left-5 top-11 hidden h-[calc(100%-44px)] w-px border-l lg:block ${done ? 'border-solid border-[var(--kkb-sauge)]' : 'border-dashed border-white/25'}`} />
            )}
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              done ? 'bg-[var(--kkb-sauge)] text-[var(--kkb-profond)]' : now ? 'bg-[var(--kkb-creme)] text-[var(--kkb-foret)]' : 'bg-white/10 text-[var(--kkb-sauge)]'
            }`}>
              {done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
            </span>
            <span className="min-w-0">
              <span className={`block font-quicksand text-xs font-bold leading-tight lg:text-[15px] ${done ? 'text-[var(--kkb-foret-100)]' : 'text-[var(--kkb-creme)]'}`}>
                <span className="hidden lg:inline">{i + 1}. </span>{title}
                {done && <span className="sr-only"> (fait)</span>}
              </span>
              <span className="hidden font-quicksand text-sm text-[var(--kkb-foret-100)] lg:block">{text}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
