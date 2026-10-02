'use client'

import { CheckCircle, Wand2 } from 'lucide-react'

const GEN_STEPS = [
  'Sélection des recettes…',
  'Vérification de la variété…',
  'Prise en compte de votre famille…',
  'Finalisation…',
]

export function GeneratingOverlay({ genStep }: { genStep: number }) {
  return (
    <div className="fixed inset-0 z-50 bg-[var(--kkb-bg)] flex flex-col items-center justify-center gap-8 px-8">
      <Wand2 className="h-12 w-12 text-[var(--kkb-coral)] animate-kkb-pulse" />

      <p className="text-h1 text-[var(--kkb-text-primary)]">Génération en cours…</p>

      <div className="w-full max-w-xs space-y-6">
        <div className="h-1 w-full rounded-full bg-[var(--kkb-border)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--kkb-coral)] transition-all duration-500 ease-out"
            style={{ width: `${Math.min(genStep, 4) * 25}%` }}
          />
        </div>

        <div className="space-y-3.5">
          {GEN_STEPS.map((label, i) => {
            const done   = genStep > i
            const active = genStep === i
            return (
              <div key={i} className="flex items-center gap-3">
                {done ? (
                  <CheckCircle className="h-5 w-5 text-[var(--kkb-success)] flex-shrink-0" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-[var(--kkb-border)] flex-shrink-0" />
                )}
                <p className={`text-sm font-quicksand transition-colors ${
                  done ? 'text-[var(--kkb-success)]'
                    : active ? 'text-[var(--kkb-text-primary)] font-bold'
                    : 'text-[var(--kkb-text-tertiary)]'
                }`}>
                  {label}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
