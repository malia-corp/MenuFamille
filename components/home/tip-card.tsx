'use client'

import { Heart, Lightbulb } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface TipCardProps {
  recipeId: string
  recipeName: string
  tip: string
}

export function TipCard({ recipeId, recipeName, tip }: TipCardProps) {
  const router = useRouter()

  return (
    <div className="bg-[var(--kkb-bg)] rounded-xl p-6 shadow-sm flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="h-8 w-8 rounded-full bg-[var(--kkb-warning)] text-white flex items-center justify-center shrink-0">
          <Lightbulb className="h-4 w-4" />
        </span>
        <span className="text-kkb-label text-[var(--kkb-warning)]">Astuce sérénité du jour</span>
      </div>
      <p className="font-quicksand text-sm text-[var(--kkb-text-secondary)] line-clamp-4">{tip}</p>
      <button type="button" onClick={() => router.push(`/recipes/${recipeId}`)} className="flex items-center justify-between pt-2 text-left">
        <span className="text-sm font-quicksand font-semibold text-[var(--kkb-coral)] truncate">
          Astuce de « {recipeName} »
        </span>
        <Heart className="h-5 w-5 text-[var(--kkb-coral)] opacity-40 shrink-0" />
      </button>
    </div>
  )
}
