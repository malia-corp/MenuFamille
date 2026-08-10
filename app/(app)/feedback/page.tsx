'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  CheckCircle, Clock, Send, Star, PenLine, X,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { composedName } from '@/lib/utils/composed-name'

// ─── Types ────────────────────────────────────────────────────────────────────

type Rating   = 'excellent' | 'correct' | 'decevant'
type MealType = 'petit_dejeuner' | 'dejeuner' | 'gouter' | 'diner'
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
  recipes:           { name: string } | null
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

const MEAL_LABEL: Record<MealType, string> = {
  petit_dejeuner: 'Petit-déjeuner',
  dejeuner:       'Déjeuner',
  gouter:         'Goûter',
  diner:          'Dîner',
}

const MEAL_EMOJI: Record<MealType, string> = {
  petit_dejeuner: '🌅',
  dejeuner:       '🍽',
  gouter:         '🧁',
  diner:          '🌙',
}

const RATING_CONFIG: { value: Rating; emoji: string; label: string; bg: string; border: string; textColor: string }[] = [
  { value: 'excellent', emoji: '😊', label: 'Excellent',   bg: '#F0FAF5', border: '#2A7D4F', textColor: '#2A7D4F' },
  { value: 'correct',   emoji: '😐', label: 'Correct',     bg: '#FDF8EC', border: '#F5A623', textColor: '#C9820A' },
  { value: 'decevant',  emoji: '😕', label: 'Décevant',    bg: '#FCEBEB', border: '#C0392B', textColor: '#C0392B' },
]

const RATING_EMOJI: Record<Rating, string> = {
  excellent: '😊',
  correct:   '😐',
  decevant:  '😕',
}

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FeedbackPage() {
  const [plan,      setPlan]      = useState<MealPlan | null>(null)
  const [feedbacks, setFeedbacks] = useState<FeedbackEntry[]>([])
  const [loading,   setLoading]   = useState(true)

  // Bottom sheet state
  const [sheetItem,     setSheetItem]     = useState<MealPlanItem | null>(null)
  const [sheetRating,   setSheetRating]   = useState<Rating | null>(null)
  const [templates,     setTemplates]     = useState<Template[]>([])
  const [selectedTpl,   setSelectedTpl]   = useState<string | null>(null)
  const [customMsg,     setCustomMsg]     = useState('')
  const [writingCustom, setWritingCustom] = useState(false)
  const [submitting,       setSubmitting]       = useState(false)
  const [userDisplayName,  setUserDisplayName]  = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [planRes, meRes] = await Promise.all([
        fetch('/api/meal-plans'),
        fetch('/api/users/me'),
      ])

      if (meRes.ok) {
        const me = await meRes.json() as { display_name?: string }
        if (me.display_name) setUserDisplayName(me.display_name)
      }

      const planData: MealPlan | null = planRes.ok ? await planRes.json() : null
      if (!planData?.id) { setPlan(null); setLoading(false); return }
      setPlan(planData)

      const fbRes = await fetch(`/api/meal-plans/${planData.id}/feedback`)
      if (fbRes.ok) setFeedbacks(await fbRes.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function openSheet(item: MealPlanItem) {
    setSheetItem(item)
    setSheetRating(null)
    setSelectedTpl(null)
    setCustomMsg('')
    setWritingCustom(false)
  }

  async function selectRating(rating: Rating) {
    setSheetRating(rating)
    setSelectedTpl(null)
    setCustomMsg('')
    setWritingCustom(false)
    const res = await fetch(`/api/feedback-templates?rating=${rating}`)
    if (res.ok) setTemplates(await res.json())
  }

  async function submitFeedback() {
    if (!sheetItem || !sheetRating) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/meal-plan-items/${sheetItem.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating:          sheetRating,
          template_id:     writingCustom ? undefined : (selectedTpl ?? undefined),
          custom_message:  writingCustom ? customMsg.trim() : undefined,
        }),
      })
      if (res.ok) {
        await load()
        setSheetItem(null)
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Trier les items : lundi→dimanche puis petit-dej→diner
  const sortedItems = plan
    ? [...plan.meal_plan_items].sort((a, b) => {
        const dayDiff = DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week)
        if (dayDiff !== 0) return dayDiff
        return MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type)
      })
    : []

  const feedbackMap = new Map(feedbacks.map(f => [f.meal_plan_item_id, f]))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-5 w-5 border-2 border-[#E87D3E] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="px-4 py-10 text-center">
        <Star className="h-8 w-8 text-[#9A8F84] mx-auto mb-2" />
        <p className="font-dosis font-semibold text-base text-[#3D2C20]">Aucun menu cette semaine</p>
        <p className="text-xs font-quicksand text-[#9A8F84] mt-1">Générez un menu pour pouvoir noter vos repas.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDF6EE]">
      <div className="max-w-lg mx-auto px-4 py-5 space-y-3">
        {/* Titre */}
        <div className="mb-1">
          <p className="text-[11px] font-quicksand font-bold uppercase tracking-wider text-[#9A8F84]">
            Avis post-repas
          </p>
          <h1 className="font-dosis font-bold text-xl text-[#3D2C20]">
            Semaine du {new Date(plan.week_start + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
          </h1>
        </div>

        {sortedItems.map(item => {
          const status   = getMealStatus(item.applies_all_days ? 'lundi' : item.day_of_week, plan.week_start)
          const feedback = feedbackMap.get(item.id)
          const isToday  = status === 'today'

          return (
            <div
              key={item.id}
              className={[
                'border rounded-2xl p-3.5 transition-all',
                isToday
                  ? 'bg-[#FEF5F0] border-[#E87D3E]/30'
                  : 'bg-white border-[#EDE4D6]',
                status === 'future' ? 'opacity-60' : '',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <span className="text-xl flex-shrink-0">{MEAL_EMOJI[item.meal_type]}</span>
                  <div className="flex-1 min-w-0">
                    {isToday && (
                      <p className="text-[9px] font-quicksand font-bold uppercase tracking-wider text-[#E87D3E] mb-0.5">
                        Aujourd&apos;hui
                      </p>
                    )}
                    <p className="text-[10px] font-quicksand font-semibold text-[#9A8F84]">
                      {MEAL_LABEL[item.meal_type]}
                      {!item.applies_all_days && ` · ${item.day_of_week.charAt(0).toUpperCase() + item.day_of_week.slice(1)}`}
                    </p>
                    <p className="font-dosis font-semibold text-sm text-[#3D2C20] truncate">
                      {composedName(item.recipes?.name, item.meal_compositions)}
                    </p>
                  </div>
                </div>

                {/* État côté droit */}
                {status === 'future' ? (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Clock className="h-3.5 w-3.5 text-[#9A8F84]" />
                    <span className="text-[10px] font-quicksand text-[#9A8F84]">À venir</span>
                  </div>
                ) : feedback ? (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-lg">{RATING_EMOJI[feedback.rating]}</span>
                    <CheckCircle className="h-4 w-4 text-[#2A7D4F]" />
                  </div>
                ) : (
                  <button
                    onClick={() => openSheet(item)}
                    className="flex-shrink-0 flex items-center gap-1.5 bg-[#E87D3E] text-white text-[11px] font-quicksand font-semibold px-3 py-1.5 rounded-xl"
                  >
                    <Star className="h-3.5 w-3.5" />
                    Noter
                  </button>
                )}
              </div>

              {/* Feedback existant */}
              {feedback && (
                <div className="mt-2 pl-9">
                  {feedback.message && (
                    <p className="text-xs font-quicksand text-[#5A4A43] italic">
                      &ldquo;{feedback.message}&rdquo;
                    </p>
                  )}
                  <p className="text-[10px] font-quicksand text-[#9A8F84] mt-0.5">
                    {feedback.respondent_name} ·{' '}
                    {formatDistanceToNow(new Date(feedback.created_at), { addSuffix: true, locale: fr })}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Bottom sheet notation */}
      {sheetItem && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setSheetItem(null)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            {/* Header sheet */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-quicksand font-semibold uppercase tracking-wider text-[#9A8F84]">
                  {MEAL_LABEL[sheetItem.meal_type]}
                </p>
                <p className="font-dosis font-bold text-base text-[#3D2C20]">
                  Comment était {sheetItem.recipes ? composedName(sheetItem.recipes.name, sheetItem.meal_compositions) : 'ce repas'} ?
                </p>
              </div>
              <button onClick={() => setSheetItem(null)} className="p-1 -mr-1 text-[#9A8F84]">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Boutons réaction */}
            <div className="flex gap-2">
              {RATING_CONFIG.map(r => (
                <button
                  key={r.value}
                  onClick={() => selectRating(r.value)}
                  style={sheetRating === r.value ? { backgroundColor: r.bg, borderColor: r.border } : {}}
                  className={[
                    'flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-quicksand font-medium transition-all',
                    sheetRating === r.value ? 'border-2' : 'border-[#EDE4D6] text-[#9A8F84]',
                  ].join(' ')}
                >
                  <span className="text-xl">{r.emoji}</span>
                  <span style={sheetRating === r.value ? { color: r.border } : {}}>{r.label}</span>
                </button>
              ))}
            </div>

            {/* Messages prêts */}
            {sheetRating && (
              <div>
                <p className="text-[10px] font-quicksand font-semibold uppercase tracking-wider text-[#9A8F84] mb-2">
                  Choisissez un message
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {templates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setSelectedTpl(t.id); setWritingCustom(false); setCustomMsg('') }}
                      className={[
                        'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-quicksand font-medium border transition-all whitespace-nowrap',
                        selectedTpl === t.id && !writingCustom
                          ? 'bg-[#E87D3E] text-white border-[#E87D3E]'
                          : 'bg-white text-[#5A4A43] border-[#EDE4D6]',
                      ].join(' ')}
                    >
                      {t.message}
                    </button>
                  ))}

                  {/* Pill "Écrire mon propre message…" */}
                  <button
                    onClick={() => { setWritingCustom(true); setSelectedTpl(null) }}
                    className={[
                      'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-quicksand font-medium border border-dashed transition-all whitespace-nowrap',
                      writingCustom
                        ? 'bg-[#FDF0DC] text-[#C9820A] border-[#C9820A]'
                        : 'text-[#9A8F84] border-[#9A8F84]',
                    ].join(' ')}
                  >
                    <PenLine className="h-3 w-3" />
                    Écrire mon propre message…
                  </button>
                </div>

                {/* Champ texte libre */}
                {writingCustom && (
                  <textarea
                    value={customMsg}
                    onChange={e => setCustomMsg(e.target.value)}
                    placeholder="Votre message personnalisé…"
                    rows={2}
                    className="w-full mt-2 text-sm font-quicksand text-[#3D2C20] bg-[#FDF6EE] border border-[#EDE4D6] rounded-xl px-3 py-2 outline-none placeholder:text-[#C5B8AE] resize-none"
                  />
                )}

                {/* Aperçu du message sélectionné */}
                {selectedTpl && !writingCustom && (
                  <div className="mt-2 bg-[#FDF6EE] border border-[#EDE4D6] rounded-xl px-3 py-2">
                    <p className="text-xs font-quicksand text-[#5A4A43]">
                      {templates.find(t => t.id === selectedTpl)?.message}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Bouton valider */}
            <button
              onClick={submitFeedback}
              disabled={!sheetRating || submitting}
              className={[
                'w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-dosis font-bold text-sm transition-all',
                sheetRating
                  ? 'bg-[#E87D3E] text-white'
                  : 'bg-[#EDE4D6] text-[#9A8F84] cursor-not-allowed',
              ].join(' ')}
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Envoi…' : 'Valider mon avis'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
