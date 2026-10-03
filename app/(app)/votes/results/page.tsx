'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, ArrowRight, CalendarPlus, CheckCircle2, MailOpen, Printer,
  Settings2, Share2, Smile, Sparkles, Star, UserPlus, Users,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { MEAL_LABEL, MEAL_TYPE_ORDER, type MealType } from '@/lib/constants/meal-type'
import { DAY_OPTIONS, formatWeekRange } from '@/lib/utils/week'
import { agreementPct, isRejected, totalReactions } from '@/lib/utils/survey-score'
import { ConsensusGauge } from '@/components/votes/consensus-gauge'
import { FridgePrintSheet } from '@/components/votes/fridge-print-sheet'
import { ShareActions, surveyLinkPayload } from '@/components/ui/share-actions'
import { NameAvatar } from '@/components/votes/name-avatar'
import { ResultCard } from '@/components/votes/result-card'
import { ResultsFilters, type ResultsSort, type ResultsViewMode } from '@/components/votes/results-filters'
import type { ResultItem, SurveyResultsData } from '@/components/votes/types'
import { TEMPLATE_KEY, chronoCompare, countsOf, dayLabelOf, harmonyOf } from '@/components/votes/result-helpers'
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
  const [sort,      setSort]      = useState<ResultsSort>('approval')

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
      .slice(0, 2)
    return { items, voted, rejected, favorites }
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
        title={loadState === 'error' ? 'Impossible de charger les résultats' : 'Aucun menu à afficher'}
        message={loadState === 'error' ? 'Réessaie dans un instant.' : 'Planifie un menu puis partage-le à ta famille pour recueillir leurs votes.'}
        action={{ label: 'Aller au menu', onClick: () => router.push('/plan') }}
      />
    )
  }

  const weekRange     = formatWeekRange(data.week_start)
  const memberCount   = Math.max(data.member_count, 1)
  const allVoted      = data.total_respondents >= memberCount
  const participation = Math.min(100, Math.round((data.total_respondents / memberCount) * 100))
  const harmony       = harmonyOf(data.global_score)

  // 0 répondant : selon l'avancement du menu, on guide vers l'étape suivante.
  if (data.total_respondents === 0) {
    const token = data.share_token

    if (data.items.length === 0) {
      return (
        <EmptyState
          icon={<CalendarPlus className="h-8 w-8 text-[var(--kkb-text-tertiary)]" />}
          title="Menu à planifier"
          message={`Aucun repas n'est planifié pour la semaine du ${weekRange}. Planifie d'abord ton menu, puis partage-le à ta famille pour recueillir leurs votes.`}
          action={{ label: 'Planifier le menu', onClick: () => router.push(`/plan?week=${data.week_start}`) }}
        />
      )
    }

    if (!token) {
      return (
        <EmptyState
          icon={<Share2 className="h-8 w-8 text-[var(--kkb-text-tertiary)]" />}
          title="Menu pas encore partagé"
          message={`Ton menu de la semaine du ${weekRange} est planifié mais pas encore partagé. Partage-le à ta famille pour recueillir leurs votes.`}
          action={{ label: 'Partager le menu', onClick: () => router.push(`/plan/validate?week=${data.week_start}`) }}
        />
      )
    }

    return (
      <EmptyState
        icon={<MailOpen className="h-8 w-8 text-[var(--kkb-text-tertiary)]" />}
        title="En attente des votes"
        message={`Personne n'a encore voté pour la semaine du ${weekRange}. Partage le lien du sondage avec ta famille.`}
      >
        <ShareActions getPayload={() => surveyLinkPayload(token)} />
      </EmptyState>
    )
  }

  // ── Filtres ────────────────────────────────────────────────────────────────

  const { items, voted, rejected, favorites } = derived
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

  const filtered   = items.filter(i => activeChip === null || groupKeyOf(i) === activeChip)
  const votedCount = filtered.filter(i => totalReactions(countsOf(i)) > 0).length

  const groups = chips
    .filter(c => activeChip === null || c.value === activeChip)
    .map(c => ({ key: c.value, label: c.label, items: filtered.filter(i => groupKeyOf(i) === c.value) }))
    .filter(g => g.items.length > 0)
  if (viewMode === 'type') {
    for (const g of groups) g.items.sort(chronoCompare)
  }

  const desktopItems = sort === 'chrono'
    ? filtered
    : [...filtered].sort((a, b) => (agreementPct(countsOf(b)) ?? -1) - (agreementPct(countsOf(a)) ?? -1) || chronoCompare(a, b))

  const recapText = [
    `Résultats du sondage KeskonBouf — semaine du ${weekRange}`,
    `${data.total_respondents} vote${data.total_respondents > 1 ? 's' : ''} · ${data.global_score ?? 0}% d'accord`,
    favorites.length ? `Favoris : ${favorites.map(f => f.main_name).filter(Boolean).join(', ')}` : '',
  ].filter(Boolean).join('\n')

  return (
    <>
    <FridgePrintSheet data={data} favoriteIds={favorites.map(f => f.id)} />
    <div className="mx-auto max-w-lg px-4 pb-24 pt-2 lg:max-w-[1400px] lg:px-8 lg:py-8 lg:pb-12 space-y-5 lg:space-y-6 print:hidden">

      {/* ── Mobile : en-tête + synthèse ─────────────────────────────────── */}
      <div className="lg:hidden space-y-4">
        <button type="button" onClick={() => router.push('/plan')} className="flex items-center gap-1 text-sm font-quicksand font-semibold text-[var(--kkb-teal)] print:hidden">
          <ArrowLeft className="h-4 w-4" /> Menu
        </button>

        <div className="space-y-2 text-center">
          <h1 className="font-dosis font-extrabold text-2xl text-[var(--kkb-text-primary)]">Résultats des votes</h1>
          <ParticipationBadge allVoted={allVoted} respondents={data.total_respondents} members={memberCount} />
        </div>

        <div className="bg-white border border-[var(--kkb-border)] rounded-[var(--kkb-radius-card)] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: allVoted ? 'var(--kkb-success)' : 'var(--kkb-warning)' }} />
            <p className="flex-1 font-dosis font-semibold text-base text-[var(--kkb-text-primary)]">
              {allVoted ? 'Participation complète' : 'Participation en cours'}
            </p>
            <span className="text-sm font-quicksand font-bold" style={{ color: allVoted ? 'var(--kkb-success)' : 'var(--kkb-warning)' }}>
              {participation}%
            </span>
          </div>
          <p className="text-[13px] font-quicksand text-[var(--kkb-text-secondary)]">
            {data.total_respondents}/{memberCount} membres de la famille ont voté cette semaine
          </p>
          <hr className="border-[var(--kkb-border)]" />
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[12px] font-quicksand font-bold uppercase tracking-wide text-[var(--kkb-text-tertiary)]">Consensus global</p>
              <p className="flex items-baseline gap-1.5">
                <span className="font-dosis font-extrabold text-[28px] leading-none text-[var(--kkb-coral)]">
                  {data.global_score === null ? '—' : `${data.global_score}%`}
                </span>
                <span className="text-sm font-quicksand text-[var(--kkb-text-secondary)]">d&apos;accord</span>
              </p>
            </div>
            <button type="button" onClick={() => router.push('/circle')} className="flex items-center gap-1 rounded-[var(--kkb-radius-pill)] px-3 py-1.5 text-xs font-quicksand font-bold text-[var(--kkb-teal)] hover:bg-[var(--kkb-teal-light)] print:hidden">
              <Users className="h-3.5 w-3.5" /> Voir le cercle <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Desktop : en-tête + 3 colonnes de stats ─────────────────────── */}
      <div className="hidden lg:block space-y-6">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-1.5">
            <p className="flex items-center gap-3 text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--kkb-text-tertiary)]">
              Session de consultation hebdomadaire
              <span className="flex items-center gap-1.5 normal-case tracking-normal text-xs font-normal text-[var(--kkb-success)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--kkb-success)]" /> Semaine du {weekRange}
              </span>
            </p>
            <h1 className="font-dosis font-extrabold text-[28px] leading-tight text-[var(--kkb-text-primary)]">Résultats des votes de la famille</h1>
            <ParticipationBadge allVoted={allVoted} respondents={data.total_respondents} members={memberCount} long />
            <p className="max-w-2xl pt-1 text-sm font-quicksand text-[var(--kkb-text-secondary)]">
              {allVoted && rejected.length === 0
                ? 'Chaque membre du foyer s’est exprimé et aucun plat n’est rejeté : le menu est prêt pour vos fourneaux.'
                : 'Voici l’avis de la famille sur les repas de la semaine. Ajustez les plats les moins plébiscités avant de passer aux fourneaux.'}
            </p>
          </div>
          <button type="button" onClick={() => router.push('/circle')} className="shrink-0 flex items-center gap-2 rounded-[var(--kkb-radius-sm)] border border-[var(--kkb-border)] bg-white px-4 py-2.5 text-sm font-quicksand font-semibold text-[var(--kkb-text-secondary)] hover:border-[var(--kkb-coral)] hover:text-[var(--kkb-coral)] print:hidden">
            <Settings2 className="h-4 w-4" /> Paramètres du cercle
          </button>
        </div>

        <div className="grid grid-cols-3 gap-5">
          {/* Climat culinaire */}
          <StatColumn eyebrow="Climat culinaire" title="Consensus global" icon={<Smile className="h-4 w-4" />}
            footer={
              <span className={`rounded-[var(--kkb-radius-pill)] px-2.5 py-1 text-[11px] font-quicksand font-bold ${rejected.length === 0 ? 'bg-[var(--kkb-success-light)] text-[var(--kkb-success)]' : 'bg-[var(--kkb-warning-light)] text-[#B07A12]'}`}>
                {rejected.length === 0 ? 'Aucun plat rejeté' : `${rejected.length} plat${rejected.length > 1 ? 's' : ''} à revoir`}
              </span>
            }>
            <div className="flex items-center gap-4">
              <ConsensusGauge pct={data.global_score} label="Accord" />
              <div className="space-y-1">
                <p className="text-sm font-quicksand font-bold" style={{ color: harmony.color }}>{harmony.label}</p>
                <p className="text-[13px] font-quicksand text-[var(--kkb-text-secondary)]">
                  {voted.length - rejected.length} repas sur {voted.length} validé{voted.length > 1 ? 's' : ''} sans objection majeure.
                  {rejected.length === 0 && ' Zéro gaspillage anticipé !'}
                </p>
              </div>
            </div>
          </StatColumn>

          {/* Favoris */}
          <StatColumn eyebrow="Favoris de la semaine" title="Plats plébiscités" icon={<Star className="h-4 w-4" />}
            footer={
              <span className={`rounded-[var(--kkb-radius-pill)] px-2.5 py-1 text-[11px] font-quicksand font-bold ${rejected.length === 0 ? 'bg-[var(--kkb-success-light)] text-[var(--kkb-success)]' : 'bg-[var(--kkb-warning-light)] text-[#B07A12]'}`}>
                {rejected.length} plat{rejected.length > 1 ? 's' : ''} rejeté{rejected.length > 1 ? 's' : ''} cette semaine{rejected.length === 0 && ' · succès total'}
              </span>
            }>
            <ol className="space-y-2">
              {favorites.map((f, idx) => {
                const lovePct = Math.round((f.aime / totalReactions(countsOf(f))) * 100)
                return (
                  <li key={f.id} className="flex items-center gap-3 rounded-[var(--kkb-radius-sm)] bg-[var(--kkb-bg)] p-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--kkb-coral)] text-xs font-quicksand font-bold text-white">{idx + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-quicksand font-bold text-[var(--kkb-text-primary)]">{f.main_name ?? 'Repas'}</p>
                      <p className="text-[11px] font-quicksand text-[var(--kkb-text-tertiary)]">{dayLabelOf(f)} · {MEAL_LABEL[f.meal_type]}</p>
                    </div>
                    <span className="shrink-0 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-success-light)] px-2 py-0.5 text-[11px] font-quicksand font-bold text-[var(--kkb-success)]">
                      {lovePct}% J&apos;adore
                    </span>
                  </li>
                )
              })}
            </ol>
          </StatColumn>

          {/* Cercle de table */}
          <StatColumn eyebrow="Cercle de table" title="Ont voté" icon={<Users className="h-4 w-4" />}
            footer={
              <div className="flex w-full items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-quicksand font-bold text-[var(--kkb-success)]">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {data.total_respondents} vote{data.total_respondents > 1 ? 's' : ''} enregistré{data.total_respondents > 1 ? 's' : ''}
                </span>
                <button type="button" onClick={() => router.push('/circle')} className="flex items-center gap-1 text-[11px] font-quicksand font-bold text-[var(--kkb-coral)] hover:underline print:hidden">
                  <UserPlus className="h-3.5 w-3.5" /> Inviter un convive
                </button>
              </div>
            }>
            <ul className="grid grid-cols-2 gap-2">
              {data.respondents.slice(0, 4).map((r, i) => (
                <li key={`${r.name}-${i}`} className="flex items-center gap-2 rounded-[var(--kkb-radius-sm)] bg-[var(--kkb-bg)] p-2">
                  <NameAvatar name={r.name} />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-quicksand font-bold text-[var(--kkb-text-primary)]">{r.name}</p>
                    <p className="truncate text-[10px] font-quicksand text-[var(--kkb-text-tertiary)]">
                      {formatDistanceToNow(new Date(r.voted_at), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            {data.respondents.length > 4 && (
              <p className="text-[11px] font-quicksand text-[var(--kkb-text-tertiary)]">+ {data.respondents.length - 4} autre{data.respondents.length - 4 > 1 ? 's' : ''}</p>
            )}
          </StatColumn>
        </div>
      </div>

      {/* ── Filtres ─────────────────────────────────────────────────────── */}
      <ResultsFilters
        viewMode={viewMode} onViewModeChange={changeViewMode}
        chips={chips} activeChip={activeChip} onChipChange={setActiveChip}
        votedCount={votedCount} sort={sort} onSortChange={setSort}
      />

      {/* ── Mobile : détail groupé ──────────────────────────────────────── */}
      <section className="lg:hidden space-y-5">
        <div className="flex items-baseline justify-between gap-2 border-b border-[var(--kkb-border)] pb-2">
          <h2 className="font-dosis font-bold text-lg text-[var(--kkb-text-primary)]">Détail des votes</h2>
          <span className="text-xs font-quicksand text-[var(--kkb-text-tertiary)]">Semaine du {weekRange}</span>
        </div>
        {groups.map(g => {
          const groupVoted = g.items.filter(i => totalReactions(countsOf(i)) > 0).length
          return (
            <div key={g.key} className="space-y-3">
              <p className="flex items-baseline gap-2">
                <span className="rounded-[var(--kkb-radius-sm)] bg-[var(--kkb-coral-light)] px-2.5 py-1 font-dosis font-bold text-base text-[var(--kkb-coral)]">{g.label}</span>
                <span className="text-xs font-quicksand text-[var(--kkb-text-tertiary)]">{groupVoted} {groupVoted > 1 ? 'repas votés' : 'repas voté'}</span>
              </p>
              {g.items.map(item => (
                <ResultCard key={item.id} item={item} dayLabel={dayLabelOf(item)} onEdit={() => editItem(item)} />
              ))}
            </div>
          )
        })}
      </section>

      {/* ── Desktop : grille 2 colonnes ─────────────────────────────────── */}
      <section className="hidden lg:grid grid-cols-2 gap-5">
        {desktopItems.map(item => (
          <ResultCard key={item.id} item={item} dayLabel={dayLabelOf(item)} onEdit={() => editItem(item)} />
        ))}
      </section>

      {/* ── Desktop : pied de page ──────────────────────────────────────── */}
      <section className="hidden lg:flex items-center justify-between gap-6 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--kkb-radius-sm)] bg-[var(--kkb-success)] text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <h3 className="font-dosis font-bold text-lg text-[var(--kkb-text-primary)]">Charge mentale allégée</h3>
            <p className="max-w-xl text-sm font-quicksand text-[var(--kkb-text-secondary)]">
              Grâce à cette consultation, la question « Qu’est-ce qu’on mange ce soir ? » est réglée pour les 7 prochains jours.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-3 print:hidden">
          <ShareActions
            getPayload={() => ({ title: 'Résultats des votes — KeskonBouf', text: recapText })}
            shareLabel="Partager le récap"
            copyLabel="Copier le récap"
            className="contents"
            buttonClassName="flex items-center gap-2 rounded-[var(--kkb-radius-sm)] border border-[var(--kkb-border)] px-4 py-2.5 text-sm font-quicksand font-semibold text-[var(--kkb-text-secondary)] hover:border-[var(--kkb-coral)] hover:text-[var(--kkb-coral)] disabled:opacity-60"
          />
          <button
            type="button" onClick={() => window.print()}
            className="flex items-center gap-2 rounded-[var(--kkb-radius-sm)] border border-[var(--kkb-border)] px-4 py-2.5 text-sm font-quicksand font-semibold text-[var(--kkb-text-secondary)] hover:border-[var(--kkb-coral)] hover:text-[var(--kkb-coral)]"
          >
            <Printer className="h-4 w-4" /> Imprimer pour le frigo
          </button>
        </div>
      </section>
    </div>
    </>
  )
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function ParticipationBadge({ allVoted, respondents, members, long }: {
  allVoted: boolean; respondents: number; members: number; long?: boolean
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-[var(--kkb-radius-pill)] px-3 py-1 text-[13px] font-quicksand font-semibold ${
      allVoted ? 'bg-[var(--kkb-success-light)] text-[var(--kkb-success)]' : 'bg-[var(--kkb-warning-light)] text-[#B07A12]'
    }`}>
      <CheckCircle2 className="h-4 w-4" />
      {allVoted
        ? (long ? `Participation complète : ${respondents}/${members} membres ont voté` : 'Toute la famille a participé !')
        : `${respondents}/${members} membres ont voté`}
    </span>
  )
}

function StatColumn({ eyebrow, title, icon, children, footer }: {
  eyebrow: string; title: string; icon: React.ReactNode; children: React.ReactNode; footer: React.ReactNode
}) {
  return (
    <div className="flex flex-col rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--kkb-text-tertiary)]">{eyebrow}</p>
          <p className="font-dosis font-bold text-xl text-[var(--kkb-text-primary)]">{title}</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--kkb-coral-light)] text-[var(--kkb-coral)]">{icon}</span>
      </div>
      <div className="flex-1 space-y-2">{children}</div>
      <div className="mt-4 flex items-center border-t border-[var(--kkb-border)] pt-3">{footer}</div>
    </div>
  )
}
