'use client'

interface ChipLike {
  id:   string
  name: string
}

interface CompositionChipsRowProps {
  sides: ChipLike[]
  drink: ChipLike | null
  size?: 'xs' | 'sm'
}

// Affiche accompagnement(s) + boisson comme des puces distinctes (coral pour
// les accompagnements, teal pour la boisson) — pas une concatenation "+" qui
// noie le plat principal dans une seule chaine. Reutilise partout ou une
// composition de repas est affichee en lecture (carte /plan, synthese).
export function CompositionChipsRow({ sides, drink, size = 'sm' }: CompositionChipsRowProps) {
  if (sides.length === 0 && !drink) return null
  const textSize = size === 'xs' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'

  return (
    <div className="flex flex-wrap gap-1">
      {sides.map(s => (
        <span key={s.id} className={`inline-block bg-[var(--kkb-coral-light)] text-[var(--kkb-coral)] rounded-full font-quicksand font-medium ${textSize}`}>
          {s.name}
        </span>
      ))}
      {drink && (
        <span className={`inline-block bg-[var(--kkb-teal-light)] text-[var(--kkb-teal)] rounded-full font-quicksand font-medium ${textSize}`}>
          {drink.name}
        </span>
      )}
    </div>
  )
}
