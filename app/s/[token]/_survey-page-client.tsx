'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Clock, Loader2, Send, UnfoldHorizontal, UserCircle, XCircle } from 'lucide-react'
import { PublicHeader } from '@/components/survey/public-header'
import { MealVoteCard, type Reaction } from '@/components/survey/meal-vote-card'
import { ViewToggle, type SurveyViewMode } from '@/components/survey/view-toggle'
import { VoteIdentityPanel } from '@/components/survey/vote-identity-panel'
import { MEAL_EMOJI, MEAL_LABEL, MEAL_TYPE_ORDER, type MealType } from '@/lib/constants/meal-type'
import { DAY_OPTIONS, formatWeekRange, type DayOfWeek } from '@/lib/utils/week'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SurveyRecipe {
  id:            string
  name:          string
  photo_url:     string | null
  description:   string | null
  prep_time_min: number | null
  category:      { icon: string | null; name: string } | null
}

interface SurveyComposition {
  id:   string
  role: string
  name: string | null
}

interface SurveyItem {
  id:                string
  day_of_week:       DayOfWeek
  meal_type:         MealType
  applies_all_days:  boolean
  servings:          number
  recipe:            SurveyRecipe | null
  compositions:      SurveyComposition[]
}

interface SurveyData {
  plan: { id: string; week_start: string; planner_name: string | null; family_name: string | null }
  items: SurveyItem[]
  existing_response: {
    id:              string
    respondent_name: string
    answers:         { item_id: string; reaction: string; comment: string | null }[]
  } | null
}

type LoadState = 'loading' | 'not_found' | 'expired' | 'ready'

interface AnswerState {
  reaction: Reaction | null
  comment:  string
}

interface SectionGroup {
  key:         string
  title:       string
  emoji:       string
  items:       SurveyItem[]
}

const MOMENT_BY_MEAL_TYPE: Record<MealType, string> = {
  petit_dejeuner: 'Matin',
  dejeuner:       'Midi',
  gouter:         'Après-midi',
  diner:          'Soir',
}

const STORAGE_KEY_NAME    = 'kkb_respondent_name'
const STORAGE_KEY_RESP_ID = (token: string) => `kkb_survey_resp_${token}`
const STORAGE_KEY_DONE    = (token: string) => `kkb_survey_done_${token}`

// ─── Composant ────────────────────────────────────────────────────────────────

export function SurveyPageClient({ token }: { token: string }) {
  const router = useRouter()

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [data,       setData]     = useState<SurveyData | null>(null)
  const [name,       setName]     = useState('')
  const [responseId, setResponseId] = useState<string | null>(null)
  const [answers,    setAnswers]  = useState<Record<string, AnswerState>>({})
  const [submitted,  setSubmitted]  = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [savingCommentId, setSavingCommentId] = useState<string | null>(null)
  const [justSavedId,     setJustSavedId]     = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const justSavedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [viewMode,          setViewMode]          = useState<SurveyViewMode>('type')
  const [activeFilter,      setActiveFilter]      = useState<string | null>(null)
  // Cle generique (meal_type OU day_of_week selon viewMode) — un accordeon
  // repliable existe dans les deux modes, pas seulement "Par Type".
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  useEffect(() => {
    const storedName = localStorage.getItem(STORAGE_KEY_NAME)
    if (storedName) setName(storedName)

    const storedRespId = localStorage.getItem(STORAGE_KEY_RESP_ID(token))
    const done = localStorage.getItem(STORAGE_KEY_DONE(token)) === '1'
    setSubmitted(done)

    void (async () => {
      try {
        const params = storedRespId ? `?response_id=${storedRespId}` : ''
        const res = await fetch(`/api/surveys/${token}${params}`)
        if (res.status === 404) { setLoadState('not_found'); return }
        if (res.status === 410) { setLoadState('expired'); return }
        if (!res.ok) { setLoadState('not_found'); return }

        const json: SurveyData = await res.json()
        setData(json)

        if (json.existing_response) {
          setResponseId(json.existing_response.id)
          if (!storedName) setName(json.existing_response.respondent_name)
          const hydrated: Record<string, AnswerState> = {}
          for (const a of json.existing_response.answers) {
            hydrated[a.item_id] = { reaction: a.reaction as Reaction, comment: a.comment ?? '' }
          }
          setAnswers(hydrated)
        }

        setLoadState('ready')
      } catch {
        setLoadState('not_found')
      }
    })()
  }, [token])

  const ratedCount = Object.values(answers).filter(a => a.reaction !== null).length
  const totalCount = data?.items.length ?? 0

  async function saveAnswer(itemId: string, reaction: Reaction, comment: string) {
    if (!name.trim()) return
    localStorage.setItem(STORAGE_KEY_NAME, name.trim())

    const res = await fetch(`/api/surveys/${token}/answers/${itemId}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        respondent_name: name.trim(),
        reaction,
        comment:         comment.trim() || undefined,
        response_id:     responseId ?? undefined,
      }),
    })

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Erreur lors de la sauvegarde')
      return false
    }

    const resData = await res.json()
    if (!responseId && resData.response_id) {
      setResponseId(resData.response_id)
      localStorage.setItem(STORAGE_KEY_RESP_ID(token), resData.response_id)
    }

    if (justSavedTimer.current) clearTimeout(justSavedTimer.current)
    setJustSavedId(itemId)
    justSavedTimer.current = setTimeout(() => setJustSavedId(null), 1500)
    return true
  }

  function selectReaction(itemId: string, reaction: Reaction) {
    if (!name.trim()) return
    setAnswers(prev => ({ ...prev, [itemId]: { reaction, comment: prev[itemId]?.comment ?? '' } }))
    void saveAnswer(itemId, reaction, answers[itemId]?.comment ?? '')
  }

  function updateComment(itemId: string, comment: string) {
    setAnswers(prev => ({ ...prev, [itemId]: { reaction: prev[itemId]?.reaction ?? null, comment } }))
  }

  async function saveComment(itemId: string) {
    const a = answers[itemId]
    if (!a?.reaction) return
    setSavingCommentId(itemId)
    await saveAnswer(itemId, a.reaction, a.comment)
    setSavingCommentId(null)
  }

  async function handleSubmit() {
    if (!responseId || ratedCount === 0) return
    setSubmitting(true)
    setError(null)

    const res = await fetch(`/api/surveys/${token}/responses`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ response_id: responseId }),
    })

    setSubmitting(false)

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Erreur lors de l\'envoi')
      return
    }

    localStorage.setItem(STORAGE_KEY_DONE(token), '1')
    setSubmitted(true)
  }

  function handleModify() {
    localStorage.removeItem(STORAGE_KEY_DONE(token))
    setSubmitted(false)
  }

  function changeViewMode(mode: SurveyViewMode) {
    setViewMode(mode)
    setActiveFilter(null)
  }

  function handleNameBlur() {
    if (name.trim()) localStorage.setItem(STORAGE_KEY_NAME, name.trim())
  }

  // ── États de chargement / erreur ──────────────────────────────────────────

  if (loadState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--kkb-bg)]">
        <Loader2 className="h-6 w-6 text-[var(--kkb-coral)] animate-spin" />
      </div>
    )
  }

  if (loadState === 'expired') {
    return (
      <StatusScreen
        icon={<Clock className="h-12 w-12 text-[var(--kkb-text-tertiary)]" />}
        title="Ce lien a expiré"
        message="Le menu de cette semaine n'est plus disponible."
        onBack={() => router.push('/')}
      />
    )
  }

  if (loadState === 'not_found' || !data) {
    return (
      <StatusScreen
        icon={<XCircle className="h-12 w-12 text-[var(--kkb-text-tertiary)]" />}
        title="Lien introuvable"
        message="Ce lien de sondage n'existe pas ou n'est plus valide."
        onBack={() => router.push('/')}
      />
    )
  }

  // ── Contenu normal ─────────────────────────────────────────────────────────

  const templateItems = data.items.filter(i => i.applies_all_days)
  const dailyItems     = data.items.filter(i => !i.applies_all_days)

  const dailyByType = new Map<MealType, SurveyItem[]>()
  for (const item of dailyItems) {
    const list = dailyByType.get(item.meal_type) ?? []
    list.push(item)
    dailyByType.set(item.meal_type, list)
  }
  const activeMealTypes = Object.keys(MEAL_TYPE_ORDER)
    .map(k => k as MealType)
    .sort((a, b) => MEAL_TYPE_ORDER[a] - MEAL_TYPE_ORDER[b])
    .filter(mt => dailyByType.has(mt))

  const monday = new Date(data.plan.week_start + 'T00:00:00')
  function dateNumFor(day: DayOfWeek) {
    const idx = DAY_OPTIONS.findIndex(d => d.val === day)
    const date = new Date(monday)
    date.setDate(monday.getDate() + idx)
    return date.getDate()
  }
  function dayLabelFor(item: SurveyItem) {
    if (item.applies_all_days) return 'Toute la semaine'
    return `${DAY_OPTIONS.find(d => d.val === item.day_of_week)?.full ?? ''} ${dateNumFor(item.day_of_week)} · ${MOMENT_BY_MEAL_TYPE[item.meal_type]}`
  }

  // Vue "Par Jour" : jusqu'à 4 repas (un par type) alignés sur la même ligne,
  // comme la maquette desktop — classes Tailwind littérales (pas de template
  // string dynamique, non détecté par le scanner CSS).
  function dayGridClass(count: number): string {
    if (count >= 4) return 'md:grid-cols-2 lg:grid-cols-4'
    if (count === 3) return 'md:grid-cols-2 lg:grid-cols-3'
    if (count === 2) return 'md:grid-cols-2'
    return ''
  }

  // Chips : uniquement sur les repas journaliers (la section "Toute la semaine"
  // reste affichée une fois en tête, jamais filtrée par ce toggle).
  const typeChips = activeMealTypes.map(mt => ({
    value: mt, label: MEAL_LABEL[mt], emoji: MEAL_EMOJI[mt], count: dailyByType.get(mt)!.length,
  }))

  const activeDays = DAY_OPTIONS.filter(d => dailyItems.some(i => i.day_of_week === d.val))
  const dayChips = activeDays.map(d => ({
    value: d.val, label: `${d.full.slice(0, 3)} ${dateNumFor(d.val)}`, count: dailyItems.filter(i => i.day_of_week === d.val).length,
  }))

  // Regroupement du rendu selon le mode actif — un seul jeu de donnees
  // reorganise dynamiquement, pas de duplication de DOM comme la maquette.
  let sections: SectionGroup[]
  if (viewMode === 'type') {
    sections = activeMealTypes
      .filter(mt => activeFilter === null || activeFilter === mt)
      .map(mt => ({ key: mt, title: MEAL_LABEL[mt], emoji: MEAL_EMOJI[mt], items: dailyByType.get(mt)! }))
  } else {
    sections = activeDays
      .filter(d => activeFilter === null || activeFilter === d.val)
      .map(d => ({
        key: d.val,
        title: `${d.full} ${dateNumFor(d.val)}`,
        emoji: '\u{1F4C5}',
        items: dailyItems.filter(i => i.day_of_week === d.val),
      }))
  }

  const visibleSectionKeys = sections.map(s => s.key)
  const anyCollapsed = visibleSectionKeys.some(key => collapsedSections.has(key))

  function toggleSection(key: string) {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleAll() {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      for (const key of visibleSectionKeys) {
        if (anyCollapsed) next.delete(key)
        else next.add(key)
      }
      return next
    })
  }

  function onFilterChange(filter: string | null) {
    setActiveFilter(filter)
    // Cliquer une chip deplie la section correspondante si elle etait repliee.
    if (filter) {
      setCollapsedSections(prev => {
        const next = new Set(prev)
        next.delete(filter)
        return next
      })
    }
  }

  const plannerFirstName = data.plan.planner_name?.trim().split(/\s+/)[0] ?? 'votre famille'

  // byDay : le jour est déjà dans le titre de section, la carte affiche le type de repas.
  function renderCard(item: SurveyItem, byDay: boolean = false) {
    return (
      <MealVoteCard
        key={item.id}
        dayLabel={item.applies_all_days
          ? `${MEAL_EMOJI[item.meal_type]} ${MEAL_LABEL[item.meal_type]} · Toute la semaine`
          : byDay ? `${MEAL_EMOJI[item.meal_type]} ${MEAL_LABEL[item.meal_type]}` : dayLabelFor(item)}
        mealType={item.meal_type}
        recipe={item.recipe}
        compositions={item.compositions}
        reaction={answers[item.id]?.reaction ?? null}
        comment={answers[item.id]?.comment ?? ''}
        onSelectReaction={r => selectReaction(item.id, r)}
        onCommentChange={v => updateComment(item.id, v)}
        onSaveComment={() => saveComment(item.id)}
        savingComment={savingCommentId === item.id}
        justSaved={justSavedId === item.id}
        disabled={!name.trim()}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[var(--kkb-bg)] pb-32">
      <PublicHeader plannerName={data.plan.planner_name} familyName={data.plan.family_name} />

      <div className="max-w-7xl mx-auto px-4 lg:px-6 xl:px-10 py-5 lg:py-10">
        <main className="max-w-[720px] mx-auto xl:max-w-none">
          {/* Hero — carte unique ; le panneau identité rejoint le texte de bienvenue
              en ligne à partir de xl: (comme la maquette desktop), plutôt qu'une
              colonne latérale fixe sur toute la hauteur de la page. */}
          <section className="bg-white rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] p-6 lg:p-8 xl:p-10 mb-6">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6 xl:gap-10">
              <div className="space-y-2 xl:max-w-2xl">
                <span className="inline-block text-[11px] font-quicksand font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-[var(--kkb-teal-light)] text-[var(--kkb-teal)]">
                  {'\u{1F5D3}'} Semaine en cours · {formatWeekRange(data.plan.week_start)}
                </span>
                <h1 className="font-dosis font-extrabold text-2xl xl:text-3xl text-[var(--kkb-text-primary)]">
                  Le menu de {plannerFirstName}
                </h1>
                <p className="text-sm xl:text-base font-quicksand text-[var(--kkb-text-secondary)]">
                  Salut ! {'\u{1F44B}'} Dis-nous ce qui te fait envie pour les repas de cette semaine. Ton avis
                  compte beaucoup pour la cuisine de la maison !
                </p>
              </div>

              {/* Panneau identité de vote — rejoint le hero à partir de xl: */}
              <div className="hidden xl:block xl:w-[360px] xl:shrink-0">
                <VoteIdentityPanel
                  name={name}
                  onNameChange={setName}
                  onNameBlur={handleNameBlur}
                  ratedCount={ratedCount}
                  totalCount={totalCount}
                  submitted={submitted}
                />
              </div>
            </div>
          </section>

          {/* Champ prénom — masqué sur xl: (déplacé dans le panneau identité du hero) */}
          <section className="mb-6 xl:hidden">
            <p className="text-[11px] font-quicksand font-bold uppercase tracking-wide text-[var(--kkb-text-tertiary)] mb-1.5">
              Ton prénom ?
            </p>
            <div className="lg:max-w-[400px] flex items-center gap-2.5 bg-white border-[1.5px] border-[var(--kkb-border)] focus-within:border-[var(--kkb-coral)] rounded-[var(--kkb-radius-sm)] px-3.5 py-3 transition-colors">
              <UserCircle className="h-4 w-4 text-[var(--kkb-text-tertiary)] shrink-0" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onBlur={handleNameBlur}
                placeholder="Comment vous appelez-vous ?"
                aria-label="Ton prénom"
                className="flex-1 text-sm font-quicksand text-[var(--kkb-text-primary)] bg-transparent outline-none placeholder:text-[var(--kkb-text-tertiary)]"
              />
            </div>
          </section>

          {/* Section template — jamais filtrée par le toggle */}
          {templateItems.length > 0 && (
            <>
              <SectionSeparator label="Toute la semaine" />
              <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-4 md:items-start mb-2">
                {templateItems.map(item => renderCard(item))}
              </div>
            </>
          )}

          {data.items.length > 0 && (
            <>
              <SectionSeparator label="Au programme" />
              <ViewToggle
                viewMode={viewMode}
                onViewModeChange={changeViewMode}
                activeFilter={activeFilter}
                onFilterChange={onFilterChange}
                totalCount={dailyItems.length}
                typeChips={typeChips}
                dayChips={dayChips}
                daysAvailableCount={activeDays.length}
                categoriesCount={activeMealTypes.length}
              />

              {sections.length > 1 && (
                <div className="hidden lg:flex justify-end mb-2">
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="flex items-center gap-1.5 text-xs font-quicksand font-bold text-[var(--kkb-text-secondary)]"
                  >
                    <UnfoldHorizontal className="h-3.5 w-3.5" />
                    {anyCollapsed ? 'Tout déplier' : 'Tout replier'}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Sections regroupées (par type ou par jour selon viewMode) — un
              accordeon repliable (desktop uniquement) dans les deux modes. */}
          {sections.map(section => {
            const collapsed = collapsedSections.has(section.key)
            return (
              <section key={section.key} className="mb-5">
                <button
                  type="button"
                  onClick={() => toggleSection(section.key)}
                  className="w-full flex items-center justify-between gap-2 mb-2 lg:cursor-pointer"
                >
                  <h2 className="font-dosis font-bold text-xl text-[var(--kkb-text-primary)]">
                    {section.emoji} {section.title}
                  </h2>
                  <ChevronDown className={`hidden lg:block h-5 w-5 text-[var(--kkb-text-tertiary)] transition-transform ${collapsed ? '-rotate-90' : ''}`} />
                </button>
                <div className={`lg:overflow-hidden lg:transition-[max-height] lg:duration-300 ${collapsed ? 'lg:max-h-0' : 'lg:max-h-[6000px]'}`}>
                  <div className={`space-y-3 md:space-y-0 md:grid md:gap-4 md:items-start ${viewMode === 'day' ? dayGridClass(section.items.length) : 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                    {section.items.map(item => renderCard(item, viewMode === 'day'))}
                  </div>
                </div>
              </section>
            )
          })}

          {data.items.length === 0 && (
            <p className="text-sm font-quicksand text-[var(--kkb-text-tertiary)] text-center py-8">
              Ce menu ne contient aucun repas planifié pour le moment.
            </p>
          )}

          {error && (
            <p className="text-sm font-quicksand text-[var(--kkb-danger)] text-center mb-3">{error}</p>
          )}

          {/* Footer */}
          <footer className="pt-6 text-center space-y-0.5">
            <p className="text-[11px] font-quicksand text-[var(--kkb-text-tertiary)]">
              Lien partagé par {data.plan.family_name ? `la Famille ${data.plan.family_name}` : plannerFirstName}
              {' · '}Menu du {formatWeekRange(data.plan.week_start)}
            </p>
            <p className="text-[11px] font-quicksand text-[var(--kkb-text-tertiary)]">
              Cuisine du cœur, sérénité &amp; partage
            </p>
          </footer>
        </main>
      </div>

      {/* Barre sticky en bas */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[var(--kkb-border)] lg:rounded-t-[var(--kkb-radius-card)] lg:shadow-[0_-4px_20px_rgba(22,25,26,0.08)]">
        <div className="max-w-[720px] mx-auto px-5 py-3 lg:flex lg:items-center lg:justify-between lg:gap-4" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          {/* Progression — mobile uniquement, dupliquée dans le panneau identité sur xl: */}
          <div className="xl:hidden">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-quicksand text-[var(--kkb-text-tertiary)]">
                {ratedCount} / {totalCount} repas notés
              </p>
            </div>
            <div className="h-1 w-full rounded-full bg-[var(--kkb-border)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--kkb-coral)] transition-all duration-300"
                style={{ width: `${totalCount > 0 ? Math.round((ratedCount / totalCount) * 100) : 0}%` }}
              />
            </div>
          </div>

          <div className="lg:w-auto lg:shrink-0">
            {submitted ? (
              <button
                type="button"
                onClick={handleModify}
                className="w-full lg:w-auto mt-3 lg:mt-0 flex items-center justify-center gap-2 rounded-[var(--kkb-radius-pill)] bg-white border-[1.5px] border-[var(--kkb-coral)] text-[var(--kkb-coral)] font-quicksand font-bold text-[15px] px-6 py-3"
              >
                Modifier mes votes
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={ratedCount === 0 || !name.trim() || submitting}
                className={`w-full lg:w-auto mt-3 lg:mt-0 flex items-center justify-center gap-2 rounded-[var(--kkb-radius-pill)] font-quicksand font-bold text-[15px] px-6 py-3 transition-opacity ${
                  ratedCount === 0 || !name.trim() ? 'bg-[var(--kkb-coral)] text-white opacity-50 pointer-events-none' : 'bg-[var(--kkb-coral)] text-white'
                }`}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Envoyer mes votes
              </button>
            )}
          </div>

          {!submitted && (
            <p className="text-center text-[11px] font-quicksand text-[var(--kkb-text-tertiary)] mt-2 lg:mt-0">
              Modifiable à tout moment avant vendredi soir · Zéro gaspillage alimentaire
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function SectionSeparator({ label }: { label: string }) {
  return (
    <p className="text-center text-[11px] font-quicksand font-bold uppercase tracking-wide text-[var(--kkb-text-tertiary)] my-4">
      ── {label} ──
    </p>
  )
}

function StatusScreen({ icon, title, message, onBack }: {
  icon:    React.ReactNode
  title:   string
  message: string
  onBack:  () => void
}) {
  return (
    <div className="min-h-screen bg-[var(--kkb-bg)] flex items-center justify-center px-6">
      <div className="text-center space-y-3 max-w-xs">
        {icon}
        <h1 className="font-dosis font-bold text-[22px] text-[var(--kkb-text-primary)]">{title}</h1>
        <p className="text-sm font-quicksand text-[var(--kkb-text-secondary)]">{message}</p>
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-quicksand font-semibold text-[var(--kkb-coral)] underline"
        >
          Retour à l&apos;accueil
        </button>
      </div>
    </div>
  )
}
