import { BookHeart, ChefHat, Clock, CupSoda, Salad, Timer, Users } from 'lucide-react'
import { formatDuration } from './types'

const PRINT_CSS = `
@page { size: A4 portrait; margin: 14mm; }
@media print { html, body { background: #fff !important; } }
.recipe-sheet { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
`

const DIFFICULTY: Record<string, string> = { facile: 'Facile', moyen: 'Intermédiaire', difficile: 'Difficile' }

interface RecipePrintSheetProps {
  name:          string
  categoryName:  string | null
  difficulty:    string | null
  prepTime:      number | null
  cookTime:      number | null
  servings:      number
  photoUrl:      string | null
  description:   string | null
  ingredients:   { id: string; name: string; qty: string }[]
  steps:         { id: string; step_number: number; description: string }[]
  sides:         string[]
  drinks:        string[]
}

// Fiche recette : invisible à l'écran, seule visible à l'impression.
export function RecipePrintSheet(p: RecipePrintSheetProps) {
  const total = (p.prepTime ?? 0) + (p.cookTime ?? 0)
  const metas = [
    p.prepTime ? { icon: Clock, label: 'Préparation', value: formatDuration(p.prepTime) } : null,
    p.cookTime ? { icon: Timer, label: 'Cuisson', value: formatDuration(p.cookTime) } : null,
    total ? { icon: Clock, label: 'Total', value: formatDuration(total) } : null,
    { icon: Users, label: 'Portions', value: `${p.servings} pers.` },
    p.difficulty ? { icon: ChefHat, label: 'Niveau', value: DIFFICULTY[p.difficulty] ?? p.difficulty } : null,
  ].filter((m): m is NonNullable<typeof m> => m !== null)

  return (
    <div className="recipe-sheet hidden font-quicksand text-[10.5pt] text-[var(--kkb-text-primary)] print:block">
      <style>{PRINT_CSS}</style>

      <header className="mb-5 flex items-start justify-between gap-6 border-b-2 border-[var(--kkb-coral)] pb-3">
        <div className="min-w-0 space-y-1.5">
          <p className="text-[8.5pt] font-bold uppercase tracking-wider text-[var(--kkb-coral)]">
            KeskonBouf · Carnet culinaire{p.categoryName ? ` · ${p.categoryName}` : ''}
          </p>
          <h1 className="font-dosis font-extrabold text-[22pt] leading-tight">{p.name}</h1>
          <div className="flex flex-wrap gap-x-5 gap-y-1 pt-1">
            {metas.map(m => (
              <span key={m.label} className="inline-flex items-center gap-1.5 text-[9.5pt]">
                <m.icon className="h-3.5 w-3.5 text-[var(--kkb-coral)]" />
                <span className="text-[var(--kkb-text-tertiary)]">{m.label}</span>
                <span className="font-bold">{m.value}</span>
              </span>
            ))}
          </div>
        </div>
        {p.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.photoUrl} alt="" className="h-[34mm] w-[46mm] shrink-0 rounded-[var(--kkb-radius-sm)] object-cover" />
        )}
      </header>

      <div className="grid grid-cols-[36%_1fr] gap-8">
        <section className="space-y-2">
          <h2 className="font-dosis font-bold text-[13pt]">Ingrédients <span className="font-quicksand text-[9pt] font-normal text-[var(--kkb-text-tertiary)]">pour {p.servings} pers.</span></h2>
          <ul>
            {p.ingredients.map(i => (
              <li key={i.id} className="flex items-baseline gap-2 border-b border-[var(--kkb-border)] py-1.5">
                <span className="relative top-[2px] h-3 w-3 shrink-0 rounded-[2px] border-[1.5px] border-[var(--kkb-text-tertiary)]" aria-hidden="true" />
                <span className="min-w-0 flex-1">{i.name}</span>
                <span className="shrink-0 font-bold text-[var(--kkb-coral)]">{i.qty}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-dosis font-bold text-[13pt]">Préparation</h2>
          <ol className="space-y-3">
            {p.steps.map(s => (
              <li key={s.id} className="flex break-inside-avoid gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--kkb-coral)] font-dosis text-[10pt] font-bold text-white">{s.step_number}</span>
                <p className="pt-0.5 leading-relaxed">{s.description}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {p.description && (
        <section className="mt-6 break-inside-avoid rounded-[var(--kkb-radius-sm)] border border-[var(--kkb-warning)] bg-[var(--kkb-warning-light)] px-4 py-3">
          <p className="mb-1 flex items-center gap-1.5 text-[8.5pt] font-bold uppercase tracking-wider text-[#B07A12]">
            <BookHeart className="h-3.5 w-3.5" /> Astuces de Maman
          </p>
          <p className="italic leading-relaxed text-[var(--kkb-text-secondary)]">« {p.description} »</p>
        </section>
      )}

      {(p.sides.length > 0 || p.drinks.length > 0) && (
        <section className="mt-4 break-inside-avoid space-y-1 text-[9.5pt]">
          <p className="font-dosis font-bold text-[11pt]">Se marie bien avec</p>
          {p.sides.length > 0 && (
            <p className="flex items-center gap-1.5"><Salad className="h-3.5 w-3.5 text-[var(--kkb-coral)]" /> {p.sides.join(', ')}</p>
          )}
          {p.drinks.length > 0 && (
            <p className="flex items-center gap-1.5"><CupSoda className="h-3.5 w-3.5 text-[var(--kkb-teal)]" /> {p.drinks.join(', ')}</p>
          )}
        </section>
      )}

      <p className="mt-6 border-t border-[var(--kkb-border)] pt-2 text-[8pt] text-[var(--kkb-text-tertiary)]">Fiche imprimée depuis KeskonBouf</p>
    </div>
  )
}
