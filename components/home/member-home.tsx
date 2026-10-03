'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BarChart3, Check, CheckCircle, ChefHat, Clock, Hand, Lock, UtensilsCrossed, Users, Vote } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton-card'
import { MealTypeIcon } from '@/components/ui/meal-type-icon'
import { composedName } from '@/lib/utils/composed-name'
import { MEAL_LABEL, MEAL_TYPE_ORDER, type MealType } from '@/lib/constants/meal-type'
import { DAY_OPTIONS, dayOfWeekFromDate, formatWeekRange, getMondayISO, type DayOfWeek } from '@/lib/utils/week'

type Rating = 'excellent' | 'correct' | 'decevant'

interface Item {
  id:                string
  meal_type:         MealType
  day_of_week:       DayOfWeek
  applies_all_days:  boolean
  recipes:           { name: string; photo_url: string | null; description: string | null; prep_time_min: number | null; cook_time_min: number | null } | null
  meal_compositions: { role: string; sort_order: number; recipes: { name: string } | null }[]
}

interface FamilyData {
  role:         'planificatrice' | 'membre' | null
  is_active:    boolean
  circle_name:  string | null
  planner_name: string | null
  meal_times:   Record<string, string>
  plan:         { id: string; week_start: string; status: string; share_token: string | null; meal_plan_items: Item[] } | null
}

interface VoteStatus {
  has_voted:         boolean
  total_respondents: number
  member_count:      number
  voter_names:       string[]
}

interface MyFeedback {
  id:         string
  rating:     Rating
  message:    string | null
  created_at: string
  item:       { meal_type: MealType; day_of_week: string; recipes: { name: string } | null; meal_compositions: Item['meal_compositions'] }
}

// Émojis de réaction en échappements unicode (cf. CLAUDE.md).
const RATING_EMOJI: Record<Rating, string> = {
  excellent: '\u{1F60A}',
  correct:   '\u{1F610}',
  decevant:  '\u{1F615}',
}

const MOMENT: Record<MealType, string> = {
  petit_dejeuner: 'Ce matin',
  dejeuner:       'Ce midi',
  gouter:         'Cet après-midi',
  diner:          'Ce soir',
}

function relativeDay(iso: string): string {
  const d = new Date(iso); d.setHours(0, 0, 0, 0)
  const t = new Date();    t.setHours(0, 0, 0, 0)
  const diff = Math.round((t.getTime() - d.getTime()) / 86_400_000)
  if (diff <= 0) return 'Aujourd\'hui'
  if (diff === 1) return 'Hier'
  return `Il y a ${diff} j`
}

function sides(item: Item): string[] {
  return [...item.meal_compositions].sort((a, b) => a.sort_order - b.sort_order).map(c => c.recipes?.name).filter((n): n is string => !!n)
}

// Accueil d'un membre (qui ne planifie pas) : vote de la semaine, repas du
// jour, menu de la semaine et ses derniers avis — le tout sur le menu de la
// planificatrice du cercle actif (lecture seule).
export function MemberHome({ firstName }: { firstName: string }) {
  const [data,     setData]     = useState<FamilyData | null>(null)
  const [vote,     setVote]     = useState<VoteStatus | null>(null)
  const [recent,   setRecent]   = useState<MyFeedback[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [fam, fb] = await Promise.all([
        fetch(`/api/meal-plans/family?week=${getMondayISO()}`).then(r => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/users/me/feedback?limit=3').then(r => (r.ok ? r.json() : [])).catch(() => []),
      ])
      if (cancelled) return
      setData(fam)
      setRecent(Array.isArray(fb) ? fb : [])
      if (fam?.plan?.share_token) {
        const v = await fetch(`/api/meal-plans/${fam.plan.id}/survey-results/member`).then(r => (r.ok ? r.json() : null)).catch(() => null)
        if (!cancelled) setVote(v)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4 lg:max-w-3xl lg:py-8" aria-busy="true">
        <SkeletonCard variant="list" />
        <SkeletonCard variant="recipe" />
        <SkeletonCard variant="list" />
      </div>
    )
  }

  const planner  = data?.planner_name ?? 'La cuisine'
  const plan     = data?.plan ?? null
  const today    = dayOfWeekFromDate(new Date())
  const todayIdx = DAY_OPTIONS.findIndex(d => d.val === today)

  const greeting = (
    <section className="space-y-1 pt-2">
      <h1 className="flex items-center gap-2 font-dosis text-2xl font-bold text-[var(--kkb-text-primary)]">
        Bonjour{firstName ? ` ${firstName}` : ''} <Hand className="h-6 w-6 text-[var(--kkb-coral)]" />
      </h1>
      <p className="flex items-center gap-1.5 font-quicksand text-sm text-[var(--kkb-text-secondary)]">
        <Users className="h-4 w-4 text-[var(--kkb-teal)]" />
        {data?.circle_name ?? 'Ma famille'}{plan ? ` · Semaine du ${formatWeekRange(plan.week_start)}` : ''}
      </p>
    </section>
  )

  // Accès désactivé : plus de menu ni de vote, l'historique reste.
  if (data?.role === 'membre' && !data.is_active) {
    return (
      <div className="mx-auto max-w-lg space-y-5 px-4 pb-32 lg:max-w-3xl lg:py-8">
        {greeting}
        <div className="rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white">
          <EmptyState
            icon={Lock}
            title="Ton accès au cercle est désactivé"
            description="Tu ne vois plus le menu ni les votes de ce cercle. Tes avis passés restent consultables."
            ctaLabel="Voir mes avis"
            ctaHref="/feedback"
            className="py-8"
          />
        </div>
      </div>
    )
  }

  const items = plan?.meal_plan_items ?? []
  const byMeal = (a: Item, b: Item) => MEAL_TYPE_ORDER[a.meal_type] - MEAL_TYPE_ORDER[b.meal_type]
  const todayItems = items.filter(i => i.applies_all_days || i.day_of_week === today).sort(byMeal)
  const hero = todayItems.find(i => i.meal_type === 'dejeuner') ?? todayItems.find(i => !i.applies_all_days) ?? todayItems[0] ?? null
  const otherToday = todayItems.filter(i => i.id !== hero?.id)

  // Plat principal de chaque jour (déjeuner, sinon dîner, sinon le premier).
  const week = DAY_OPTIONS.map((d, idx) => {
    const dayItems = items.filter(i => !i.applies_all_days && i.day_of_week === d.val).sort(byMeal)
    const main = dayItems.find(i => i.meal_type === 'dejeuner') ?? dayItems.find(i => i.meal_type === 'diner') ?? dayItems[0] ?? null
    return { ...d, idx, main }
  }).filter(d => d.main)

  const voteBanner = plan?.share_token && vote && (
    vote.has_voted ? (
      <Link
        href="/votes/results/member"
        className="flex items-center gap-3 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-teal)]/30 bg-[var(--kkb-teal-light)] p-4"
      >
        <CheckCircle className="h-6 w-6 shrink-0 text-[var(--kkb-teal)]" />
        <span className="min-w-0 flex-1">
          <span className="block font-dosis text-base font-bold text-[var(--kkb-text-primary)]">Merci, ton avis est transmis !</span>
          <span className="block font-quicksand text-xs text-[var(--kkb-text-secondary)]">
            {vote.total_respondents}/{Math.max(vote.member_count, 1)} membres ont voté · découvre l&apos;harmonie de la famille
          </span>
        </span>
        <BarChart3 className="h-5 w-5 shrink-0 text-[var(--kkb-teal)]" />
      </Link>
    ) : (
      <section className="space-y-3 rounded-[var(--kkb-radius-card)] bg-[var(--kkb-coral)] p-4 text-white shadow-[var(--kkb-shadow-fab)]">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
            <Vote className="h-5 w-5" />
          </span>
          <div>
            <p className="font-dosis text-lg font-bold leading-tight">{planner} attend ton avis sur le menu !</p>
            <p className="font-quicksand text-sm text-white/85">
              {items.length} repas à valider ensemble pour préparer les courses du marché.
            </p>
          </div>
        </div>
        <div className="space-y-1.5 rounded-[var(--kkb-radius-sm)] bg-white/15 p-3">
          <div className="flex items-center justify-between font-quicksand text-xs font-bold">
            <span>Participation du foyer</span>
            <span>{vote.total_respondents} / {Math.max(vote.member_count, 1)} ont voté</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${Math.min(100, Math.round((vote.total_respondents / Math.max(vote.member_count, 1)) * 100))}%` }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex -space-x-2">
            {vote.voter_names.slice(0, 4).map(n => (
              <span key={n} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--kkb-coral)] bg-white font-dosis text-xs font-bold text-[var(--kkb-coral)]">
                {n.charAt(0).toUpperCase()}
              </span>
            ))}
          </div>
          <Link
            href={`/s/${plan.share_token}`}
            className="inline-flex items-center gap-1.5 rounded-[var(--kkb-radius-pill)] bg-white px-4 py-2.5 font-quicksand text-sm font-bold text-[var(--kkb-coral)]"
          >
            Voter maintenant <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    )
  )

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 pb-32 lg:max-w-3xl lg:py-8">
      {greeting}

      {!plan ? (
        <div className="rounded-[var(--kkb-radius-card)] border border-dashed border-[var(--kkb-border)] bg-white">
          <EmptyState
            icon={UtensilsCrossed}
            title="Le menu de la semaine se prépare"
            description={`${planner} n'a pas encore publié le menu. Tu pourras voter dès qu'il sera partagé.`}
            className="py-8"
          />
        </div>
      ) : (
        <>
          {voteBanner}

          {/* Au programme aujourd'hui */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 font-quicksand text-[11px] font-bold uppercase tracking-wider text-[var(--kkb-teal)]">
                <UtensilsCrossed className="h-3.5 w-3.5" /> Au programme aujourd&apos;hui
              </p>
              <span className="font-quicksand text-xs text-[var(--kkb-text-tertiary)]">
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>

            {hero ? (
              <article className="overflow-hidden rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white shadow-[var(--kkb-shadow-card)]">
                <div className="relative h-48 bg-gradient-to-br from-[var(--kkb-coral)] to-[var(--kkb-teal)] lg:h-64">
                  {hero.recipes?.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={hero.recipes.photo_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-[var(--kkb-radius-pill)] bg-white/90 px-2.5 py-1 font-quicksand text-[11px] font-bold uppercase text-[var(--kkb-coral)]">
                    <MealTypeIcon type={hero.meal_type} className="h-3.5 w-3.5" />
                    {MOMENT[hero.meal_type]}{data?.meal_times[hero.meal_type] ? ` · ${data.meal_times[hero.meal_type].replace(':', 'h')}` : ''}
                  </span>
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-quicksand text-xs font-semibold text-white">
                      <ChefHat className="h-4 w-4" /> Préparé avec amour par {planner}
                    </span>
                    {(hero.recipes?.prep_time_min || hero.recipes?.cook_time_min) && (
                      <span className="inline-flex items-center gap-1 rounded-[var(--kkb-radius-pill)] bg-black/40 px-2 py-0.5 font-quicksand text-[11px] font-bold text-white">
                        <Clock className="h-3 w-3" /> {(hero.recipes?.prep_time_min ?? 0) + (hero.recipes?.cook_time_min ?? 0)} min
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-3 p-4">
                  <h2 className="font-dosis text-xl font-bold text-[var(--kkb-text-primary)]">{hero.recipes?.name ?? composedName(null, hero.meal_compositions)}</h2>
                  {hero.recipes?.description && (
                    <p className="line-clamp-2 font-quicksand text-sm text-[var(--kkb-text-secondary)]">{hero.recipes.description}</p>
                  )}
                  {sides(hero).length > 0 && (
                    <div className="space-y-1.5 rounded-[var(--kkb-radius-sm)] bg-[var(--kkb-bg)] p-3">
                      <p className="font-quicksand text-[10px] font-bold uppercase tracking-wider text-[var(--kkb-text-tertiary)]">Accompagnements</p>
                      <div className="flex flex-wrap gap-1.5">
                        {sides(hero).map(n => (
                          <span key={n} className="rounded-[var(--kkb-radius-pill)] border border-[var(--kkb-border)] bg-white px-2.5 py-1 font-quicksand text-xs font-semibold text-[var(--kkb-text-secondary)]">{n}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {otherToday.length > 0 && (
                    <ul className="space-y-1.5 border-t border-[var(--kkb-border-light)] pt-3">
                      {otherToday.map(i => (
                        <li key={i.id} className="flex items-center gap-2 font-quicksand text-sm text-[var(--kkb-text-secondary)]">
                          <MealTypeIcon type={i.meal_type} className="h-4 w-4 shrink-0 text-[var(--kkb-coral)]" />
                          <span className="font-semibold text-[var(--kkb-text-primary)]">{MEAL_LABEL[i.meal_type]}</span>
                          <span className="truncate">{composedName(i.recipes?.name, i.meal_compositions)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            ) : (
              <p className="rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-4 font-quicksand text-sm italic text-[var(--kkb-text-tertiary)]">
                Pas de repas prévu aujourd&apos;hui.
              </p>
            )}
          </section>

          {/* Au menu cette semaine */}
          {week.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-dosis text-lg font-bold text-[var(--kkb-text-primary)]">Au menu cette semaine</h2>
              <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 hide-scrollbar">
                {week.map(d => {
                  const isToday = d.val === today
                  const isPast  = todayIdx >= 0 && d.idx < todayIdx
                  return (
                    <div
                      key={d.val}
                      className={`w-36 shrink-0 rounded-[var(--kkb-radius-card)] border bg-white p-3 ${
                        isToday ? 'border-2 border-[var(--kkb-coral)] bg-[var(--kkb-coral-light)]' : 'border-[var(--kkb-border)]'
                      } ${isPast ? 'opacity-60' : ''}`}
                    >
                      <p className="flex items-center justify-between font-quicksand text-[11px] font-bold uppercase text-[var(--kkb-text-tertiary)]">
                        <span className={isToday ? 'text-[var(--kkb-coral)]' : ''}>{d.label}{isToday ? ' · Auj.' : ''}</span>
                        {isPast && <Check className="h-3.5 w-3.5 text-[var(--kkb-success)]" />}
                      </p>
                      <p className="mt-2 line-clamp-2 font-dosis text-sm font-semibold text-[var(--kkb-text-primary)]">
                        {composedName(d.main!.recipes?.name, d.main!.meal_compositions)}
                      </p>
                      <p className="mt-1 font-quicksand text-[11px] text-[var(--kkb-text-tertiary)]">{MEAL_LABEL[d.main!.meal_type]}</p>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}

      {/* Mes retours récents */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-dosis text-lg font-bold text-[var(--kkb-text-primary)]">Mes retours récents</h2>
          <Link href="/feedback" className="font-quicksand text-xs font-bold text-[var(--kkb-coral)]">Donner mon avis</Link>
        </div>
        {recent.length === 0 ? (
          <p className="rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-4 font-quicksand text-sm italic text-[var(--kkb-text-tertiary)]">
            Tes avis sur les repas apparaîtront ici.
          </p>
        ) : (
          <>
            {recent.map(f => (
              <div key={f.id} className="flex gap-3 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--kkb-coral-light)] text-xl leading-none">{RATING_EMOJI[f.rating]}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center justify-between gap-2">
                    <span className="truncate font-quicksand text-sm font-bold text-[var(--kkb-text-primary)]">
                      {MEAL_LABEL[f.item.meal_type]} · {composedName(f.item.recipes?.name, f.item.meal_compositions)}
                    </span>
                    <span className="shrink-0 font-quicksand text-[11px] text-[var(--kkb-text-tertiary)]">{relativeDay(f.created_at)}</span>
                  </p>
                  {f.message && <p className="mt-1 rounded-[var(--kkb-radius-sm)] bg-[var(--kkb-bg)] px-2.5 py-1.5 font-quicksand text-xs italic text-[var(--kkb-text-secondary)]">&ldquo;{f.message}&rdquo;</p>}
                </div>
              </div>
            ))}
            <Link href="/feedback" className="flex items-center justify-center gap-1.5 font-quicksand text-sm font-bold text-[var(--kkb-teal)]">
              Voir l&apos;historique de tous mes avis <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        )}
      </section>
    </div>
  )
}
