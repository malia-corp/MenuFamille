import { Star } from 'lucide-react'
import { MEAL_LABEL, MEAL_TYPE_ORDER, type MealType } from '@/lib/constants/meal-type'
import { MealTypeIcon } from '@/components/ui/meal-type-icon'
import { DAY_OPTIONS, formatWeekRange } from '@/lib/utils/week'
import { agreementPct, isRejected } from '@/lib/utils/survey-score'
import type { ResultItem, SurveyResultsData } from './types'

const PRINT_CSS = `
@page { size: A4 landscape; margin: 10mm; }
@media print { html, body { background: #fff !important; } }
.fridge-sheet { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
`

const MAX_COMMENTS = 6
// Hauteur utile du tableau sur A4 paysage (marges, en-tête et mots de la famille déduits)
const TABLE_HEIGHT_MM = 128
const TEMPLATE_ROW_MM = 14

// Feuille "frigo" : invisible à l'écran, seule visible à l'impression.
export function FridgePrintSheet({ data, favoriteIds }: { data: SurveyResultsData; favoriteIds: string[] }) {
  const monday    = new Date(data.week_start + 'T00:00:00')
  const days      = DAY_OPTIONS
    .map((d, idx) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + idx)
      return { ...d, date: date.getDate() }
    })
    .filter(d => data.items.some(i => !i.applies_all_days && i.day_of_week === d.val))
  const mealTypes = (Object.keys(MEAL_TYPE_ORDER) as MealType[])
    .sort((a, b) => MEAL_TYPE_ORDER[a] - MEAL_TYPE_ORDER[b])
    .filter(t => data.items.some(i => i.meal_type === t))
  const templateRows = mealTypes.filter(t => data.items.some(i => i.meal_type === t && i.applies_all_days)).length
  const dailyRows    = mealTypes.length - templateRows
  const dailyRowMm   = dailyRows > 0 ? Math.min(45, (TABLE_HEIGHT_MM - templateRows * TEMPLATE_ROW_MM) / dailyRows) : 0
  const comments  = data.items
    .flatMap(i => i.comments.map(c => ({ ...c, recipe: i.recipe_name })))
    .slice(0, MAX_COMMENTS)
  const voters    = Array.from(new Set(data.respondents.map(r => r.name.trim()).filter(Boolean)))

  return (
    <div className="fridge-sheet hidden print:block text-[var(--kkb-text-primary)] font-quicksand">
      <style>{PRINT_CSS}</style>

      <header className="mb-3 flex items-end justify-between gap-6 border-b-2 border-[var(--kkb-coral)] pb-2">
        <div>
          <p className="text-[9pt] font-bold uppercase tracking-wider text-[var(--kkb-coral)]">KeskonBouf · Le menu de la famille</p>
          <h1 className="font-dosis font-extrabold text-[22pt] leading-none">Semaine du {formatWeekRange(data.week_start)}</h1>
        </div>
        <div className="text-right text-[9pt] leading-snug">
          {data.global_score !== null && (
            <p><span className="font-bold text-[var(--kkb-coral)]">{data.global_score}% d&apos;accord</span> · {data.total_respondents} vote{data.total_respondents > 1 ? 's' : ''}</p>
          )}
          {voters.length > 0 && <p className="text-[var(--kkb-text-secondary)]">Ont voté : {voters.join(', ')}</p>}
        </div>
      </header>

      <table className="w-full table-fixed border-collapse text-[10.5pt]">
        <thead>
          <tr>
            <th className="w-[28mm]" />
            {days.map(d => (
              <th key={d.val} className="border border-[var(--kkb-border)] bg-[var(--kkb-coral-light)] px-1.5 py-1.5 text-center font-dosis text-[12pt] font-bold">
                {d.full} <span className="font-quicksand font-normal text-[var(--kkb-text-secondary)]">{d.date}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {mealTypes.map(type => {
            const template = data.items.find(i => i.meal_type === type && i.applies_all_days)
            return (
              <tr key={type} className="break-inside-avoid" style={{ height: `${template ? TEMPLATE_ROW_MM : dailyRowMm}mm` }}>
                <th className="border border-[var(--kkb-border)] bg-[var(--kkb-bg)] px-1.5 py-1 text-left align-top">
                  <span className="flex items-center gap-1 whitespace-nowrap font-dosis text-[11pt] font-bold">
                    <MealTypeIcon type={type} className="h-3.5 w-3.5 text-[var(--kkb-coral)]" />
                    {MEAL_LABEL[type]}
                  </span>
                </th>
                {template ? (
                  <td colSpan={Math.max(days.length, 1)} className="border border-[var(--kkb-border)] px-2 py-1.5 align-top">
                    <span className="mr-1.5 text-[8pt] font-bold uppercase text-[var(--kkb-text-tertiary)]">Tous les jours</span>
                    <MealCell item={template} favorite={favoriteIds.includes(template.id)} inline />
                  </td>
                ) : (
                  days.map(d => {
                    const item = data.items.find(i => i.meal_type === type && !i.applies_all_days && i.day_of_week === d.val)
                    return (
                      <td key={d.val} className="border border-[var(--kkb-border)] px-1.5 py-1.5 align-top">
                        {item ? <MealCell item={item} favorite={favoriteIds.includes(item.id)} /> : <span className="text-[var(--kkb-text-tertiary)]">—</span>}
                      </td>
                    )
                  })
                )}
              </tr>
            )
          })}
        </tbody>
      </table>

      {comments.length > 0 && (
        <section className="mt-3 break-inside-avoid rounded-[var(--kkb-radius-sm)] border border-[var(--kkb-border)] px-3 py-2">
          <p className="mb-1 font-dosis text-[11pt] font-bold">Les mots de la famille</p>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-[8.5pt] leading-snug">
            {comments.map((c, i) => (
              <li key={i}>
                <span className="font-bold">{c.respondent_name}</span>
                {c.recipe && <span className="text-[var(--kkb-text-tertiary)]"> ({c.recipe})</span>}
                {' : '}
                <span className="italic text-[var(--kkb-text-secondary)]">« {c.comment} »</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-2 flex items-center gap-1 text-[7.5pt] text-[var(--kkb-text-tertiary)]">
        <Star className="h-2.5 w-2.5 fill-[var(--kkb-warning)] text-[var(--kkb-warning)]" /> plat favori de la semaine · % = part des votes J&apos;adore + Ça passe
      </p>
    </div>
  )
}

function MealCell({ item, favorite, inline }: { item: ResultItem; favorite: boolean; inline?: boolean }) {
  const counts   = { aime: item.aime, bof: item.bof, naime_pas: item.naime_pas }
  const pct      = agreementPct(counts)
  const rejected = isRejected(counts)
  const extras   = [...item.side_names, ...(item.drink_name ? [item.drink_name] : [])].join(' · ')
  const Wrapper  = inline ? 'span' : 'div'

  return (
    <Wrapper className={inline ? 'inline' : 'block'}>
      <span className={`font-bold leading-tight ${inline ? '' : 'block'}`}>
        {favorite && <Star className="mr-0.5 inline h-3 w-3 -mt-0.5 fill-[var(--kkb-warning)] text-[var(--kkb-warning)]" />}
        {item.recipe_name ?? 'Repas non défini'}
      </span>
      {extras && <span className={`text-[9pt] text-[var(--kkb-text-secondary)] ${inline ? 'ml-1.5' : 'mt-0.5 block'}`}>{extras}</span>}
      {pct !== null && (
        <span
          className={`text-[8.5pt] font-bold ${inline ? 'ml-1.5' : 'mt-1 block'}`}
          style={{ color: rejected ? 'var(--kkb-danger)' : 'var(--kkb-success)' }}
        >
          {rejected ? `À revoir · ${pct}% d'accord` : `${pct}% d'accord`}
        </span>
      )}
    </Wrapper>
  )
}
