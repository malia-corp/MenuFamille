'use client'

import { useEffect, useState, useCallback } from 'react'
import { Check, Heart, Loader2, Lock, Mic, Sparkles, Star } from 'lucide-react'
import { composedName } from '@/lib/utils/composed-name'
import { MEAL_LABEL, type MealType } from '@/lib/constants/meal-type'
import { MealTypeIcon } from '@/components/ui/meal-type-icon'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton-card'
import { toast } from '@/lib/stores/toast-store'

// ─── Types ────────────────────────────────────────────────────────────────────

type Rating   = 'excellent' | 'correct' | 'decevant'
type Status   = 'past' | 'today' | 'future'

interface Composition {
  role:       'side' | 'drink'
  sort_order: number
  recipes:    { name: string } | null
}

interface MealPlanItem {
  id:                string
  meal_type:         MealType
  day_of_week:       string
  applies_all_days:  boolean
  recipes:           { name: string; photo_url: string | null } | null
  meal_compositions: Composition[]
}

interface MealPlan {
  id:              string
  week_start:      string
  meal_plan_items: MealPlanItem[]
}

interface FeedbackEntry {
  id:                string
  meal_plan_item_id: string
  rating:            Rating
  message:           string | null
  respondent_name:   string
  created_at:        string
}

interface Template {
  id:       string
  category: Rating
  message:  string
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const DAY_ORDER = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

const MEAL_ORDER: MealType[] = ['petit_dejeuner', 'dejeuner', 'gouter', 'diner']

// Emojis de réaction en échappements unicode (cf. CLAUDE.md).
const RATING_CONFIG: { value: Rating; emoji: string; label: string; hint: string; tone: string; light: string }[] = [
  { value: 'excellent', emoji: '\u{1F60A}', label: 'J\'ai adoré', hint: 'Savoureux & riche', tone: 'var(--kkb-success)', light: 'var(--kkb-success-light)' },
  { value: 'correct',   emoji: '\u{1F610}', label: 'Ça passe',    hint: 'Bien dosé',         tone: 'var(--kkb-warning)', light: 'var(--kkb-warning-light)' },
  { value: 'decevant',  emoji: '\u{1F615}', label: 'Pas trop',    hint: 'À réajuster',       tone: 'var(--kkb-danger)',  light: 'var(--kkb-danger-light)' },
]

const RATING_EMOJI: Record<Rating, string> = {
  excellent: '\u{1F60A}',
  correct:   '\u{1F610}',
  decevant:  '\u{1F615}',
}

// Puces "impressions rapides" : couleur selon la réaction choisie.
const CHIP_TONE: Record<Rating, { idle: string; active: string }> = {
  excellent: {
    idle:   'border-[var(--kkb-success)]/40 bg-[var(--kkb-success-light)] text-[var(--kkb-success)]',
    active: 'border-[var(--kkb-success)] bg-[var(--kkb-success)] text-white',
  },
  correct: {
    idle:   'border-[var(--kkb-warning)]/50 bg-[var(--kkb-warning-light)] text-[var(--kkb-text-secondary)]',
    active: 'border-[var(--kkb-warning)] bg-[var(--kkb-warning)] text-white',
  },
  decevant: {
    idle:   'border-[var(--kkb-danger)]/40 bg-[var(--kkb-danger-light)] text-[var(--kkb-danger)]',
    active: 'border-[var(--kkb-danger)] bg-[var(--kkb-danger)] text-white',
  },
}

const SECTION_LABEL = 'font-quicksand text-[11px] font-bold uppercase tracking-wider'

function getMealStatus(dayOfWeek: string, weekStart: string): Status {
  const dayIndex = DAY_ORDER.indexOf(dayOfWeek)
  const mealDate = new Date(`${weekStart}T00:00:00`)
  mealDate.setDate(mealDate.getDate() + (dayIndex >= 0 ? dayIndex : 0))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  mealDate.setHours(0, 0, 0, 0)
  if (mealDate < today) return 'past'
  if (mealDate.getTime() === today.getTime()) return 'today'
  return 'future'
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function dayLabel(item: MealPlanItem): string {
  return item.applies_all_days ? 'Toute la semaine' : capitalize(item.day_of_week)
}

function sidesOf(item: MealPlanItem): string {
  return [...item.meal_compositions]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => c.recipes?.name)
    .filter(Boolean)
    .join(' · ')
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FeedbackPage() {
  const [plan,      setPlan]      = useState<MealPlan | null>(null)
  const [feedbacks, setFeedbacks] = useState<FeedbackEntry[]>([])
  const [loading,   setLoading]   = useState(true)

  // Repas en cours de notation (carte mise en avant)
  const [focusId,     setFocusId]     = useState<string | null>(null)
  const [rating,      setRating]      = useState<Rating | null>(null)
  const [templates,   setTemplates]   = useState<Template[]>([])
  const [selectedTpl, setSelectedTpl] = useState<string | null>(null)
  const [customMsg,   setCustomMsg]   = useState('')
  const [submitting,  setSubmitting]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const planRes = await fetch('/api/meal-plans')

      const planData: MealPlan | null = planRes.ok ? await planRes.json() : null
      if (!planData?.id) { setPlan(null); setLoading(false); return }
      setPlan(planData)

      const fbRes = await fetch(`/api/meal-plans/${planData.id}/feedback`)
      if (fbRes.ok) setFeedbacks(await fbRes.json())
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  function focus(item: MealPlanItem) {
    setFocusId(item.id)
    setRating(null)
    setSelectedTpl(null)
    setCustomMsg('')
    setTemplates([])
  }

  async function selectRating(value: Rating) {
    setRating(value)
    setSelectedTpl(null)
    const res = await fetch(`/api/feedback-templates?rating=${value}`)
    if (res.ok) setTemplates(await res.json())
  }

  async function submitFeedback(item: MealPlanItem) {
    if (!rating) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/meal-plan-items/${item.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          template_id:    selectedTpl ?? undefined,
          custom_message: customMsg.trim() || undefined,
        }),
      })
      if (res.ok) {
        toast.success('Avis enregistré, merci !')
        setFocusId(null)
        setRating(null)
        setSelectedTpl(null)
        setCustomMsg('')
        await load()
      } else {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error ?? 'Impossible d\'enregistrer ton avis')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-lg space-y-3 px-4 py-6" aria-busy="true">
        <SkeletonCard variant="list" />
        <SkeletonCard variant="recipe" />
        <SkeletonCard variant="list" />
      </div>
    )
  }

  if (!plan) {
    return (
      <EmptyState
        icon={Star}
        title="Aucun menu cette semaine"
        description="Les repas de la semaine apparaîtront ici pour que tu puisses donner ton avis."
      />
    )
  }

  // Trier les items : lundi→dimanche puis petit-dej→diner
  const sortedItems = [...plan.meal_plan_items].sort((a, b) => {
    const dayDiff = DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week)
    if (dayDiff !== 0) return dayDiff
    return MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type)
  })

  const feedbackMap = new Map(feedbacks.map(f => [f.meal_plan_item_id, f]))
  const statusOf    = (item: MealPlanItem) => getMealStatus(item.applies_all_days ? 'lundi' : item.day_of_week, plan.week_start)

  const rateable = sortedItems.filter(i => statusOf(i) !== 'future')
  const rated    = rateable.filter(i => feedbackMap.has(i.id))
  const toRate   = rateable.filter(i => !feedbackMap.has(i.id))
  const upcoming = sortedItems.filter(i => statusOf(i) === 'future')

  // Carte mise en avant : le repas choisi, sinon le premier du jour à noter,
  // sinon le plus ancien en attente.
  const featured =
    toRate.find(i => i.id === focusId) ??
    toRate.find(i => statusOf(i) === 'today') ??
    toRate[0] ??
    null
  const catchUp = toRate.filter(i => i.id !== featured?.id)

  const pct = rateable.length > 0 ? Math.round((rated.length / rateable.length) * 100) : 0

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 pb-8 pt-5 lg:max-w-2xl lg:pt-2">
      {/* En-tête */}
      <header className="space-y-2">
        <h1 className="font-dosis text-[22px] font-extrabold text-[var(--kkb-text-primary)]">Mes avis sur les repas</h1>
        <p className="font-quicksand text-sm text-[var(--kkb-text-secondary)]">
          Pour guider la cuisine du foyer avec amour sur les épices, le dosage du sel et les portions, en toute sérénité.
        </p>
      </header>

      {/* Progression */}
      {rateable.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-3 rounded-[var(--kkb-radius-pill)] border border-[var(--kkb-border)] bg-white px-4 py-2.5">
            <span className="font-dosis text-lg font-extrabold text-[var(--kkb-coral)]">{pct}%</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--kkb-bg)]">
              <div className="h-full rounded-full bg-[var(--kkb-coral)] transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="shrink-0 font-quicksand text-xs font-semibold text-[var(--kkb-text-secondary)]">
              {rated.length} repas sur {rateable.length} notés
            </span>
          </div>
          {rated.length > 0 && (
            <p className="rounded-[var(--kkb-radius-sm)] bg-[var(--kkb-success-light)] px-3 py-2 font-quicksand text-[13px] font-semibold text-[var(--kkb-success)]">
              Merci ! Tes retours aident à préparer le marché.
            </p>
          )}
        </section>
      )}

      {/* À noter */}
      {featured && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={`${SECTION_LABEL} text-[var(--kkb-coral)]`}>
              {statusOf(featured) === 'today' ? 'À noter aujourd\'hui' : 'À noter'}
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral-light)] px-2.5 py-1 font-quicksand text-xs font-bold text-[var(--kkb-coral)]">
              <MealTypeIcon type={featured.meal_type} className="h-3.5 w-3.5" />
              {dayLabel(featured)} · {MEAL_LABEL[featured.meal_type]}
            </span>
          </div>

          <article className="overflow-hidden rounded-[var(--kkb-radius-card)] border-2 border-[var(--kkb-coral)] bg-white shadow-[var(--kkb-shadow-card)]">
            {/* Photo + nom */}
            <div className="relative h-[200px] bg-gradient-to-br from-[var(--kkb-coral)] to-[var(--kkb-teal)]">
              {featured.recipes?.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={featured.recipes.photo_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-[var(--kkb-radius-pill)] bg-white/90 px-2.5 py-1 font-quicksand text-[11px] font-bold text-[var(--kkb-text-primary)]">
                <MealTypeIcon type={featured.meal_type} className="h-3.5 w-3.5 text-[var(--kkb-coral)]" />
                {statusOf(featured) === 'today' ? 'Servi aujourd\'hui' : `Servi ${featured.applies_all_days ? 'cette semaine' : featured.day_of_week}`}
              </span>
              <div className="absolute bottom-3 left-4 right-4">
                <p className="font-dosis text-lg font-bold text-white">{featured.recipes?.name ?? composedName(null, featured.meal_compositions)}</p>
                {sidesOf(featured) && <p className="font-quicksand text-[13px] text-white/80">{sidesOf(featured)}</p>}
              </div>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <p className="font-dosis text-base font-semibold text-[var(--kkb-text-primary)]">Comment était ce repas pour toi ?</p>
                <p className="font-quicksand text-[13px] text-[var(--kkb-text-secondary)]">Un ressenti sincère et doux pour parfaire la prochaine recette</p>
              </div>

              {/* Réactions */}
              <div className="grid grid-cols-3 gap-2">
                {RATING_CONFIG.map(r => {
                  const active = rating === r.value
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => { if (featured.id !== focusId) setFocusId(featured.id); void selectRating(r.value) }}
                      aria-pressed={active}
                      className="flex flex-col items-center gap-1 rounded-[var(--kkb-radius-sm)] border-2 px-1 py-2.5 transition-colors"
                      style={active
                        ? { backgroundColor: r.light, borderColor: r.tone }
                        : { backgroundColor: 'var(--kkb-surface)', borderColor: 'var(--kkb-border-light)' }}
                    >
                      <span className={`text-2xl leading-none ${active ? 'animate-kkb-react-pop' : ''}`}>{r.emoji}</span>
                      <span className="font-quicksand text-xs font-bold" style={{ color: active ? r.tone : 'var(--kkb-text-secondary)' }}>{r.label}</span>
                      {active && <span className="font-quicksand text-[11px]" style={{ color: r.tone }}>{r.hint}</span>}
                    </button>
                  )
                })}
              </div>

              {/* Impressions rapides */}
              {rating && templates.length > 0 && (
                <div className="space-y-2">
                  <p className={`${SECTION_LABEL} text-[var(--kkb-text-tertiary)]`}>Impressions rapides (optionnel)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {templates.map(t => {
                      const active = selectedTpl === t.id
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedTpl(active ? null : t.id)}
                          aria-pressed={active}
                          className={`rounded-[var(--kkb-radius-pill)] border px-3 py-1.5 font-quicksand text-xs font-semibold transition-colors ${
                            active ? CHIP_TONE[rating].active : CHIP_TONE[rating].idle
                          }`}
                        >
                          {t.message}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Petit mot */}
              <div className="relative">
                <input
                  type="text"
                  value={customMsg}
                  onChange={e => setCustomMsg(e.target.value)}
                  placeholder="Un petit mot doux ou un conseil pour la cuisine"
                  aria-label="Commentaire"
                  className="w-full rounded-[var(--kkb-radius-sm)] border border-[var(--kkb-border)] bg-[var(--kkb-bg)] py-2.5 pl-3 pr-10 font-quicksand text-sm text-[var(--kkb-text-primary)] outline-none placeholder:text-[var(--kkb-text-tertiary)] focus:border-[var(--kkb-coral)]"
                />
                <button
                  type="button"
                  onClick={() => toast.info('Bientôt disponible')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--kkb-text-tertiary)]"
                  aria-label="Dicter un message"
                >
                  <Mic className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => void submitFeedback(featured)}
                disabled={!rating || submitting}
                className="flex w-full items-center justify-center gap-2 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral)] py-3 font-quicksand text-[15px] font-bold text-white transition-all hover:bg-[var(--kkb-coral-hover)] active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {submitting ? 'Envoi…' : 'Enregistrer mon avis'}
              </button>
            </div>
          </article>

          {/* Repas passés encore à noter */}
          {catchUp.length > 0 && (
            <div className="space-y-2">
              <p className={`${SECTION_LABEL} text-[var(--kkb-text-tertiary)]`}>À rattraper</p>
              {catchUp.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => focus(item)}
                  className="flex w-full items-center gap-3 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-3 text-left transition-colors hover:border-[var(--kkb-coral)]"
                >
                  <MealTypeIcon type={item.meal_type} className="h-5 w-5 shrink-0 text-[var(--kkb-coral)]" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-quicksand text-[11px] font-semibold text-[var(--kkb-text-tertiary)]">{dayLabel(item)} · {MEAL_LABEL[item.meal_type]}</span>
                    <span className="block truncate font-dosis text-sm font-semibold text-[var(--kkb-text-primary)]">{composedName(item.recipes?.name, item.meal_compositions)}</span>
                  </span>
                  <span className="shrink-0 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral)] px-3 py-1 font-quicksand text-[11px] font-bold text-white">Noter</span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Déjà notés */}
      {rated.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <p className={`${SECTION_LABEL} text-[var(--kkb-text-tertiary)]`}>Déjà notés cette semaine</p>
            <span className="rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-teal-light)] px-2 py-0.5 font-quicksand text-[11px] font-bold text-[var(--kkb-teal)]">
              {rated.length} repas
            </span>
          </div>
          {rated.map(item => {
            const fb = feedbackMap.get(item.id)!
            return (
              <div key={item.id} className="relative flex gap-3 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--kkb-radius-sm)] bg-[var(--kkb-coral-light)]">
                  {item.recipes?.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.recipes.photo_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <MealTypeIcon type={item.meal_type} className="h-6 w-6 text-[var(--kkb-coral)]" />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1 pr-16">
                  <span className="inline-flex items-center gap-1 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-bg)] px-2 py-0.5 font-quicksand text-[10px] font-bold text-[var(--kkb-text-secondary)]">
                    {dayLabel(item)} · {MEAL_LABEL[item.meal_type]}
                  </span>
                  <p className="mt-1 flex items-center gap-1.5 font-dosis text-sm font-semibold text-[var(--kkb-text-primary)]">
                    <span className="text-base leading-none">{RATING_EMOJI[fb.rating]}</span>
                    <span className="truncate">{composedName(item.recipes?.name, item.meal_compositions)}</span>
                  </p>
                  {fb.message && (
                    <p className="mt-1 font-quicksand text-[13px] italic text-[var(--kkb-text-secondary)]">&ldquo;{fb.message}&rdquo;</p>
                  )}
                </div>
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-success-light)] px-2 py-0.5 font-quicksand text-[10px] font-bold text-[var(--kkb-success)]">
                  Transmis <Check className="h-3 w-3" />
                </span>
              </div>
            )
          })}
        </section>
      )}

      {/* Repas à venir */}
      {upcoming.length > 0 && (
        <section className="space-y-2">
          <div>
            <p className={`${SECTION_LABEL} text-[var(--kkb-text-tertiary)]`}>Repas à venir</p>
            <p className="font-quicksand text-xs text-[var(--kkb-text-tertiary)]">À évaluer plus tard</p>
          </div>
          <div className="pointer-events-none space-y-2 opacity-50" aria-disabled="true">
            {upcoming.map(item => (
              <div key={item.id} className="flex items-center gap-3 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-3">
                <Lock className="h-4 w-4 shrink-0 text-[var(--kkb-text-tertiary)]" />
                <span className="min-w-0 flex-1 truncate font-quicksand text-sm font-semibold text-[var(--kkb-text-primary)]">
                  {composedName(item.recipes?.name, item.meal_compositions)}
                </span>
                <span className="shrink-0 rounded-[var(--kkb-radius-pill)] border border-[var(--kkb-border)] bg-[var(--kkb-bg)] px-2 py-0.5 font-quicksand text-[11px] font-semibold text-[var(--kkb-text-tertiary)]">
                  Dès {item.day_of_week}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pied de page */}
      <footer className="flex items-start gap-3 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-4">
        <Heart className="mt-0.5 h-5 w-5 shrink-0 text-[var(--kkb-coral)]" />
        <p className="font-quicksand text-[13px] text-[var(--kkb-text-secondary)]">
          Chaque retour aide la cuisine du foyer à doser les condiments, éviter le gaspillage et dresser la liste du grand marché du samedi avec l&apos;esprit léger.
        </p>
      </footer>
    </div>
  )
}
