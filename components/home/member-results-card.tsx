'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, BarChart3 } from 'lucide-react'

// Accueil d'un membre (pas planificatrice) : accès aux résultats des votes de la famille.
export function MemberResultsCard() {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => router.push('/votes/results/member')}
      className="w-full flex items-center gap-3 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-coral)]/30 bg-[var(--kkb-coral-light)] p-4 text-left transition-colors hover:border-[var(--kkb-coral)]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[var(--kkb-coral)]">
        <BarChart3 className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-dosis font-bold text-base text-[var(--kkb-text-primary)]">Résultats des votes de la famille</span>
        <span className="block text-xs font-quicksand text-[var(--kkb-text-secondary)]">Découvre l’harmonie du menu de la semaine</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-[var(--kkb-coral)]" />
    </button>
  )
}
