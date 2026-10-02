'use client'

import { UserCircle } from 'lucide-react'

interface VoteIdentityPanelProps {
  name:            string
  onNameChange:    (v: string) => void
  onNameBlur:      () => void
  ratedCount:      number
  totalCount:      number
  submitted:       boolean
}

// Panneau "Identité de vote" — desktop uniquement (xl: et plus), regroupe le
// badge Pret/Enregistre + le champ prenom + la progression. Sur mobile, le
// champ prenom reste sous le hero et la progression dans la barre sticky du
// bas (pas assez de place pour un panneau separe).
export function VoteIdentityPanel({
  name, onNameChange, onNameBlur, ratedCount, totalCount, submitted,
}: VoteIdentityPanelProps) {
  const percent = totalCount > 0 ? Math.round((ratedCount / totalCount) * 100) : 0

  return (
    <div className="bg-white border border-[var(--kkb-border)] rounded-[var(--kkb-radius-card)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-quicksand font-bold uppercase tracking-wide text-[var(--kkb-text-tertiary)]">
          Identité de vote
        </p>
        <span className={`text-[10px] font-quicksand font-bold uppercase px-2 py-0.5 rounded-full ${
          submitted ? 'bg-[var(--kkb-teal-light)] text-[var(--kkb-teal)]' : 'bg-[var(--kkb-success-light)] text-[var(--kkb-success)]'
        }`}>
          {submitted ? 'Enregistré' : 'Prêt'}
        </span>
      </div>

      <div>
        <p className="text-[10px] font-quicksand font-bold uppercase tracking-wide text-[var(--kkb-text-tertiary)] mb-1">
          Ton prénom
        </p>
        <div className="flex items-center gap-2 bg-[var(--kkb-bg)] border-[1.5px] border-[var(--kkb-border)] focus-within:border-[var(--kkb-coral)] rounded-[var(--kkb-radius-sm)] px-3 py-2.5 transition-colors">
          <UserCircle className="h-4 w-4 text-[var(--kkb-text-tertiary)] shrink-0" />
          <input
            type="text"
            value={name}
            onChange={e => onNameChange(e.target.value)}
            onBlur={onNameBlur}
            placeholder="Ex: Koffi, Bénédicte..."
            aria-label="Ton prénom"
            className="flex-1 text-sm font-quicksand text-[var(--kkb-text-primary)] bg-transparent outline-none placeholder:text-[var(--kkb-text-tertiary)]"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-quicksand text-[var(--kkb-text-secondary)]">{ratedCount} / {totalCount} repas notés</span>
          <span className="text-xs font-quicksand font-bold text-[var(--kkb-coral)]">{percent}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-[var(--kkb-border)] overflow-hidden">
          <div className="h-full rounded-full bg-[var(--kkb-coral)] transition-all duration-300" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  )
}
