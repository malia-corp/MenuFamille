'use client'

import { ArrowRight, Check, ChevronLeft, ChevronRight, Minus, Plus, Settings, Timer, Users, Zap } from 'lucide-react'
import { MEAL_COLOR, MEAL_LABEL, type MealType } from '@/lib/constants/meal-type'
import { MealTypeIcon } from '@/components/ui/meal-type-icon'

interface PlanHeroProps {
  weekLabel:   string
  onPrevWeek:  () => void
  onNextWeek:  () => void
  onSettings:  () => void
  hasPlan:     boolean
  validated:   boolean // menu partagé ou finalisé
  onValidate:  () => void
  onGenerate:  () => void
  filled:      number
  total:       number
  servings:    number
  onServings:  (next: number) => void
  updatingServings: boolean
  sessionLabel: string | null
  // Mobile : emplacement où le bouton flottant « Générer » vient se poser
  generateSlot?: React.ReactNode
  className?: string
  loading?: boolean
}

const ghostIcon = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-[var(--kkb-creme)] transition-colors hover:bg-white/20'

// Bandeau du menu de la semaine : semaine, étapes, avancement, convives.
export function PlanHero({
  weekLabel, onPrevWeek, onNextWeek, onSettings, hasPlan, validated, onValidate, onGenerate,
  filled, total, servings, onServings, updatingServings, sessionLabel, generateSlot, className = '', loading = false,
}: PlanHeroProps) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0

  return (
    <section className={`flex flex-col rounded-[var(--kkb-r-xl)] bg-[var(--kkb-foret)] p-5 lg:p-6 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        {/* Étapes : planifier puis valider (partage du sondage) */}
        <ol className="flex items-center gap-2" aria-label="Étapes">
          <li className="flex items-center gap-1.5 rounded-full bg-[var(--kkb-creme)] py-1 pl-1 pr-3" aria-current="step">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--kkb-foret)] font-quicksand text-[11px] font-bold text-[var(--kkb-creme)]">1</span>
            <span className="font-quicksand text-xs font-bold text-[var(--kkb-foret)]">Planifier</span>
          </li>
          <li aria-hidden="true" className="h-px w-4 bg-white/25" />
          <li>
            <button
              type="button"
              onClick={onValidate}
              disabled={!hasPlan}
              className="flex items-center gap-1.5 rounded-full bg-white/10 py-1 pl-1 pr-3 transition-colors hover:bg-white/20 disabled:opacity-50"
            >
              <span className={`flex h-6 w-6 items-center justify-center rounded-full font-quicksand text-[11px] font-bold ${validated ? 'bg-[var(--kkb-sauge)] text-[var(--kkb-profond)]' : 'bg-white/15 text-[var(--kkb-creme)]'}`}>
                {validated ? <Check className="h-3.5 w-3.5" /> : '2'}
              </span>
              <span className="font-quicksand text-xs font-bold text-[var(--kkb-creme)]">Valider</span>
            </button>
          </li>
        </ol>
        <button type="button" onClick={onSettings} className={ghostIcon} aria-label="Rythme des repas" title="Rythme des repas">
          <Settings className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* Semaine */}
      <div className="mt-4 flex items-center gap-2">
        <button type="button" onClick={onPrevWeek} className={ghostIcon} aria-label="Semaine précédente"><ChevronLeft className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1 text-center lg:flex-none lg:px-2 lg:text-left">
          <p className="font-quicksand text-sm font-semibold text-[var(--kkb-foret-100)]">Menu de la semaine du</p>
          <h1 className="truncate text-h1 text-[var(--kkb-creme)]">{weekLabel}</h1>
        </div>
        <button type="button" onClick={onNextWeek} className={ghostIcon} aria-label="Semaine suivante"><ChevronRight className="h-5 w-5" /></button>
      </div>

      {/* Avancement et convives */}
      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2 lg:mt-auto lg:pt-5">
        {loading ? (
          <div className="kkb-bone-dark h-[60px] rounded-[var(--kkb-r-md)]" aria-hidden="true" />
        ) : (
        <div className="rounded-[var(--kkb-r-md)] bg-white/10 px-3 py-2.5">
          <p className="flex items-baseline justify-between gap-2 font-quicksand text-xs text-[var(--kkb-foret-100)]">
            <span><span className="font-dosis text-[20px] font-extrabold tabular-nums text-[var(--kkb-creme)]">{filled}</span><span className="font-bold">/{total}</span> repas planifiés</span>
            <span className="tabular-nums">{pct}%</span>
          </p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
            <div className="h-full rounded-full bg-[var(--kkb-sauge)] transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
          </div>
        </div>
        )}
        {hasPlan && !loading && (
          <div className="flex items-center gap-1 rounded-[var(--kkb-r-md)] bg-white/10 px-2">
            <Users className="ml-1 hidden h-4 w-4 text-[var(--kkb-sauge)] sm:block" aria-hidden="true" />
            <button type="button" onClick={() => onServings(servings - 1)} disabled={servings <= 1 || updatingServings} aria-label="Un convive de moins"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--kkb-creme)] hover:bg-white/10 disabled:opacity-40">
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-[3.2rem] text-center leading-tight" aria-live="polite">
              <span className="block font-dosis text-[20px] font-extrabold tabular-nums text-[var(--kkb-creme)]">{updatingServings ? '…' : servings}</span>
              <span className="block font-quicksand text-[10px] text-[var(--kkb-foret-100)]">convives</span>
            </span>
            <button type="button" onClick={() => onServings(servings + 1)} disabled={servings >= 20 || updatingServings} aria-label="Un convive de plus"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--kkb-creme)] text-[var(--kkb-foret)] disabled:opacity-40">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Actions : desktop dans le bandeau ; mobile, le bouton flottant se pose ici */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={onGenerate} title={hasPlan ? "Les repas verrouillés sont gardés, les autres sont remplacés" : undefined}
          className="hidden h-11 items-center gap-2 rounded-full bg-[var(--kkb-orange)] px-5 font-quicksand text-sm font-bold text-white transition-colors hover:bg-[var(--kkb-orange-700)] lg:flex">
          <Zap className="h-4 w-4" /> {hasPlan ? 'Regénérer la semaine' : 'Générer ma semaine'}
        </button>
        {hasPlan && (
          <button type="button" onClick={onValidate}
            className="hidden h-11 items-center gap-2 rounded-full bg-white/10 px-5 font-quicksand text-sm font-bold text-[var(--kkb-creme)] transition-colors hover:bg-white/20 lg:flex">
            Valider le menu <ArrowRight className="h-4 w-4" />
          </button>
        )}
        <div className="lg:hidden">{generateSlot}</div>
        {sessionLabel && (
          <span className="ml-auto flex items-center gap-1 font-quicksand text-xs tabular-nums text-[var(--kkb-foret-100)]">
            <Timer className="h-3.5 w-3.5" /> {sessionLabel}
          </span>
        )}
      </div>
    </section>
  )
}

interface ServiceStat { mealType: MealType; filled: number; total: number }

// Desktop : avancement par type de repas.
export function ServiceProgressCard({ stats, className = '' }: { stats: ServiceStat[]; className?: string }) {
  return (
    <section className={`rounded-[var(--kkb-r-xl)] bg-white p-5 ${className}`} aria-labelledby="service-title">
      <h2 id="service-title" className="text-h3 text-[var(--kkb-profond)]">Par repas</h2>
      <ul className="mt-3 space-y-3">
        {stats.map(s => {
          const color = MEAL_COLOR[s.mealType]
          const pct = s.total > 0 ? Math.round((s.filled / s.total) * 100) : 0
          const complete = s.total > 0 && s.filled === s.total
          return (
            <li key={s.mealType} className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: color.bg, color: color.text }}>
                <MealTypeIcon type={s.mealType} className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline justify-between gap-2 font-quicksand text-sm">
                  <span className="font-bold text-[var(--kkb-profond)]">{MEAL_LABEL[s.mealType]}</span>
                  <span className={`text-xs font-bold tabular-nums ${complete ? 'text-[var(--kkb-foret-500)]' : 'text-[var(--kkb-texte-2)]'}`}>
                    {complete ? <Check className="mr-0.5 inline h-3.5 w-3.5" /> : null}{s.filled}/{s.total}
                  </span>
                </p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--kkb-lin)]">
                  <div className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${complete ? 'bg-[var(--kkb-sauge)]' : 'bg-[var(--kkb-jaune)]'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
