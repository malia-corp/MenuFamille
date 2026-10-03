'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Check, Info, LayoutGrid, Loader2, Repeat, SlidersHorizontal, WifiOff } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton-card'
import { toast } from '@/lib/stores/toast-store'
import { MEAL_COLOR, MEAL_TYPE_ORDER, type MealType } from '@/lib/constants/meal-type'
import { MEAL_ICON } from '@/lib/constants/meal-type-icon'

type Mode = 'daily' | 'template'

interface MealConfig {
  id:            string
  meal_type:     MealType
  is_active:     boolean
  mode:          Mode
  display_order: number
  default_time:  string | null
}

// Ordre de l'écran : le pilier (déjeuner) d'abord, puis le reste dans
// l'ordre chronologique.
const CARD_ORDER: MealType[] = ['dejeuner', 'diner', 'petit_dejeuner', 'gouter']

const CARD_TEXT: Record<MealType, {
  title:    string
  moment:   string
  daily:    string
  template: string
  inactive: string
}> = {
  dejeuner: {
    title:    'Déjeuner',
    moment:   'Pause midi',
    daily:    '7 recettes uniques à savourer chaque midi',
    template: 'Un même plat du midi pour toute la semaine',
    inactive: '',
  },
  diner: {
    title:    'Dîner',
    moment:   'Repas du soir',
    daily:    '7 recettes différentes pour chaque soir',
    template: 'Marmite familiale prête pour la semaine (ex : soupe, sauce graine)',
    inactive: 'Optionnel · Pour garder la main sur les repas du soir.',
  },
  petit_dejeuner: {
    title:    'Petit-déjeuner',
    moment:   'Début de journée',
    daily:    'Un petit-déjeuner différent chaque matin',
    template: 'Formule récurrente (koko, akassa ou thé & pain)',
    inactive: 'Optionnel · Pour bien démarrer la journée sans y penser.',
  },
  gouter: {
    title:    'Goûter',
    moment:   'Pause de 16h',
    daily:    'Un en-cas différent chaque après-midi',
    template: 'Les mêmes fruits et en-cas toute la semaine',
    inactive: 'Optionnel · Pour anticiper les fruits et en-cas des enfants.',
  },
}

const GRID_LABEL: Record<MealType, string> = {
  petit_dejeuner: 'Matin',
  dejeuner:       'Midi',
  gouter:         '16h',
  diner:          'Soir',
}

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

// Temps de réflexion estimé par plat à choisir (base des "heures gagnées").
const MINUTES_PER_DECISION = 15

function formatTime(t: string | null): string {
  return t ? t.slice(0, 5) : ''
}

function formatSaving(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `-${m} min`
  return m === 0 ? `-${h}h` : `-${h}h${String(m).padStart(2, '0')}`
}

function sameRhythm(a: MealConfig[], b: MealConfig[]): boolean {
  return a.every(c => {
    const o = b.find(x => x.meal_type === c.meal_type)
    return !!o && o.is_active === c.is_active && o.mode === c.mode
  })
}

export default function MealConfigPage() {
  const [saved,   setSaved]   = useState<MealConfig[]>([])
  const [draft,   setDraft]   = useState<MealConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [failed,  setFailed]  = useState(false)
  const [saving,  setSaving]  = useState(false)

  async function load() {
    setLoading(true)
    setFailed(false)
    try {
      const res  = await fetch('/api/users/me/meal-config')
      const data = await res.json()
      if (!res.ok || !Array.isArray(data)) throw new Error()
      setSaved(data)
      setDraft(data)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  function patch(mealType: MealType, changes: Partial<Pick<MealConfig, 'is_active' | 'mode'>>) {
    setDraft(prev => prev.map(c => (c.meal_type === mealType ? { ...c, ...changes } : c)))
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/users/me/meal-config', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(draft.map(c => ({ meal_type: c.meal_type, is_active: c.is_active, mode: c.mode }))),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !Array.isArray(data)) {
        toast.error(data?.error ?? 'Erreur de connexion')
        return
      }
      setSaved(data)
      setDraft(data)
      toast.success('Rythme des repas enregistré')
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setSaving(false)
    }
  }

  const cards = useMemo(
    () => CARD_ORDER.map(t => draft.find(c => c.meal_type === t)).filter((c): c is MealConfig => !!c),
    [draft],
  )
  const gridRows = useMemo(
    () => [...draft].sort((a, b) => MEAL_TYPE_ORDER[a.meal_type] - MEAL_TYPE_ORDER[b.meal_type]),
    [draft],
  )

  const active      = draft.filter(c => c.is_active)
  const dishes      = active.reduce((n, c) => n + (c.mode === 'daily' ? 7 : 1), 0)
  const savedMinutes = (active.length * 7 - dishes) * MINUTES_PER_DECISION
  const dirty       = !sameRhythm(draft, saved)

  if (loading) {
    return (
      <div className="mx-auto max-w-lg space-y-3 px-4 py-6" aria-busy="true">
        <SkeletonCard variant="list" />
        <SkeletonCard variant="meal" />
        <SkeletonCard variant="meal" />
        <SkeletonCard variant="meal" />
      </div>
    )
  }

  if (failed) {
    return (
      <EmptyState
        icon={WifiOff}
        title="Impossible de charger ton rythme"
        description="Vérifie ta connexion puis réessaie."
        ctaLabel="Réessayer"
        ctaAction={() => void load()}
      />
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-32 pt-5 lg:max-w-2xl lg:pt-2">
      {/* Titre (le MobileHeader porte déjà le titre sur mobile) */}
      <div className="mb-4 hidden items-center justify-between lg:flex">
        <h1 className="font-dosis text-xl font-bold text-[var(--kkb-text-primary)]">Rythme des repas</h1>
        <SlidersHorizontal className="h-5 w-5 text-[var(--kkb-text-tertiary)]" />
      </div>

      <div className="space-y-1">
        <p className="font-quicksand text-[10px] font-bold uppercase tracking-wider text-[var(--kkb-coral)]">Organisation familiale</p>
        <p className="font-quicksand text-sm text-[var(--kkb-text-secondary)]">
          Activez vos repas et choisissez leur fréquence pour un quotidien allégé et serein.
        </p>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-[var(--kkb-radius-sm)] bg-[var(--kkb-warning-light)] p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--kkb-warning)]" />
        <p className="font-quicksand text-[13px] text-[var(--kkb-text-secondary)]">
          Modèle semaine : 1 même plat récurrent pour gagner du temps
        </p>
      </div>

      {/* Cartes types de repas */}
      <div className="mt-4 space-y-3">
        {cards.map(c => (
          <MealCard
            key={c.meal_type}
            config={c}
            onToggle={on => patch(c.meal_type, { is_active: on })}
            onMode={mode => patch(c.meal_type, { mode })}
          />
        ))}
      </div>

      {/* Aperçu de la semaine */}
      <section className="mt-4 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-teal)] bg-[var(--kkb-teal-light)] p-4">
        <p className="flex items-center gap-2 font-quicksand text-[13px] font-bold text-[var(--kkb-teal)]">
          <CalendarDays className="h-4 w-4" /> Aperçu de la semaine
        </p>

        <div className="mt-3 grid grid-cols-[40px_repeat(7,minmax(0,1fr))] gap-1">
          <span />
          {DAYS.map(d => (
            <span key={d} className="text-center font-quicksand text-[10px] font-bold uppercase text-[var(--kkb-text-tertiary)]">{d}</span>
          ))}
          {gridRows.map(c => (
            <GridRow key={c.meal_type} config={c} />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="font-quicksand text-sm font-bold text-[var(--kkb-text-primary)]">
            {dishes} {dishes > 1 ? 'plats' : 'plat'} à décider
          </p>
          {savedMinutes > 0 && (
            <span className="rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-success-light)] px-2.5 py-1 font-quicksand text-xs font-bold text-[var(--kkb-success)]">
              {formatSaving(savedMinutes)} de réflexion / semaine
            </span>
          )}
        </div>
      </section>

      {/* Enregistrer : fixe en bas (pas de bottom nav sur les pages réglages) */}
      <div className="fixed bottom-5 left-4 right-4 z-40 mx-auto max-w-lg lg:left-60 lg:max-w-2xl lg:px-4">
        <button
          type="button"
          onClick={() => void save()}
          disabled={!dirty || saving}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral)] py-3.5 font-quicksand text-[15px] font-bold text-white shadow-[var(--kkb-shadow-fab)] transition-all hover:bg-[var(--kkb-coral-hover)] active:scale-[0.98] disabled:opacity-60 disabled:shadow-none"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {dirty || saving ? 'Enregistrer mon rythme' : 'Rythme enregistré'}
        </button>
      </div>
    </div>
  )
}

function MealCard({ config, onToggle, onMode }: {
  config:   MealConfig
  onToggle: (on: boolean) => void
  onMode:   (mode: Mode) => void
}) {
  const t      = CARD_TEXT[config.meal_type]
  const Icon   = MEAL_ICON[config.meal_type]
  const pillar = config.meal_type === 'dejeuner'
  const on     = config.is_active
  const time   = formatTime(config.default_time)

  const benefit = config.mode === 'daily'
    ? { label: 'Équilibré', cls: 'bg-[var(--kkb-success-light)] text-[var(--kkb-success)]' }
    : { label: config.meal_type === 'petit_dejeuner' ? 'Économique' : 'Gain de temps', cls: 'bg-[var(--kkb-warning-light)] text-[var(--kkb-text-secondary)]' }

  return (
    <div className="rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 shrink-0" style={{ color: on ? MEAL_COLOR[config.meal_type].text : 'var(--kkb-text-tertiary)' }} />
        <h2 className="font-dosis text-base font-bold text-[var(--kkb-text-primary)]">{t.title}</h2>
        {pillar ? (
          <span className="rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-teal-light)] px-2 py-0.5 font-quicksand text-[10px] font-bold uppercase text-[var(--kkb-teal)]">Pilier</span>
        ) : on ? (
          <span className="rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-success-light)] px-2 py-0.5 font-quicksand text-[10px] font-bold uppercase text-[var(--kkb-success)]">Actif</span>
        ) : (
          <span className="rounded-[var(--kkb-radius-pill)] border border-[var(--kkb-border)] bg-[var(--kkb-bg)] px-2 py-0.5 font-quicksand text-[10px] font-bold uppercase text-[var(--kkb-text-tertiary)]">Inactif</span>
        )}
        <div className="ml-auto">
          {pillar ? (
            <span className="rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-success-light)] px-2.5 py-1 font-quicksand text-[11px] font-bold text-[var(--kkb-success)]">Obligatoire</span>
          ) : (
            <Switch
              checked={on}
              onCheckedChange={onToggle}
              aria-label={`Activer le ${t.title.toLowerCase()}`}
              className="data-[state=checked]:bg-[var(--kkb-coral)] data-[state=unchecked]:bg-[var(--kkb-border)]"
            />
          )}
        </div>
      </div>

      <p className="mt-1 font-quicksand text-xs text-[var(--kkb-text-tertiary)]">
        {time ? `${time} · ` : ''}{t.moment}
      </p>

      <div className={`mt-3 flex gap-2 ${on ? '' : 'pointer-events-none opacity-50'}`}>
        <ModePill label="Quotidien"    icon={LayoutGrid} active={config.mode === 'daily'}    tone="coral" disabled={!on} onClick={() => onMode('daily')} />
        <ModePill label="Hebdomadaire" icon={Repeat}     active={config.mode === 'template'} tone="teal"  disabled={!on} onClick={() => onMode('template')} />
      </div>

      {on ? (
        <div className="mt-2.5 flex items-start justify-between gap-3">
          <p className="font-quicksand text-xs text-[var(--kkb-text-tertiary)]">
            {config.mode === 'daily' ? t.daily : t.template}
          </p>
          <span className={`shrink-0 rounded-[var(--kkb-radius-pill)] px-2 py-0.5 font-quicksand text-[10px] font-bold ${benefit.cls}`}>
            {benefit.label}
          </span>
        </div>
      ) : (
        <p className="mt-2.5 font-quicksand text-xs italic text-[var(--kkb-text-tertiary)]">{t.inactive}</p>
      )}
    </div>
  )
}

function ModePill({ label, icon: Icon, active, tone, disabled, onClick }: {
  label:    string
  icon:     typeof LayoutGrid
  active:   boolean
  tone:     'coral' | 'teal'
  disabled: boolean
  onClick:  () => void
}) {
  const activeCls = tone === 'coral'
    ? 'border-[var(--kkb-coral)] bg-[var(--kkb-coral)] text-white'
    : 'border-[var(--kkb-teal)] bg-[var(--kkb-teal)] text-white'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-[var(--kkb-radius-pill)] border py-2 font-quicksand text-xs font-bold transition-colors ${
        active ? activeCls : 'border-[var(--kkb-border)] bg-white text-[var(--kkb-text-secondary)] hover:bg-[var(--kkb-bg)]'
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  )
}

function GridRow({ config }: { config: MealConfig }) {
  const label = (
    <span className="self-center font-quicksand text-[10px] font-bold uppercase text-[var(--kkb-text-tertiary)]">
      {GRID_LABEL[config.meal_type]}
    </span>
  )

  if (!config.is_active) {
    return (
      <>
        {label}
        {DAYS.map(d => <span key={d} className="h-6 rounded bg-[var(--kkb-bg)]" />)}
      </>
    )
  }

  if (config.mode === 'template') {
    return (
      <>
        {label}
        <span className="col-span-7 flex h-6 items-center justify-center rounded border border-[var(--kkb-teal)]/30 bg-white/70 font-quicksand text-[10px] font-bold text-[var(--kkb-teal)]">
          1 formule unique
        </span>
      </>
    )
  }

  return (
    <>
      {label}
      {DAYS.map((d, i) => (
        <span key={d} className="flex h-6 items-center justify-center rounded bg-[var(--kkb-coral)] font-quicksand text-[9px] font-bold text-white">
          J{i + 1}
        </span>
      ))}
    </>
  )
}
