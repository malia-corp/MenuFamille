'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, CalendarPlus, ChevronRight, Heart, MailOpen, MessageCircleWarning,
  PartyPopper, Pencil, Printer, Share2, Users, WifiOff,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { MEAL_LABEL, MEAL_TYPE_ORDER, type MealType } from '@/lib/constants/meal-type'
import { DAY_OPTIONS, formatWeekRange } from '@/lib/utils/week'
import { agreementPct, isRejected, totalReactions } from '@/lib/utils/survey-score'
import { ConsensusGauge } from '@/components/votes/consensus-gauge'
import { FridgePrintSheet } from '@/components/votes/fridge-print-sheet'
import { ShareActions, surveyLinkPayload } from '@/components/ui/share-actions'
import { toast } from '@/lib/stores/toast-store'
import { NameAvatar } from '@/components/votes/name-avatar'
import { ResultCard } from '@/components/votes/result-card'
import { ResultsFilters, type ResultsSort, type ResultsViewMode } from '@/components/votes/results-filters'
import type { ResultItem, SurveyResultsData } from '@/components/votes/types'
import { TEMPLATE_KEY, agreementTone, chronoCompare, countsOf, dayLabelOf, harmonyOf } from '@/components/votes/result-helpers'
import { EmptyState, PageLoader } from '@/components/votes/page-states'

type LoadState = 'loading' | 'ready' | 'no_plan' | 'error'

export default function VotesResultsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <VotesResultsContent />
    </Suspense>
  )
}

function VotesResultsContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const planParam    = searchParams.get('plan')

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [data,      setData]      = useState<SurveyResultsData | null>(null)
  const [viewMode,  setViewMode]  = useState<ResultsViewMode>('day')
  const [activeChip, setActiveChip] = useState<string | null>(null)
  const [sort,      setSort]      = useState<ResultsSort>('chrono')

  useEffect(() => {
    void (async () => {
      try {
        let id = planParam
        if (!id) {
          // Sans ?plan= : dernier plan partagé (celui qui a pu recevoir des votes),
          // sinon dernier plan tout court pour guider vers la planification.
          const getLatest = (q: string) => fetch(`/api/meal-plans?latest=true${q}`).then(r => (r.ok ? r.json() : null))
          const latest = (await getLatest('&shared=true')) ?? (await getLatest(''))
          id = latest?.id ?? null
        }
        if (!id) { setLoadState('no_plan'); return }
        const res = await fetch(`/api/meal-plans/${id}/survey-results`)
        if (!res.ok) { setLoadState(res.status === 404 ? 'no_plan' : 'error'); return }
        setData(await res.json())
        setLoadState('ready')
      } catch {
        setLoadState('error')
        toast.error('Erreur de connexion')
      }
    })()
  }, [planParam])

  const derived = useMemo(() => {
    if (!data) return null
    const items     = [...data.items].sort(chronoCompare)
    const voted     = items.filter(i => totalReactions(countsOf(i)) > 0)
    const rejected  = voted.filter(i => isRejected(countsOf(i)))
    const favorites = [...voted]
      .sort((a, b) => (b.aime / totalReactions(countsOf(b))) - (a.aime / totalReactions(countsOf(a))) || totalReactions(countsOf(b)) - totalReactions(countsOf(a)))
      .slice(0, 3)
    // À revoir : repas qui ont reçu au moins un « Pas trop », le moins apprécié d'abord.
    const toReview = voted
      .filter(i => i.naime_pas > 0)
      .sort((a, b) => (agreementPct(countsOf(a)) ?? 0) - (agreementPct(countsOf(b)) ?? 0) || b.naime_pas - a.naime_pas)
      .slice(0, 3)
    return { items, voted, rejected, favorites, toReview }
  }, [data])

  function changeViewMode(m: ResultsViewMode) {
    setViewMode(m)
    setActiveChip(null)
  }

  function editItem(item: ResultItem) {
    if (!data) return
    router.push(`/plan?week=${data.week_start}&day=${item.day_of_week}&meal=${item.meal_type}`)
  }

  if (loadState === 'loading') return <PageLoader />

  if (loadState === 'no_plan' || loadState === 'error' || !data || !derived) {
    return (
      <EmptyState
        icon={loadState === 'error' ? WifiOff : CalendarPlus}
        title={loadState === 'error' ? 'Impossible de charger les résultats' : 'Aucun menu à afficher'}
        message={loadState === 'error' ? 'Réessaie dans un instant.' : 'Planifie un menu puis partage-le à ta famille pour recueillir leurs votes.'}
        action={{ label: 'Aller au menu', onClick: () => router.push('/plan') }}
      />
    )
  }

  const weekRange     = formatWeekRange(data.week_start)
  const memberCount   = Math.max(data.member_count, 1)
  const allVoted      = data.total_respondents >= memberCount
  const harmony       = harmonyOf(data.global_score)

  // 0 répondant : selon l'avancement du menu, on guide vers l'étape suivante.
  if (data.total_respondents === 0) {
    const token = data.share_token

    if (data.items.length === 0) {
      return (
        <EmptyState
          icon={CalendarPlus}
          title="Menu à planifier"
          message={`Aucun repas n'est planifié pour la semaine du ${weekRange}. Planifie d'abord ton menu, puis partage-le à ta famille pour recueillir leurs votes.`}
          action={{ label: 'Planifier le menu', onClick: () => router.push(`/plan?week=${data.week_start}`) }}
        />
      )
    }

    if (!token) {
      return (
        <EmptyState
          icon={Share2}
          title="Menu pas encore partagé"
          message={`Ton menu de la semaine du ${weekRange} est planifié mais pas encore partagé. Partage-le à ta famille pour recueillir leurs votes.`}
          action={{ label: 'Partager le menu', onClick: () => router.push(`/plan/validate?week=${data.week_start}`) }}
        />
      )
    }

    return (
      <EmptyState
        icon={MailOpen}
        title="En attente des avis de la famille"
        message="Partage le lien du menu pour recueillir les votes."
      >
        <ShareActions getPayload={() => surveyLinkPayload(token)} shareLabel="Renvoyer le lien" />
      </EmptyState>
    )
  }

  // ── Filtres ────────────────────────────────────────────────────────────────

  const { items, voted, rejected, favorites, toReview } = derived
  const hasTemplate = items.some(i => i.applies_all_days)
  const groupKeyOf  = (i: ResultItem): string =>
    viewMode === 'day' ? (i.applies_all_days ? TEMPLATE_KEY : i.day_of_week) : i.meal_type

  const chips = viewMode === 'day'
    ? [
        ...(hasTemplate ? [{ value: TEMPLATE_KEY, label: 'Toute la semaine' }] : []),
        ...DAY_OPTIONS.filter(d => items.some(i => !i.applies_all_days && i.day_of_week === d.val)).map(d => ({ value: d.val, label: d.full })),
      ]
    : (Object.keys(MEAL_TYPE_ORDER) as MealType[])
        .sort((a, b) => MEAL_TYPE_ORDER[a] - MEAL_TYPE_ORDER[b])
        .filter(t => items.some(i => i.meal_type === t))
        .map(t => ({ value: t, label: MEAL_LABEL[t] }))

  // Tri à l'intérieur de chaque groupe ; les repas sans avis restent à la fin.
  const filtered = items.filter(i => activeChip === null || groupKeyOf(i) === activeChip)
  const scoreOf  = (i: ResultItem, empty: number) => agreementPct(countsOf(i)) ?? empty
  const sortFn   = (a: ResultItem, b: ResultItem) =>
    sort === 'best'    ? scoreOf(b, -1) - scoreOf(a, -1) || chronoCompare(a, b)
    : sort === 'worst' ? scoreOf(a, 101) - scoreOf(b, 101) || chronoCompare(a, b)
    : chronoCompare(a, b)

  const groups = chips
    .filter(c => activeChip === null || c.value === activeChip)
    .map(c => ({ key: c.value, label: c.label, items: filtered.filter(i => groupKeyOf(i) === c.value).sort(sortFn) }))
    .filter(g => g.items.length > 0)

  const recapText = [
    `Résultats du sondage KeskonBouf — semaine du ${weekRange}`,
    `${data.total_respondents} avis · ${data.global_score ?? 0}% d'accord`,
    favorites.length ? `Les plus appréciés : ${favorites.map(f => f.main_name).filter(Boolean).join(', ')}` : '',
  ].filter(Boolean).join('\n')

  const token    = data.share_token
  const pending  = Math.max(0, memberCount - data.total_respondents)
  const ghostBtn = 'flex h-11 flex-1 sm:flex-none items-center justify-center gap-2 rounded-full bg-white/10 px-4 font-quicksand text-sm font-semibold text-[var(--kkb-creme)] transition-colors hover:bg-white/20 disabled:opacity-60'

  return (
    <>
    <FridgePrintSheet data={data} favoriteIds={favorites.map(f => f.id)} />
    <div className="mx-auto max-w-lg space-y-6 px-4 pb-8 pt-2 lg:max-w-none lg:space-y-8 lg:px-0 lg:pt-0 print:hidden">

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        {/* ── Bandeau : accord global, participation, actions ─────────────── */}
        <section className="flex flex-col rounded-[var(--kkb-r-xl)] bg-[var(--kkb-foret)] p-5 lg:col-span-8 lg:row-start-1 lg:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-quicksand text-sm font-semibold text-[var(--kkb-foret-100)]">Sondage · semaine du {weekRange}</p>
              <h1 className="mt-0.5 text-h1 text-[var(--kkb-creme)]">Résultats du sondage</h1>
            </div>
            <button
              type="button" onClick={() => router.push('/plan')}
              aria-label="Retour au menu"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-[var(--kkb-creme)] transition-colors hover:bg-white/20 lg:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-4 lg:gap-6">
            <ConsensusGauge pct={data.global_score} label="d'accord" tone="onDark" size={104} />
            <div className="min-w-0 space-y-2">
              <p className="text-signature text-[var(--kkb-creme)]">{harmony.label}</p>
              <p className="font-quicksand text-sm text-[var(--kkb-foret-100)]">
                {rejected.length === 0
                  ? `Aucun des ${voted.length} repas notés n’est rejeté par la famille.`
                  : `${rejected.length} repas sur ${voted.length} rejeté${rejected.length > 1 ? 's' : ''} par la majorité.`}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2.5">
            <AvatarStack names={data.respondents.map(r => r.name)} pending={pending} />
            <p className="font-quicksand text-xs font-semibold text-[var(--kkb-foret-100)]">
              {allVoted ? 'Toute la famille a répondu' : `${data.total_respondents} sur ${memberCount} ont répondu`}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 lg:mt-auto lg:pt-5">
            <button
              type="button"
              onClick={() => router.push(`/plan?week=${data.week_start}`)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--kkb-orange)] px-5 font-quicksand text-sm font-bold text-white transition-colors hover:bg-[var(--kkb-orange-700)] sm:w-auto"
            >
              <Pencil className="h-4 w-4" /> Ajuster le menu
            </button>
            <ShareActions
              getPayload={() => ({ title: 'Résultats du sondage — KeskonBouf', text: recapText })}
              shareLabel="Partager"
              copyLabel="Copier"
              className="contents"
              buttonClassName={ghostBtn}
            />
            <button type="button" onClick={() => window.print()} className={ghostBtn} aria-label="Imprimer pour le frigo">
              <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Imprimer pour le frigo</span>
            </button>
          </div>
        </section>

        {/* ── Les plus appréciés ─────────────────────────────────────────── */}
        <section className="rounded-[var(--kkb-r-xl)] bg-white p-5 lg:col-span-6 lg:row-start-2" aria-labelledby="fav-title">
          <CardTitle id="fav-title" icon={<Heart className="h-4 w-4" />} iconClass="bg-[var(--kkb-jaune-50)] text-[var(--kkb-jaune-text)]">
            Les plus appréciés
          </CardTitle>
          {favorites.length === 0 ? (
            <p className="mt-3 font-quicksand text-sm text-[var(--kkb-texte-2)]">Pas encore assez d&apos;avis.</p>
          ) : (
            <ol className="mt-3 space-y-1">
              {favorites.map((f, idx) => (
                <li key={f.id} className="flex items-center gap-3 px-1 py-2">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-dosis text-sm font-extrabold ${
                    idx === 0 ? 'bg-[var(--kkb-jaune)] text-[var(--kkb-jaune-900)]' : 'bg-[var(--kkb-jaune-50)] text-[var(--kkb-jaune-text)]'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-quicksand text-sm font-bold text-[var(--kkb-profond)]">{f.main_name ?? 'Repas'}</p>
                    <p className="font-quicksand text-xs text-[var(--kkb-texte-2)]">{MEAL_LABEL[f.meal_type]} · {dayLabelOf(f)}</p>
                  </div>
                  <span className="shrink-0 font-quicksand text-xs font-semibold text-[var(--kkb-texte-2)]">
                    <span className="font-dosis text-base font-extrabold text-[var(--kkb-foret-500)] tabular-nums">{f.aime}</span> J&apos;adore
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* ── À revoir ───────────────────────────────────────────────────── */}
        <section className="rounded-[var(--kkb-r-xl)] bg-white p-5 lg:col-span-6 lg:row-start-2" aria-labelledby="review-title">
          <CardTitle id="review-title" icon={<MessageCircleWarning className="h-4 w-4" />} iconClass="bg-[var(--kkb-orange-50)] text-[var(--kkb-orange-text)]">
            À revoir
          </CardTitle>
          {toReview.length === 0 ? (
            <div className="mt-3 flex items-center gap-3 rounded-[var(--kkb-r-md)] bg-[var(--kkb-sauge-50)] p-3">
              <PartyPopper className="h-5 w-5 shrink-0 text-[var(--kkb-foret-500)]" />
              <p className="font-quicksand text-sm text-[var(--kkb-profond)]">Aucun plat n&apos;a déplu : le menu est prêt pour les fourneaux.</p>
            </div>
          ) : (
            <ul className="mt-3 space-y-1">
              {toReview.map(item => {
                const pct  = agreementPct(countsOf(item))
                const tone = agreementTone(pct)
                return (
                  <li key={item.id} className="flex items-center gap-3 px-1 py-2">
                    <span className="flex h-8 min-w-[3rem] shrink-0 items-center justify-center rounded-full px-2 font-dosis text-sm font-extrabold tabular-nums" style={{ backgroundColor: tone.bg, color: tone.text }}>
                      {pct}%
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-quicksand text-sm font-bold text-[var(--kkb-profond)]">{item.main_name ?? 'Repas'}</p>
                      <p className="truncate font-quicksand text-xs text-[var(--kkb-texte-2)]">
                        {item.naime_pas} « Pas trop » · {MEAL_LABEL[item.meal_type]} · {dayLabelOf(item)}
                      </p>
                    </div>
                    <button
                      type="button" onClick={() => editItem(item)}
                      aria-label={`Changer ${item.main_name ?? 'ce repas'}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[var(--kkb-filet)] font-quicksand text-xs font-bold text-[var(--kkb-foret)] transition-colors hover:border-[var(--kkb-foret-300)] sm:w-auto sm:px-3"
                    >
                      <Pencil className="h-3.5 w-3.5 sm:hidden" />
                      <span className="hidden sm:inline">Changer</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* ── Qui a répondu ──────────────────────────────────────────────── */}
        <section className="flex flex-col rounded-[var(--kkb-r-xl)] bg-white p-5 lg:col-span-4 lg:col-start-9 lg:row-start-1" aria-labelledby="who-title">
          <CardTitle id="who-title" icon={<Users className="h-4 w-4" />} iconClass="bg-[var(--kkb-foret-50)] text-[var(--kkb-foret)]">
            Qui a répondu
          </CardTitle>
          <ul className="mt-3 flex-1 space-y-1">
            {data.respondents.slice(0, 5).map((r, i) => (
              <li key={`${r.name}-${i}`} className="flex items-center gap-3 py-1.5">
                <NameAvatar name={r.name} size={32} />
                <p className="min-w-0 flex-1 truncate font-quicksand text-sm font-bold text-[var(--kkb-profond)]">{r.name}</p>
                <p className="shrink-0 font-quicksand text-xs text-[var(--kkb-texte-2)]">
                  {formatDistanceToNow(new Date(r.voted_at), { addSuffix: true, locale: fr })}
                </p>
              </li>
            ))}
            {data.respondents.length > 5 && (
              <li className="font-quicksand text-xs text-[var(--kkb-texte-2)]">
                et {data.respondents.length - 5} autre{data.respondents.length - 5 > 1 ? 's' : ''}
              </li>
            )}
          </ul>
          {pending > 0 && token ? (
            <div className="mt-3 space-y-2 border-t border-dashed border-[var(--kkb-filet)] pt-3">
              <p className="font-quicksand text-xs text-[var(--kkb-texte-2)]">
                {pending} avis attendu{pending > 1 ? 's' : ''}. Un petit rappel ?
              </p>
              <ShareActions
                getPayload={() => surveyLinkPayload(token)}
                shareLabel="Relancer"
                className="flex items-center gap-2"
                buttonClassName="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border-[1.5px] border-[var(--kkb-filet)] font-quicksand text-sm font-semibold text-[var(--kkb-foret)] transition-colors hover:border-[var(--kkb-foret-300)] disabled:opacity-60"
              />
            </div>
          ) : (
            <button
              type="button" onClick={() => router.push('/circle')}
              className="mt-3 flex h-10 items-center justify-center gap-1 font-quicksand text-sm font-bold text-[var(--kkb-foret)]"
            >
              Voir le cercle <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </section>
      </div>

      {/* ── Repas par repas ─────────────────────────────────────────────── */}
      <section className="space-y-4" aria-labelledby="detail-title">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="detail-title" className="text-h2 text-[var(--kkb-foret)]">Repas par repas</h2>
          <p className="font-quicksand text-xs text-[var(--kkb-texte-2)]">{voted.length} repas notés sur {items.length}</p>
        </div>

        <ResultsFilters
          viewMode={viewMode} onViewModeChange={changeViewMode}
          chips={chips} activeChip={activeChip} onChipChange={setActiveChip}
          sort={sort} onSortChange={setSort}
        />

        <div className="space-y-6">
          {groups.map(g => (
            <div key={g.key} className="space-y-3">
              <h3 className="flex items-center gap-3 font-dosis text-base font-bold text-[var(--kkb-profond)]">
                {g.label}
                <span className="h-px flex-1 bg-[var(--kkb-filet)]" aria-hidden="true" />
                <span className="font-quicksand text-xs font-semibold text-[var(--kkb-texte-2)]">{g.items.length} repas</span>
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:gap-4 2xl:grid-cols-3">
                {g.items.map(item => (
                  <ResultCard key={item.id} item={item} dayLabel={dayLabelOf(item)} onEdit={() => editItem(item)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
    </>
  )
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function CardTitle({ id, icon, iconClass, children }: {
  id: string; icon: React.ReactNode; iconClass: string; children: React.ReactNode
}) {
  return (
    <h2 id={id} className="flex items-center gap-2.5 text-h3 text-[var(--kkb-profond)]">
      <span className={`flex h-8 w-8 items-center justify-center rounded-full ${iconClass}`}>{icon}</span>
      {children}
    </h2>
  )
}

// Visages de ceux qui ont répondu, puis une place en pointillé pour les avis attendus.
function AvatarStack({ names, pending }: { names: string[]; pending: number }) {
  const shown = names.slice(0, 4)
  return (
    <div className="flex -space-x-1.5" aria-hidden="true">
      {shown.map((n, i) => (
        <span key={`${n}-${i}`} className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--kkb-foret-100)] font-quicksand text-xs font-bold text-[var(--kkb-foret)] ring-2 ring-[var(--kkb-foret)]">
          {n.trim().charAt(0).toUpperCase() || '?'}
        </span>
      ))}
      {names.length > shown.length && (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 font-quicksand text-[11px] font-bold text-[var(--kkb-creme)] ring-2 ring-[var(--kkb-foret)]">
          +{names.length - shown.length}
        </span>
      )}
      {pending > 0 && (
        <span className="flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] border-dashed border-[var(--kkb-foret-300)] bg-[var(--kkb-foret)] font-quicksand text-[11px] font-bold text-[var(--kkb-foret-100)]">
          {pending}
        </span>
      )}
    </div>
  )
}
