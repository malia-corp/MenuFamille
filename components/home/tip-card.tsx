'use client'

import Link from 'next/link'
import { ChevronRight, Lightbulb } from 'lucide-react'

interface TipCardProps {
  recipeId: string
  recipeName: string
  tip: string
}

// Astuce du jour, tirée d'une recette de la communauté.
export function TipCard({ recipeId, recipeName, tip }: TipCardProps) {
  return (
    <section className="rounded-[var(--kkb-r-xl)] bg-white p-4">
      <p className="flex items-center gap-2 font-quicksand text-xs font-bold text-[var(--kkb-jaune-text)]">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--kkb-jaune-50)]">
          <Lightbulb className="h-4 w-4 text-[var(--kkb-jaune-700)]" />
        </span>
        Astuce du jour
      </p>
      <p className="mt-2 line-clamp-4 font-quicksand text-sm text-[var(--kkb-texte-2)]">{tip}</p>
      <Link
        href={`/recipes/${recipeId}`}
        className="mt-1 flex min-h-11 items-center gap-0.5 font-quicksand text-sm font-bold text-[var(--kkb-foret)]"
      >
        <span className="truncate">Voir « {recipeName} »</span>
        <ChevronRight className="h-4 w-4 shrink-0" />
      </Link>
    </section>
  )
}
