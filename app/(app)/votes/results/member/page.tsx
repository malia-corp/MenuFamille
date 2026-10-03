'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, CheckCircle, Inbox, PartyPopper, Shield, Vote, WifiOff } from 'lucide-react'
import { formatWeekRange } from '@/lib/utils/week'
import { totalReactions } from '@/lib/utils/survey-score'
import { ConsensusGauge } from '@/components/votes/consensus-gauge'
import { ResultCard } from '@/components/votes/result-card'
import { EmptyState, PageLoader } from '@/components/votes/page-states'
import { TEMPLATE_KEY, chronoCompare, countsOf, dayLabelOf, harmonyOf } from '@/components/votes/result-helpers'
import type { ResultItem } from '@/components/votes/types'

type Reaction  = 'aime' | 'bof' | 'naime_pas'
type LoadState = 'loading' | 'ready' | 'no_survey' | 'error'

interface MemberResultsData {
  global_score:      number | null
  total_respondents: number
  per_item:          { meal_plan_item_id: string; my_reaction: Reaction | null }[]
  week_start:        string
  member_count:      number
  voter_names:       string[]
  planner_name:      string | null
  has_voted:         boolean
  share_token:       string
  status:            string
  items:             ResultItem[]
}

const VOTER_COLORS = ['var(--kkb-coral)', 'var(--kkb-teal)', 'var(--kkb-warning)', 'var(--kkb-success)', 'var(--kkb-text-secondary)']

function harmonyMessage(score: number | null): string {
  if (score === null) return 'Les votes de la famille arrivent bientôt.'
  if (score >= 80)    return 'Toute la tablée a validé le menu dans un esprit de partage.'
  if (score >= 60)    return 'La famille est globalement d’accord sur le menu de la semaine.'
  return 'Les avis sont partagés : la cuisine va ajuster quelques plats.'
}

// "Rosine, Bénédicte, Marc & Koffi"
function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`
}

export default function MemberResultsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <MemberResultsContent />
    </Suspense>
  )
}

function MemberResultsContent() {
  const router       = useRouter()
  const planParam    = useSearchParams().get('plan')
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [data,      setData]      = useState<MemberResultsData | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        let id = planParam
        if (!id) {
          const latest = await fetch('/api/meal-plans/circle-latest').then(r => (r.ok ? r.json() : null))
          id = latest?.id ?? null
        }
        if (!id) { setLoadState('no_survey'); return }
        const res = await fetch(`/api/meal-plans/${id}/survey-results/member`)
        if (!res.ok) { setLoadState(res.status === 404 ? 'no_survey' : 'error'); return }
        setData(await res.json())
        setLoadState('ready')
      } catch {
        setLoadState('error')
      }
    })()
  }, [planParam])

  const groups = useMemo(() => {
    if (!data) return []
    const byKey = new Map<string, { label: string; items: ResultItem[] }>()
    for (const item of [...data.items].sort(chronoCompare)) {
      const key = item.applies_all_days ? TEMPLATE_KEY : item.day_of_week
      if (!byKey.has(key)) byKey.set(key, { label: dayLabelOf(item), items: [] })
      byKey.get(key)!.items.push(item)
    }
    return Array.from(byKey.entries()).map(([key, g]) => ({ key, ...g }))
  }, [data])

  if (loadState === 'loading') return <PageLoader />

  if (loadState !== 'ready' || !data) {
    return (
      <EmptyState
        icon={loadState === 'error' ? WifiOff : Inbox}
        icon={<Inbox className="h-8 w-8 text-[var(--kkb-text-tertiary)]" />}
        title={loadState === 'error' ? 'Impossible de charger les résultats' : 'Aucun sondage en cours'}
        message={loadState === 'error'
          ? 'Réessaie dans un instant.'
          : 'Quand ta famille partagera le menu de la semaine, les résultats des votes apparaîtront ici.'}
        action={{ label: 'Retour à l’accueil', onClick: () => router.push('/') }}
      />
    )
  }

  const myReactionOf = new Map(data.per_item.map(p => [p.meal_plan_item_id, p.my_reaction]))
  const harmony      = harmonyOf(data.global_score)
  const surveyUrl    = `/s/${data.share_token}`

  // Pas encore voté : on invite d'abord à donner son avis
  if (!data.has_voted) {
    return (
      <EmptyState
        icon={Vote}
        title="Tu n'as pas encore donné ton avis"
        message={`${data.planner_name ?? 'Ta famille'} attend ta contribution pour finaliser la semaine.`}
        action={{ label: 'Voter maintenant', icon: ArrowRight, onClick: () => router.push(surveyUrl) }}
      />
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 px-4 pb-24 pt-2 lg:max-w-3xl lg:py-8">
      <div className="space-y-2 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-teal-light)] px-3 py-1 text-xs font-quicksand font-bold text-[var(--kkb-teal)]">
          <Shield className="h-3.5 w-3.5" /> Votes anonymisés &amp; bienveillants
        </span>
        <h1 className="flex items-center justify-center gap-2 font-dosis font-extrabold text-2xl text-[var(--kkb-text-primary)]">
          Résultats de la famille <PartyPopper className="h-6 w-6 text-[var(--kkb-coral)]" />
        </h1>
        <p className="text-xs font-quicksand text-[var(--kkb-text-tertiary)]">
          Semaine du {formatWeekRange(data.week_start)}{data.status === 'finalized' ? ' · Consultation clôturée' : ''}
        </p>
        {data.voter_names.length > 0 && (
          <div className="flex justify-center -space-x-2 pt-1" aria-label={`${data.voter_names.length} votants`}>
            {data.voter_names.slice(0, 6).map((n, i) => (
              <span
                key={n}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white font-dosis text-xs font-bold text-white"
                style={{ backgroundColor: VOTER_COLORS[i % VOTER_COLORS.length] }}
              >
                {n.charAt(0).toUpperCase()}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Indice d'harmonie */}
      <section className="space-y-3 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-coral)] bg-[var(--kkb-coral-light)] p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-quicksand font-bold uppercase tracking-wider text-[var(--kkb-coral)]">Indice d&apos;harmonie</p>
          <span className="rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-success-light)] px-2.5 py-0.5 text-[11px] font-quicksand font-bold text-[var(--kkb-success)]">
            {data.total_respondents}/{Math.max(data.member_count, 1)} votants
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ConsensusGauge pct={data.global_score} label="D'accord" size={104} />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-quicksand font-bold" style={{ color: harmony.color }}>{harmony.label}</p>
            <p className="text-[13px] font-quicksand text-[var(--kkb-text-secondary)]">{harmonyMessage(data.global_score)}</p>
            {data.voter_names.length > 0 && (
              <p className="text-xs font-quicksand text-[var(--kkb-text-tertiary)]">{joinNames(data.voter_names)}</p>
            )}
          </div>
        </div>
      </section>

      {!data.has_voted && (
        <section className="flex items-center gap-3 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-4">
          <Vote className="h-5 w-5 shrink-0 text-[var(--kkb-coral)]" />
          <p className="flex-1 text-[13px] font-quicksand text-[var(--kkb-text-secondary)]">
            Tu n’as pas encore donné ton avis sur ce menu.
          </p>
          <button
            type="button"
            onClick={() => router.push(surveyUrl)}
            className="shrink-0 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral)] px-4 py-2 text-xs font-quicksand font-bold text-white"
          >
            Voter
          </button>
        </section>
      )}

      {/* Résultats par repas : agrégats seulement, aucun commentaire nommé */}
      {groups.map(g => {
        const voted = g.items.filter(i => totalReactions(countsOf(i)) > 0).length
        return (
          <section key={g.key} className="space-y-3">
            <p className="flex items-baseline gap-2">
              <span className="rounded-[var(--kkb-radius-sm)] bg-[var(--kkb-coral-light)] px-2.5 py-1 font-dosis font-bold text-base text-[var(--kkb-coral)]">{g.label}</span>
              <span className="text-xs font-quicksand text-[var(--kkb-text-tertiary)]">{voted} {voted > 1 ? 'repas votés' : 'repas voté'}</span>
            </p>
            <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
              {g.items.map(item => (
                <ResultCard key={item.id} item={item} dayLabel={g.label} myReaction={myReactionOf.get(item.id) ?? null} />
              ))}
            </div>
          </section>
        )
      })}

      {data.status === 'finalized' ? (
        <section className="space-y-3 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--kkb-teal)] text-white">
              <CheckCircle className="h-5 w-5" />
            </span>
            <div>
              <p className="font-dosis text-lg font-bold text-[var(--kkb-text-primary)]">Menu officiellement validé !</p>
              <p className="font-quicksand text-sm text-[var(--kkb-text-secondary)]">
                {data.planner_name ?? 'La planificatrice'} prépare la liste des courses pour le marché. Merci pour ta contribution conviviale !
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex w-full items-center justify-center gap-1.5 rounded-[var(--kkb-radius-pill)] border border-[var(--kkb-border)] bg-white py-2.5 text-sm font-quicksand font-bold text-[var(--kkb-teal)] hover:bg-[var(--kkb-teal-light)]"
          >
            Consulter le menu de la semaine <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => router.push(surveyUrl)}
          className="mx-auto flex items-center gap-1.5 rounded-[var(--kkb-radius-pill)] px-4 py-2 text-sm font-quicksand font-bold text-[var(--kkb-teal)] hover:bg-[var(--kkb-teal-light)]"
        >
          Revoir mes votes <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
