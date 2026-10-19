'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'
import { LogoLoader } from '@/components/brand/logo-loader'

const GEN_STEPS = [
  'Sélection des recettes',
  'Vérification de la variété',
  'Prise en compte de ta famille',
  'Finalisation',
]

// Génération du menu : les convives s'installent pendant que les étapes
// avancent (même animation que le chargement de l'app). Rendu au niveau du
// document : un parent qui crée son propre contexte de positionnement
// décalerait sinon le plein écran.
export function GeneratingOverlay({ genStep }: { genStep: number }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return createPortal(
    <div role="status" aria-live="polite" className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-7 bg-[var(--kkb-creme)] px-8">
      <LogoLoader size={112} />

      <div className="text-center">
        <p className="text-h1 text-[var(--kkb-foret)]">On prépare ta semaine</p>
        <p className="mt-1 font-quicksand text-sm text-[var(--kkb-texte-2)]">Quelques secondes, le temps de dresser la table.</p>
      </div>

      <div className="w-full max-w-xs space-y-5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--kkb-lin)]">
          <div
            className="h-full rounded-full bg-[var(--kkb-sauge)] transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${Math.min(genStep, 4) * 25}%` }}
          />
        </div>

        <ol className="space-y-3">
          {GEN_STEPS.map((label, i) => {
            const done   = genStep > i
            const active = genStep === i
            return (
              <li key={label} className="flex items-center gap-3">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
                  done ? 'bg-[var(--kkb-sauge)] text-[var(--kkb-profond)]' : active ? 'bg-[var(--kkb-foret)]' : 'border-[1.5px] border-dashed border-[var(--kkb-filet)]'
                }`}>
                  {done ? <Check className="h-3.5 w-3.5" /> : active ? <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--kkb-creme)]" /> : null}
                </span>
                <span className={`font-quicksand text-sm transition-colors ${
                  done ? 'text-[var(--kkb-foret-500)]' : active ? 'font-bold text-[var(--kkb-profond)]' : 'text-[var(--kkb-texte-2)]'
                }`}>
                  {label}
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </div>,
    document.body,
  )
}
