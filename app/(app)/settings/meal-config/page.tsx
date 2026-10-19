'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Check, CheckCircle2, Clock, LayoutGrid, ListChecks, Loader2, Repeat, Sparkles, Timer, Utensils, WifiOff } from 'lucide-react'
import { MealTypeIcon } from '@/components/ui/meal-type-icon'
import { Switch } from '@/components/ui/switch'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/lib/stores/toast-store'
import { MEAL_COLOR, MEAL_TYPE_ORDER, type MealType } from '@/lib/constants/meal-type'
import { MEAL_ICON } from '@/lib/constants/meal-type-icon'
import { MealConfigSkeleton } from '@/components/skeletons/page-skeletons'

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
    return !!o && o.is_active === c.is_active && o.mode === c.mode && formatTime(o.default_time) === formatTime(c.default_time)
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

  function patch(mealType: MealType, changes: Partial<Pick<MealConfig, 'is_active' | 'mode' | 'default_time'>>) {
    setDraft(prev => prev.map(c => (c.meal_type === mealType ? { ...c, ...changes } : c)))
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/users/me/meal-config', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(draft.map(c => ({ meal_type: c.meal_type, is_active: c.is_active, mode: c.mode, default_time: c.default_time ? formatTime(c.default_time) : null }))),
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

  if (loading) return <MealConfigSkeleton />

  if (failed) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="rounded-[var(--kkb-r-xl)] bg-white">
          <EmptyState
            icon={WifiOff}
            title="Impossible de charger ton rythme"
            description="Vérifie ta connexion puis réessaie."
            ctaLabel="Réessayer"
            ctaAction={() => void load()}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-32 pt-2 lg:max-w-none lg:px-0 lg:pt-0">
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-5">
        {/* ── Bandeau ─────────────────────────────────────────────────── */}
        <section className="rounded-[var(--kkb-r-xl)] bg-[var(--kkb-foret)] p-5 lg:col-span-8 lg:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="font-quicksand text-sm font-semibold text-[var(--kkb-foret-100)]">Réglages · organisation familiale</p>
            <Link href="/plan" aria-label="Aller au menu de la semaine" title="Menu de la semaine"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[var(--kkb-creme)] transition-colors hover:bg-white/20">
              <CalendarDays className="h-[18px] w-[18px]" />
            </Link>
          </div>
          <h1 className="mt-1 text-h1 text-[var(--kkb-creme)]">Rythme des repas</h1>
          <p className="mt-1 max-w-xl font-quicksand text-sm text-[var(--kkb-foret-100)]">
            Choisis les repas que tu prépares et leur fréquence : un plat différent chaque jour, ou le même toute la semaine pour souffler.
          </p>
          <dl className="mt-5 grid grid-cols-3 gap-2">
            {[
              { icon: Utensils,   label: 'Repas actifs',    value: <>{active.length}<span className="text-sm font-bold text-[var(--kkb-foret-100)]">/4</span></> },
              { icon: ListChecks, label: 'Plats à choisir', value: <>{dishes}<span className="ml-1 font-quicksand text-xs font-semibold text-[var(--kkb-foret-100)]">/ sem.</span></> },
              { icon: Timer,      label: 'Temps gagné',     value: savedMinutes > 0 ? formatSaving(savedMinutes).replace('-', '') : '—' },
            ].map(s => (
              <div key={s.label} className="rounded-[var(--kkb-r-md)] bg-white/10 px-3 py-2.5">
                <dt className="flex items-center gap-1.5 font-quicksand text-xs text-[var(--kkb-foret-100)]">
                  <s.icon className="hidden h-3.5 w-3.5 shrink-0 text-[var(--kkb-sauge)] sm:block" /> <span className="truncate">{s.label}</span>
                </dt>
                <dd className="mt-0.5 font-dosis text-[20px] font-extrabold leading-tight tabular-nums text-[var(--kkb-creme)]">{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── Aperçu de la semaine ────────────────────────────────────── */}
        <section className="order-last rounded-[var(--kkb-r-xl)] bg-white p-5 lg:order-none lg:sticky lg:top-24 lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-1" aria-labelledby="preview-title">
          <h2 id="preview-title" className="flex items-center gap-2.5 text-h3 text-[var(--kkb-profond)]">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--kkb-foret-50)] text-[var(--kkb-foret)]"><CalendarDays className="h-4 w-4" /></span>
            Aperçu de la semaine
          </h2>
          <div className="mt-4 grid grid-cols-[44px_repeat(7,minmax(0,1fr))] gap-1">
            <span />
            {DAYS.map(d => (
              <span key={d} className="text-center font-quicksand text-[11px] font-bold text-[var(--kkb-texte-2)]">{d}</span>
            ))}
            {gridRows.map(c => <GridRow key={c.meal_type} config={c} />)}
          </div>
          <div className="mt-4 space-y-1.5 border-t border-dashed border-[var(--kkb-filet)] pt-3">
            <p className="font-quicksand text-sm text-[var(--kkb-texte-2)]">
              <span className="font-dosis text-lg font-extrabold tabular-nums text-[var(--kkb-profond)]">{dishes}</span> {dishes > 1 ? 'plats' : 'plat'} à choisir chaque semaine
            </p>
            {savedMinutes > 0 && (
              <p className="flex items-center gap-1.5 font-quicksand text-xs text-[var(--kkb-foret-500)]">
                <Sparkles className="h-3.5 w-3.5" /> Environ {formatSaving(savedMinutes).replace('-', '')} de réflexion en moins par semaine
              </p>
            )}
          </div>
        </section>

        {/* ── Cartes des repas ────────────────────────────────────────── */}
        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-8 lg:gap-4">
          {cards.map(c => (
            <MealCard
              key={c.meal_type}
              config={c}
              onToggle={on => patch(c.meal_type, { is_active: on })}
              onTime={value => patch(c.meal_type, { default_time: value || null })}
              onMode={mode => patch(c.meal_type, { mode })}
            />
          ))}
        </div>
      </div>

      {/* Enregistrer : barre flottante (pas de barre basse sur les réglages) */}
      <div className="fixed bottom-5 left-4 right-4 z-40 mx-auto max-w-lg lg:left-[calc(var(--kkb-rail-offset)+var(--kkb-gutter))] lg:right-[var(--kkb-gutter)] lg:mx-0 lg:max-w-none">
        <div className="flex items-center gap-3 rounded-full bg-white p-2 pl-5 shadow-[0_12px_32px_rgba(31,58,46,0.16)]">
          <p className="min-w-0 flex-1 truncate font-quicksand text-sm" aria-live="polite">
            {dirty
              ? <span className="font-bold text-[var(--kkb-profond)]">Modifications à enregistrer</span>
              : <span className="flex items-center gap-1.5 text-[var(--kkb-foret-500)]"><CheckCircle2 className="h-4 w-4 shrink-0" /> Ton rythme est à jour</span>}
          </p>
          {dirty && !saving && (
            <button type="button" onClick={() => setDraft(saved)}
              className="hidden h-11 shrink-0 rounded-full px-4 font-quicksand text-sm font-semibold text-[var(--kkb-texte-2)] transition-colors hover:bg-[var(--kkb-creme)] hover:text-[var(--kkb-profond)] sm:block">
              Annuler
            </button>
          )}
          <button
            type="button"
            onClick={() => void save()}
            disabled={!dirty || saving}
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--kkb-orange)] px-5 font-quicksand text-[15px] font-bold text-white transition-colors hover:bg-[var(--kkb-orange-700)] disabled:opacity-50 lg:px-7"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}

function MealCard({ config, onToggle, onMode, onTime }: {
  config:   MealConfig
  onToggle: (on: boolean) => void
  onMode:   (mode: Mode) => void
  onTime:   (value: string) => void
}) {
  const t      = CARD_TEXT[config.meal_type]
  const Icon   = MEAL_ICON[config.meal_type]
  const color  = MEAL_COLOR[config.meal_type]
  const pillar = config.meal_type === 'dejeuner'
  const on     = config.is_active
  const time   = formatTime(config.default_time)

  const benefit = config.mode === 'daily'
    ? { label: 'Varié', cls: 'bg-[var(--kkb-sauge-50)] text-[var(--kkb-foret-500)]' }
    : { label: config.meal_type === 'petit_dejeuner' ? 'Économique' : 'Gain de temps', cls: 'bg-[var(--kkb-jaune-50)] text-[var(--kkb-jaune-text)]' }

  return (
    <article className={`flex flex-col rounded-[var(--kkb-r-xl)] bg-white p-5 transition-opacity`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors`}
          style={on ? { backgroundColor: color.bg, color: color.text } : { backgroundColor: 'var(--kkb-creme)', color: 'var(--kkb-texte-2)' }}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className={`text-h3 ${on ? 'text-[var(--kkb-profond)]' : 'text-[var(--kkb-texte-2)]'}`}>{t.title}</h2>
          <p className="font-quicksand text-xs text-[var(--kkb-texte-2)]">{t.moment}</p>
        </div>
        {pillar ? (
          <span className="shrink-0 rounded-full bg-[var(--kkb-foret-50)] px-2.5 py-1 font-quicksand text-[11px] font-bold text-[var(--kkb-foret)]" title="Le déjeuner est toujours planifié">
            Toujours actif
          </span>
        ) : (
          <Switch
            checked={on}
            onCheckedChange={onToggle}
            aria-label={`Préparer le ${t.title.toLowerCase()}`}
            className="mt-1 data-[state=checked]:bg-[var(--kkb-foret-500)] data-[state=unchecked]:bg-[var(--kkb-filet)]"
          />
        )}
      </div>

      {on ? (
        <div className="mt-4 space-y-3">
          <label className="flex items-center justify-between gap-3 rounded-[var(--kkb-r-lg)] bg-[var(--kkb-creme)] px-3 py-2">
            <span className="flex items-center gap-2 font-quicksand text-sm font-bold text-[var(--kkb-profond)]">
              <Clock className="h-4 w-4 text-[var(--kkb-foret-500)]" /> Heure du repas
            </span>
            <input
              type="time"
              step={900}
              value={time}
              onChange={e => onTime(e.target.value)}
              aria-label={`Heure du ${t.title.toLowerCase()}`}
              className="h-9 rounded-full bg-white px-3 font-dosis text-base font-extrabold tabular-nums text-[var(--kkb-foret)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--kkb-foret-300)]"
            />
          </label>

          {/* Fréquence : la pastille glisse sous l'option choisie */}
          <div role="radiogroup" aria-label={`Fréquence du ${t.title.toLowerCase()}`} className="relative grid grid-cols-2 rounded-full bg-[var(--kkb-creme)] p-1">
            <span aria-hidden="true"
              className="pointer-events-none absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-[var(--kkb-foret)] transition-transform duration-300 ease-[cubic-bezier(0.34,1.35,0.64,1)] motion-reduce:transition-none"
              style={{ transform: config.mode === 'template' ? 'translateX(100%)' : 'none' }} />
            {([['daily', LayoutGrid, 'Chaque jour'], ['template', Repeat, 'Toute la semaine']] as const).map(([m, MIcon, label]) => (
              <button key={m} type="button" role="radio" aria-checked={config.mode === m} onClick={() => onMode(m)}
                className={`relative z-10 flex h-9 items-center justify-center gap-1.5 rounded-full font-quicksand text-xs font-bold transition-colors duration-200 ${
                  config.mode === m ? 'text-[var(--kkb-creme)]' : 'text-[var(--kkb-texte-2)] hover:text-[var(--kkb-foret)]'
                }`}>
                <MIcon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          <div className="flex items-start justify-between gap-3">
            <p className="font-quicksand text-[13px] text-[var(--kkb-texte-2)]">{config.mode === 'daily' ? t.daily : t.template}</p>
            <span className={`shrink-0 rounded-full px-2 py-0.5 font-quicksand text-[11px] font-bold ${benefit.cls}`}>{benefit.label}</span>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-[var(--kkb-r-lg)] border-[1.5px] border-dashed border-[var(--kkb-filet)] px-3 py-3 font-quicksand text-[13px] text-[var(--kkb-texte-2)]">
          {t.inactive} Active-le pour l’ajouter à tes menus.
        </p>
      )}
    </article>
  )
}

function GridRow({ config }: { config: MealConfig }) {
  const color = MEAL_COLOR[config.meal_type]
  const label = (
    <span className="flex items-center gap-1 self-center font-quicksand text-[11px] font-bold text-[var(--kkb-texte-2)]">
      {GRID_LABEL[config.meal_type]}
    </span>
  )

  if (!config.is_active) {
    return (
      <>
        {label}
        <span className="col-span-7 flex h-7 items-center justify-center rounded-[var(--kkb-r-sm)] border border-dashed border-[var(--kkb-filet)] font-quicksand text-[10px] font-semibold text-[var(--kkb-texte-2)]">
          Pas prévu
        </span>
      </>
    )
  }

  if (config.mode === 'template') {
    return (
      <>
        {label}
        <span className="col-span-7 flex h-7 items-center justify-center gap-1 rounded-[var(--kkb-r-sm)] font-quicksand text-[11px] font-bold" style={{ backgroundColor: color.bg, color: color.text }}>
          <Repeat className="h-3 w-3" /> Le même toute la semaine
        </span>
      </>
    )
  }

  return (
    <>
      {label}
      {DAYS.map(d => (
        <span key={d} className="flex h-7 items-center justify-center rounded-[var(--kkb-r-sm)]" style={{ backgroundColor: color.bg, color: color.text }}>
          <MealTypeIcon type={config.meal_type} className="h-3.5 w-3.5" />
        </span>
      ))}
    </>
  )
}
