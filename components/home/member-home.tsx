'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BarChart3, Check, CheckCircle, ChefHat, Clock, Lock, UtensilsCrossed, Users, Vote } from 'lucide-react'
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
  const weekRef = useRef<HTMLDivElement>(null)

  // La semaine défile jusqu'au jour courant : les jours passés restent à gauche.
  useEffect(() => {
    const el = weekRef.current?.querySelector<HTMLElement>('[data-today]')
    if (el && weekRef.current) weekRef.current.scrollLeft = el.offsetLeft - 16
  }, [loading])

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
    <section className="pt-3">
      <p className="font-quicksand text-[15px] font-medium text-[var(--kkb-texte-2)]">
        Bonjour{firstName ? `, ${firstName}` : ''}
      </p>
      <h1 className="mt-0.5 text-h1 text-[var(--kkb-foret)]">On mange quoi<br />aujourd’hui&nbsp;?</h1>
      <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-quicksand text-xs font-semibold text-[var(--kkb-foret)]">
        <Users className="h-3.5 w-3.5" />
        {data?.circle_name ?? 'Ma table'}{plan ? ` · semaine du ${formatWeekRange(plan.week_start)}` : ''}
      </p>
    </section>
  )

  // Accès désactivé : plus de menu ni de vote, l'historique reste.
  if (data?.role === 'membre' && !data.is_active) {
    return (
      <div className="mx-auto max-w-sm space-y-6 px-4 pb-8 lg:max-w-3xl lg:py-8">
        {greeting}
        <div className="rounded-[var(--kkb-radius-card)] border border-[var(--kkb-lin)] bg-white">
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
        className="flex items-center gap-3 rounded-[var(--kkb-r-xl)] bg-[var(--kkb-sauge-50)] p-4 active:scale-[0.99] transition-transform"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[var(--kkb-foret)]">
          <CheckCircle className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-dosis text-base font-bold text-[var(--kkb-profond)]">Merci, ton avis est transmis</span>
          <span className="block font-quicksand text-sm text-[var(--kkb-texte-2)]">
            <span className="tabular-nums">{vote.total_respondents}/{Math.max(vote.member_count, 1)}</span> ont voté · voir l’avis de la table
          </span>
        </span>
        <BarChart3 className="h-5 w-5 shrink-0 text-[var(--kkb-foret)]" />
      </Link>
    ) : (
      <section className="space-y-4 rounded-[var(--kkb-r-xl)] bg-[var(--kkb-orange)] p-5 text-white">
        <div>
          <p className="font-dosis text-[20px] font-extrabold leading-6">{planner} attend ton avis</p>
          <p className="mt-1 font-quicksand text-sm text-white/90">
            {items.length} repas à décider ensemble cette semaine.
          </p>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between font-quicksand text-xs font-bold">
            <span>Participation de la table</span>
            <span className="tabular-nums">{vote.total_respondents}/{Math.max(vote.member_count, 1)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-[var(--kkb-creme)]"
              style={{ width: `${Math.min(100, Math.round((vote.total_respondents / Math.max(vote.member_count, 1)) * 100))}%` }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex -space-x-2">
            {vote.voter_names.slice(0, 4).map(n => (
              <span key={n} className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--kkb-orange)] bg-[var(--kkb-creme)] font-dosis text-xs font-bold text-[var(--kkb-orange-700)]">
                {n.charAt(0).toUpperCase()}
              </span>
            ))}
          </div>
          <Link
            href={`/s/${plan.share_token}`}
            className="inline-flex h-12 items-center gap-1.5 rounded-full bg-[var(--kkb-creme)] px-5 font-quicksand text-[15px] font-bold text-[var(--kkb-orange-700)] active:scale-95 transition-transform"
          >
            <Vote className="h-4 w-4" /> Voter
          </Link>
        </div>
      </section>
    )
  )

  return (
    <div className="mx-auto max-w-sm space-y-7 px-4 pb-8 lg:max-w-3xl lg:py-8">
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
            <div className="flex items-baseline justify-between gap-2 px-1">
              <h2 className="text-h2 text-[var(--kkb-profond)]">Au menu</h2>
              <span className="inline-block font-quicksand text-sm font-semibold text-[var(--kkb-texte-2)] first-letter:uppercase">
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>

            {hero ? (
              <article className="overflow-hidden rounded-[var(--kkb-r-xl)] bg-white">
                <div className="relative m-1.5 aspect-[5/4] overflow-hidden rounded-[var(--kkb-r-lg)] bg-[var(--kkb-orange-50)] lg:aspect-[16/7]">
                  {hero.recipes?.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={hero.recipes.photo_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <MealTypeIcon type={hero.meal_type} className="h-14 w-14 text-[var(--kkb-orange-300)]" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[rgba(31,58,46,0.85)] via-[rgba(31,58,46,0.35)] to-transparent" />
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 font-quicksand text-xs font-bold text-[var(--kkb-foret)] backdrop-blur-sm">
                    <MealTypeIcon type={hero.meal_type} className="h-3.5 w-3.5" />
                    {MOMENT[hero.meal_type]}{data?.meal_times[hero.meal_type] ? ` · ${data.meal_times[hero.meal_type].replace(':', 'h')}` : ''}
                  </span>
                  <div className="absolute inset-x-4 bottom-4 text-[var(--kkb-creme)]">
                    <h2 className="font-dosis text-[22px] font-extrabold leading-[26px]">{hero.recipes?.name ?? composedName(null, hero.meal_compositions)}</h2>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-quicksand text-sm font-medium text-white/90">
                      <span className="inline-flex items-center gap-1.5"><ChefHat className="h-4 w-4" /> Par {planner}</span>
                      {(hero.recipes?.prep_time_min || hero.recipes?.cook_time_min) && (
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Clock className="h-3.5 w-3.5" /> {(hero.recipes?.prep_time_min ?? 0) + (hero.recipes?.cook_time_min ?? 0)} min
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="space-y-3 px-4 pb-4 pt-2.5">
                  {hero.recipes?.description && (
                    <p className="line-clamp-2 font-quicksand text-sm text-[var(--kkb-texte-2)]">{hero.recipes.description}</p>
                  )}
                  {sides(hero).length > 0 && (
                    <div className="flex flex-wrap gap-1.5" aria-label="Accompagnements">
                      {sides(hero).map(n => (
                        <span key={n} className="inline-flex h-8 items-center rounded-full bg-[var(--kkb-lin)] px-3 font-quicksand text-[13px] font-semibold text-[var(--kkb-profond)]">{n}</span>
                      ))}
                    </div>
                  )}
                  {otherToday.length > 0 && (
                    <ul className="divide-y divide-[var(--kkb-lin)] border-t border-[var(--kkb-lin)]">
                      {otherToday.map(i => (
                        <li key={i.id} className="flex items-center gap-3 py-2.5">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--kkb-creme)] text-[var(--kkb-foret)]">
                            <MealTypeIcon type={i.meal_type} className="h-4 w-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block font-quicksand text-xs font-semibold text-[var(--kkb-texte-2)]">{MEAL_LABEL[i.meal_type]}</span>
                            <span className="block truncate font-quicksand text-sm font-bold text-[var(--kkb-profond)]">{composedName(i.recipes?.name, i.meal_compositions)}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            ) : (
              <p className="rounded-[var(--kkb-r-xl)] bg-white p-5 font-quicksand text-sm text-[var(--kkb-texte-2)]">
                Pas de repas prévu aujourd’hui.
              </p>
            )}
          </section>

          {/* Au menu cette semaine */}
          {week.length > 0 && (
            <section className="space-y-3">
              <h2 className="px-1 text-h2 text-[var(--kkb-profond)]">Cette semaine</h2>
              <div ref={weekRef} className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1 hide-scrollbar">
                {week.map(d => {
                  const isToday = d.val === today
                  const isPast  = todayIdx >= 0 && d.idx < todayIdx
                  return (
                    <div
                      key={d.val}
                      data-today={isToday || undefined}
                      className={`w-36 shrink-0 snap-start rounded-[var(--kkb-r-xl)] p-3.5 ${
                        isToday ? 'bg-[var(--kkb-foret)] text-[var(--kkb-creme)]' : 'bg-white'
                      } ${isPast ? 'opacity-60' : ''}`}
                    >
                      <p className={`flex items-center justify-between font-quicksand text-xs font-bold ${isToday ? 'text-[var(--kkb-jaune)]' : 'text-[var(--kkb-texte-2)]'}`}>
                        <span>{isToday ? 'Aujourd’hui' : d.full}</span>
                        {isPast && <Check className="h-3.5 w-3.5 text-[var(--kkb-success)]" aria-label="Passé" />}
                      </p>
                      <p className={`mt-2 line-clamp-2 font-dosis text-[15px] font-bold leading-5 ${isToday ? '' : 'text-[var(--kkb-profond)]'}`}>
                        {composedName(d.main!.recipes?.name, d.main!.meal_compositions)}
                      </p>
                      <p className={`mt-1 font-quicksand text-xs ${isToday ? 'text-white/80' : 'text-[var(--kkb-texte-2)]'}`}>{MEAL_LABEL[d.main!.meal_type]}</p>
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
        <div className="flex items-center justify-between px-1">
          <h2 className="text-h2 text-[var(--kkb-profond)]">Mes avis</h2>
          <Link href="/feedback" className="-mr-2 inline-flex h-11 items-center gap-0.5 px-2 font-quicksand text-sm font-bold text-[var(--kkb-foret)]">
            Donner mon avis <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="rounded-[var(--kkb-r-xl)] bg-white p-5 font-quicksand text-sm text-[var(--kkb-texte-2)]">
            Tes avis sur les repas apparaîtront ici.
          </p>
        ) : (
          <div className="overflow-hidden rounded-[var(--kkb-r-xl)] bg-white">
            <ul className="divide-y divide-[var(--kkb-lin)]">
              {recent.map(f => (
                <li key={f.id} className="flex gap-3 p-3.5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--kkb-creme)] text-xl leading-none">{RATING_EMOJI[f.rating]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center justify-between gap-2">
                      <span className="truncate font-quicksand text-sm font-bold text-[var(--kkb-profond)]">
                        {composedName(f.item.recipes?.name, f.item.meal_compositions)}
                      </span>
                      <span className="shrink-0 font-quicksand text-xs text-[var(--kkb-texte-2)]">{relativeDay(f.created_at)}</span>
                    </p>
                    <p className="font-quicksand text-xs text-[var(--kkb-texte-2)]">{MEAL_LABEL[f.item.meal_type]}</p>
                    {f.message && <p className="mt-1.5 font-quicksand text-[13px] italic text-[var(--kkb-texte-2)]">« {f.message} »</p>}
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/feedback" className="flex h-12 items-center justify-center gap-1.5 border-t border-[var(--kkb-lin)] font-quicksand text-sm font-bold text-[var(--kkb-foret)]">
              Tout l’historique <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
