import { notFound } from 'next/navigation'
import { Clock, Utensils } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/service'
import { SurveySection } from './_survey-section'
import { composedName } from '@/lib/utils/composed-name'
import type { Metadata } from 'next'

// ─── Types ────────────────────────────────────────────────────────────────────

type MealType  = 'petit_dejeuner' | 'dejeuner' | 'gouter' | 'diner'
type DayOfWeek = 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche'

interface PublicRecipe {
  name:          string
  prep_time_min: number | null
  categories:    { icon: string | null } | null
}

interface PublicComposition {
  role:       string
  sort_order: number
  recipes:    { name: string } | null
}

interface PublicItem {
  id:                string
  day_of_week:       DayOfWeek
  meal_type:         MealType
  applies_all_days:  boolean
  recipes:           PublicRecipe | null
  meal_compositions: PublicComposition[]
}

interface PublicPlan {
  id:              string
  week_start:      string
  meal_plan_items: PublicItem[]
}

// ─── Constantes ───────────────────────────────────────────────────────────────

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

const DAY_OPTIONS: { val: DayOfWeek; full: string }[] = [
  { val: 'lundi',    full: 'Lundi'    },
  { val: 'mardi',    full: 'Mardi'    },
  { val: 'mercredi', full: 'Mercredi' },
  { val: 'jeudi',    full: 'Jeudi'    },
  { val: 'vendredi', full: 'Vendredi' },
  { val: 'samedi',   full: 'Samedi'   },
  { val: 'dimanche', full: 'Dimanche' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00')
  const end   = new Date(start)
  end.setDate(start.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  return `Du ${fmt(start)} au ${fmt(end)}`
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: { token: string } }
): Promise<Metadata> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('meal_plans')
    .select('week_start')
    .eq('share_token', params.token)
    .gt('token_expires_at', new Date().toISOString())
    .maybeSingle()

  if (!data) return { title: 'Menu partagé — MenuFamille' }

  return {
    title: `Menu ${formatWeekRange(data.week_start)} — MenuFamille`,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SharedMenuPage({ params }: { params: { token: string } }) {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('meal_plans')
    .select(`
      id, week_start, token_expires_at,
      meal_plan_items (
        id, day_of_week, meal_type, applies_all_days,
        recipes ( name, prep_time_min, categories ( icon ) ),
        meal_compositions ( role, sort_order, recipes ( name ) )
      )
    `)
    .eq('share_token', params.token)
    .maybeSingle()

  if (!data) notFound()

  if (data.token_expires_at && new Date(data.token_expires_at) <= new Date()) {
    return <ExpiredLinkPage />
  }

  const plan = data as unknown as PublicPlan

  // Grouper les items par meal_type
  const byMealType = new Map<MealType, PublicItem[]>()
  for (const item of plan.meal_plan_items) {
    const list = byMealType.get(item.meal_type) ?? []
    list.push(item)
    byMealType.set(item.meal_type, list)
  }

  const activeMealTypes = MEAL_ORDER.filter(mt => byMealType.has(mt))

  return (
    <div className="min-h-screen bg-[#FDF6EE]">
      {/* Header minimal */}
      <header className="bg-white border-b border-[#EDE4D6] px-4 py-3 flex items-center gap-2">
        <span className="text-xl">🥘</span>
        <span className="font-dosis font-bold text-base text-[var(--mf-primary)]">MenuFamille</span>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Titre semaine */}
        <div>
          <p className="text-[11px] font-quicksand font-bold uppercase tracking-wider text-[var(--mf-text-tertiary)] mb-0.5">
            Menu partagé
          </p>
          <h1 className="font-dosis font-bold text-xl text-[#3D2C20]">
            {formatWeekRange(plan.week_start)}
          </h1>
        </div>

        {/* Sections par type de repas */}
        {activeMealTypes.map(mealType => {
          const items = byMealType.get(mealType)!
          const templateItem = items.find(i => i.applies_all_days) ?? null
          const dailyItems   = items.filter(i => !i.applies_all_days)
          const isTemplate   = !!templateItem

          return (
            <section key={mealType}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{MEAL_EMOJI[mealType]}</span>
                <h2 className="font-dosis font-semibold text-base text-[#3D2C20]">
                  {MEAL_LABEL[mealType]}
                </h2>
                {isTemplate && (
                  <span className="text-[10px] font-quicksand font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#FDF0DC] text-[var(--mf-gold-text)]">
                    Modèle semaine
                  </span>
                )}
              </div>

              <div className="bg-white border border-[#EDE4D6] rounded-xl overflow-hidden">
                {isTemplate ? (
                  <SharedRecipeRow
                    recipe={templateItem!.recipes}
                    label="Toute la semaine"
                    displayName={composedName(templateItem!.recipes?.name, templateItem!.meal_compositions)}
                  />
                ) : (
                  DAY_OPTIONS.map(d => {
                    const item = dailyItems.find(i => i.day_of_week === d.val) ?? null
                    return (
                      <SharedRecipeRow
                        key={d.val}
                        recipe={item?.recipes ?? null}
                        label={d.full}
                        displayName={item ? composedName(item.recipes?.name, item.meal_compositions) : undefined}
                      />
                    )
                  })
                )}
              </div>
            </section>
          )
        })}

        {activeMealTypes.length === 0 && (
          <p className="text-sm font-quicksand text-[var(--mf-text-tertiary)] text-center py-8">
            Ce menu ne contient aucun repas planifié.
          </p>
        )}

        {/* Séparateur */}
        <hr className="border-[#EDE4D6]" />

        {/* Section sondage */}
        <SurveySection
          token={params.token}
          items={plan.meal_plan_items.map(i => ({
            id:               i.id,
            meal_type:        i.meal_type,
            day_of_week:      i.day_of_week,
            applies_all_days: i.applies_all_days,
            recipe_name:      i.recipes ? composedName(i.recipes.name, i.meal_compositions) : null,
          }))}
        />

        {/* Footer CTA */}
        <div className="pt-4 border-t border-[#EDE4D6] text-center space-y-1">
          <p className="text-xs font-quicksand text-[var(--mf-text-tertiary)]">
            Planifiez vos menus familiaux avec MenuFamille
          </p>
        </div>
      </main>
    </div>
  )
}

// ─── Lien expiré ──────────────────────────────────────────────────────────────

function ExpiredLinkPage() {
  return (
    <div className="min-h-screen bg-[#FDF6EE] flex items-center justify-center px-6">
      <div className="text-center space-y-3 max-w-xs">
        <div className="w-12 h-12 rounded-full bg-[#FDF0DC] flex items-center justify-center mx-auto">
          <Clock className="h-6 w-6 text-[var(--mf-gold-text)]" />
        </div>
        <h1 className="font-dosis font-bold text-lg text-[#3D2C20]">
          Ce lien a expiré
        </h1>
        <p className="text-sm font-quicksand text-[var(--mf-text-tertiary)]">
          Demandez à la personne qui a partagé ce menu de vous envoyer un nouveau lien.
        </p>
      </div>
    </div>
  )
}

// ─── Sous-composant : ligne recette ──────────────────────────────────────────

function SharedRecipeRow({
  recipe,
  label,
  displayName,
}: {
  recipe:       PublicRecipe | null
  label:        string
  displayName?: string
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 border-b border-[#EDE4D6]/50 last:border-0">
      <p className="w-20 text-[10px] font-quicksand font-semibold text-[var(--mf-text-tertiary)] flex-shrink-0">
        {label}
      </p>
      {recipe ? (
        <>
          <span className="text-base flex-shrink-0">
            {recipe.categories?.icon ?? '🍴'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-quicksand font-medium text-[#3D2C20] truncate">
              {displayName ?? recipe.name}
            </p>
            {recipe.prep_time_min && (
              <div className="flex items-center gap-0.5 mt-0.5">
                <Clock className="h-2.5 w-2.5 text-[var(--mf-text-tertiary)]" />
                <span className="text-[10px] font-quicksand text-[#6B5D54]">
                  {recipe.prep_time_min} min
                </span>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2 flex-1">
          <Utensils className="h-3.5 w-3.5 text-[var(--mf-text-tertiary)] flex-shrink-0" />
          <p className="text-xs font-quicksand text-[var(--mf-text-tertiary)] italic">Non planifié</p>
        </div>
      )}
    </div>
  )
}
