import { ChefHat } from 'lucide-react'

type Difficulty = 'facile' | 'moyen' | 'difficile'

const LEVEL: Record<Difficulty, number> = { facile: 1, moyen: 2, difficile: 3 }
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { facile: 'Facile', moyen: 'Moyen', difficile: 'Difficile' }

// Niveau en toques : une, deux ou trois toques pleines sur trois.
export function DifficultyMeter({ value, withLabel = true, className = '' }: { value: Difficulty | null; withLabel?: boolean; className?: string }) {
  if (!value) return null
  const level = LEVEL[value]
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} title={`Difficulté : ${DIFFICULTY_LABEL[value]}`}>
      <span className="flex" aria-hidden="true">
        {[1, 2, 3].map(i => (
          <ChefHat key={i} className={`h-3.5 w-3.5 ${i <= level ? 'text-[var(--kkb-foret-500)]' : 'text-[var(--kkb-filet)]'}`} />
        ))}
      </span>
      {withLabel
        ? <span className="font-quicksand text-xs font-semibold text-[var(--kkb-texte-2)]">{DIFFICULTY_LABEL[value]}</span>
        : <span className="sr-only">Difficulté : {DIFFICULTY_LABEL[value]}</span>}
    </span>
  )
}
