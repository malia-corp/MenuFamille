'use client'

import { ArrowLeft } from 'lucide-react'

// Bandeau vert des pages de saisie d'une recette (création, modification).
export function RecipeFormHero({ eyebrow, title, subtitle, onBack, backLabel, className = '' }: {
  eyebrow: string
  title: string
  subtitle: string
  onBack: () => void
  backLabel: string
  className?: string
}) {
  return (
    <section className={`flex flex-col rounded-[var(--kkb-r-xl)] bg-[var(--kkb-foret)] p-5 lg:p-6 ${className}`}>
      <button
        type="button"
        onClick={onBack}
        aria-label={backLabel}
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[var(--kkb-creme)] transition-colors hover:bg-white/20"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <p className="font-quicksand text-sm font-semibold text-[var(--kkb-foret-100)]">{eyebrow}</p>
      <h1 className="mt-0.5 text-h1 text-[var(--kkb-creme)]">{title}</h1>
      <p className="mt-1.5 max-w-xl font-quicksand text-sm text-[var(--kkb-foret-100)]">{subtitle}</p>
    </section>
  )
}
