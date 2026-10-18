'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, CalendarPlus, Check, ChefHat, ChevronRight, Clock, CupSoda, Flame, Heart,
  Loader2, MoreHorizontal, Pencil, Printer, Quote, Salad, Trash2, Users,
} from 'lucide-react'
import { CategoryBadge } from '@/components/recipes/category-badge'
import { RecipeVisual } from '@/components/recipes/recipe-card'
import { DIFFICULTY_LABEL } from '@/components/recipes/difficulty'
import { AddToMenuSheet } from '@/components/recipes/add-to-menu-sheet'
import { ServingsControl, scaleQuantity } from '@/components/recipes/servings-control'
import { ShareActions } from '@/components/ui/share-actions'
import { RecipePrintSheet } from '@/components/recipes/recipe-print-sheet'
import { toast } from '@/lib/stores/toast-store'
import { formatDuration, type RecipeCategory } from '@/components/recipes/types'
import { RecipeDetailSkeleton } from '@/components/skeletons/page-skeletons'

interface Ingredient { id: string; name: string; quantity: number | null; unit: string | null; sort_order: number }
interface Step { id: string; step_number: number; description: string }

interface Recipe {
  id: string
  name: string
  description: string | null
  prep_time_min: number | null
  cook_time_min: number | null
  servings: number
  difficulty: 'facile' | 'moyen' | 'difficile' | null
  photo_url: string | null
  visibility: 'private' | 'circle' | 'community'
  is_owner: boolean
  is_favorited: boolean
  foyer_favorites: number
  foyer_size: number
  categories: RecipeCategory | null
  recipe_ingredients: Ingredient[]
  recipe_steps: Step[]
}

interface Suggestion { id: string; name: string; description: string | null; role: 'side' | 'drink' }

const VISIBILITY_TAG: Record<Recipe['visibility'], string> = { private: 'Ma recette', circle: 'Recette de famille', community: 'Recette de la communauté' }
const MENU_ITEM = 'flex w-full items-center gap-2.5 px-4 py-2.5 text-left font-quicksand text-sm text-[var(--kkb-profond)] hover:bg-[var(--kkb-creme)]'

export default function RecipeDetailPage() {
  return (
    <Suspense fallback={<RecipeDetailSkeleton />}>
      <RecipeDetail />
    </Suspense>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4">{children}</div>
}

function RecipeDetail() {
  const router = useRouter()
  const id     = useParams().id as string
  const openPlanOnLoad = useSearchParams().get('plan') === '1'

  const [recipe,      setRecipe]      = useState<Recipe | null>(null)
  const [error,       setError]       = useState<string | null>(null)
  const [servings,    setServings]    = useState(4)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [checked,     setChecked]     = useState<Set<string>>(new Set())
  const [stepsDone,   setStepsDone]   = useState<Set<string>>(new Set())
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [addOpen,     setAddOpen]     = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [favPop,      setFavPop]      = useState(0)
  const [tab,         setTab]         = useState<'ingredients' | 'steps'>('ingredients')
  const mobileMenuRef  = useRef<HTMLDivElement>(null)
  const desktopMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then(async r => {
        const data = await r.json()
        if (!r.ok) { setError(data?.error ?? 'Recette introuvable'); return }
        setRecipe(data)
        setServings(data.servings)
        if (openPlanOnLoad) setAddOpen(true)
      })
      .catch(() => setError('Impossible de charger la recette'))

    const fetchRole = (role: 'side' | 'drink') =>
      fetch(`/api/recipes/${id}/suggestions?role=${role}&limit=3`)
        .then(r => (r.ok ? r.json() : []))
        .then((list: Omit<Suggestion, 'role'>[]) => (Array.isArray(list) ? list.map(s => ({ ...s, role })) : []))
        .catch(() => [] as Suggestion[])
    void Promise.all([fetchRole('side'), fetchRole('drink')]).then(([sides, drinks]) => setSuggestions([...sides, ...drinks.slice(0, 1)]))
  }, [id, openPlanOnLoad])

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      const target = e.target as Node
      if (![mobileMenuRef, desktopMenuRef].some(r => r.current?.contains(target))) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  async function toggleFavorite() {
    setFavPop(n => n + 1)
    const res = await fetch(`/api/recipes/${id}/favorite`, { method: 'POST' }).catch(() => null)
    if (!res?.ok) { toast.error('Erreur de connexion'); return }
    const { is_favorited } = await res.json()
    if (is_favorited) toast.success('Recette ajoutée aux favoris')
    else toast.info('Recette retirée des favoris')
    setRecipe(prev => prev && {
      ...prev,
      is_favorited,
      foyer_favorites: Math.max(0, prev.foyer_favorites + (is_favorited === prev.is_favorited ? 0 : is_favorited ? 1 : -1)),
    })
  }

  async function deleteRecipe() {
    setDeleting(true)
    const res = await fetch(`/api/recipes/${id}`, { method: 'DELETE' })
    if (res.ok || res.status === 204) router.push('/recipes')
    else { setDeleting(false); setConfirmDelete(false) }
  }

  function toggleIngredient(ingId: string) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(ingId)) next.delete(ingId)
      else next.add(ingId)
      return next
    })
  }

  function toggleStep(stepId: string) {
    setStepsDone(prev => {
      const next = new Set(prev)
      if (next.has(stepId)) next.delete(stepId)
      else next.add(stepId)
      return next
    })
  }

  if (error) {
    return (
      <Centered>
        <p className="text-center text-sm font-quicksand text-[var(--kkb-danger)]">{error}</p>
        <button type="button" onClick={() => router.push('/recipes')} className="text-xs font-quicksand font-bold text-[var(--kkb-foret)] underline">Retour au carnet</button>
      </Centered>
    )
  }
  if (!recipe) return <RecipeDetailSkeleton />

  const totalTime  = (recipe.prep_time_min ?? 0) + (recipe.cook_time_min ?? 0)
  const allChecked = recipe.recipe_ingredients.length > 0 && checked.size === recipe.recipe_ingredients.length
  const shareUrl   = typeof window !== 'undefined' ? `${window.location.origin}/recipes/${recipe.id}` : ''
  const qtyOf      = (ing: Ingredient) => [scaleQuantity(ing.quantity, servings, recipe.servings), ing.unit].filter(Boolean).join(' ') || 'Q.S.'

  const optionsMenu = (
    <div className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-[var(--kkb-r-lg)] border border-[var(--kkb-filet)] bg-white py-1.5 shadow-[0_12px_32px_rgba(31,58,46,0.14)]">
      {recipe.is_owner && (
        <button type="button" onClick={() => router.push(`/recipes/${id}/edit`)} className={MENU_ITEM}>
          <Pencil className="h-4 w-4 text-[var(--kkb-foret)]" /> Modifier
        </button>
      )}
      {recipe.visibility !== 'private' && (
        <ShareActions
          getPayload={() => ({ title: `${recipe.name} — KeskonBouf`, text: `Découvre la recette « ${recipe.name} » sur KeskonBouf`, url: shareUrl })}
          className="flex flex-col"
          buttonClassName={`${MENU_ITEM} disabled:opacity-60`}
        />
      )}
      <button type="button" onClick={() => { setMenuOpen(false); setTimeout(() => window.print(), 50) }} className={MENU_ITEM}>
        <Printer className="h-4 w-4 text-[var(--kkb-foret)]" /> Imprimer la fiche
      </button>
      {recipe.is_owner && (
        <button type="button" onClick={() => { setMenuOpen(false); setConfirmDelete(true) }} className={`${MENU_ITEM} text-[var(--kkb-danger)] hover:bg-[var(--kkb-danger-light)]`}>
          <Trash2 className="h-4 w-4" /> Supprimer
        </button>
      )}
    </div>
  )

  const favoriteButton = (size: string) => (
    <button type="button" onClick={() => void toggleFavorite()} aria-label={recipe.is_favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'} aria-pressed={recipe.is_favorited}
      className={`flex shrink-0 items-center justify-center rounded-full transition-colors ${size} ${recipe.is_favorited ? 'bg-[var(--kkb-orange-50)]' : 'bg-[var(--kkb-creme)] hover:bg-[var(--kkb-foret-50)]'}`}>
      <Heart key={favPop} className={`h-5 w-5 ${favPop ? 'motion-safe:animate-kkb-react-pop' : ''} ${recipe.is_favorited ? 'fill-[var(--kkb-orange)] text-[var(--kkb-orange)]' : 'text-[var(--kkb-foret)]'}`} />
    </button>
  )

  // Titre et repères (catégorie, mot de la cuisine, temps, niveau, favoris).
  const heading = (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {recipe.categories && <CategoryBadge category={recipe.categories} />}
        <span className="rounded-full bg-[var(--kkb-foret-50)] px-2 py-0.5 font-quicksand text-xs font-bold text-[var(--kkb-foret)]">{VISIBILITY_TAG[recipe.visibility]}</span>
      </div>
      {/* Nom de la recette : l'accent Bricolage de l'écran */}
      <h1 className="font-main text-[28px] font-semibold leading-[1.1] text-[var(--kkb-foret)] lg:text-[36px]">{recipe.name}</h1>
      {recipe.description && (
        <p className="flex gap-2 pt-1 font-quicksand text-[15px] leading-relaxed text-[var(--kkb-texte-2)]">
          <Quote className="mt-1 h-4 w-4 shrink-0 text-[var(--kkb-jaune-700)]" aria-hidden="true" />
          {recipe.description}
        </p>
      )}
    </div>
  )

  const metaTiles = (
    <dl className="grid grid-cols-4 gap-2">
      {[
        { icon: Clock,    label: 'Préparation', value: formatDuration(recipe.prep_time_min) ?? '—' },
        { icon: Flame,    label: 'Cuisson',     value: formatDuration(recipe.cook_time_min) ?? '—' },
        { icon: Users,    label: 'Portions',    value: `${recipe.servings}` },
        { icon: ChefHat,  label: 'Niveau',      value: recipe.difficulty ? DIFFICULTY_LABEL[recipe.difficulty] : '—' },
      ].map(m => (
        <div key={m.label} className="flex min-w-0 flex-col items-center gap-1 rounded-[var(--kkb-r-lg)] bg-[var(--kkb-creme)] px-1 py-3 text-center">
          <m.icon className="h-4 w-4 text-[var(--kkb-foret-500)]" aria-hidden="true" />
          <dd className="w-full truncate font-dosis text-[15px] font-extrabold tabular-nums text-[var(--kkb-profond)]">{m.value}</dd>
          <dt className="font-quicksand text-[11px] text-[var(--kkb-texte-2)]">{m.label}</dt>
        </div>
      ))}
    </dl>
  )

  const foyerLine = recipe.foyer_favorites > 0 && (
    <p className="inline-flex items-center gap-1.5 font-quicksand text-sm text-[var(--kkb-texte-2)]">
      <Heart className="h-4 w-4 fill-[var(--kkb-orange)] text-[var(--kkb-orange)]" />
      <span>
        <span className="font-bold tabular-nums text-[var(--kkb-profond)]">{recipe.foyer_favorites}</span>
        {recipe.foyer_size > 0 && <> sur {recipe.foyer_size}</>} à la table l’adore{recipe.foyer_favorites > 1 ? 'nt' : ''}
      </span>
    </p>
  )

  const ingredientsDone = recipe.recipe_ingredients.filter(i => checked.has(i.id)).length
  const ingredients = (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-quicksand text-sm text-[var(--kkb-texte-2)]">
          {allChecked ? 'Tout est prêt, au fourneau !' : <><span className="font-bold tabular-nums text-[var(--kkb-profond)]">{ingredientsDone}</span> sur {recipe.recipe_ingredients.length} sous la main</>}
        </p>
        <ServingsControl value={servings} onChange={setServings} suffix="pers." />
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--kkb-lin)]" aria-hidden="true">
        <div className="h-full rounded-full bg-[var(--kkb-sauge)] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${(ingredientsDone / Math.max(1, recipe.recipe_ingredients.length)) * 100}%` }} />
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
        {recipe.recipe_ingredients.map(ing => {
          const done = checked.has(ing.id)
          return (
            <li key={ing.id}>
              <button type="button" onClick={() => toggleIngredient(ing.id)} aria-pressed={done}
                className={`flex min-h-[52px] w-full items-center gap-3 rounded-[var(--kkb-r-md)] px-3 py-2 text-left transition-colors ${done ? 'bg-[var(--kkb-sauge-50)]' : 'bg-[var(--kkb-creme)] hover:bg-[var(--kkb-foret-50)]'}`}>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${done ? 'border-[var(--kkb-foret-500)] bg-[var(--kkb-foret-500)] text-white' : 'border-[var(--kkb-filet)] bg-white'}`}>
                  {done && <Check className="h-3.5 w-3.5" />}
                </span>
                <span className={`min-w-0 flex-1 font-quicksand text-[15px] ${done ? 'text-[var(--kkb-texte-2)] line-through' : 'text-[var(--kkb-profond)]'}`}>{ing.name}</span>
                <span className="shrink-0 font-dosis text-[15px] font-extrabold tabular-nums text-[var(--kkb-foret)]">{qtyOf(ing)}</span>
              </button>
            </li>
          )
        })}
      </ul>
      {recipe.recipe_ingredients.length > 1 && (
        <button type="button" onClick={() => setChecked(allChecked ? new Set() : new Set(recipe.recipe_ingredients.map(i => i.id)))}
          className="font-quicksand text-xs font-bold text-[var(--kkb-foret)] hover:underline">
          {allChecked ? 'Tout décocher' : 'Tout cocher'}
        </button>
      )}
    </div>
  )

  // Étapes en frise : on coche au fil de la cuisine ; l'étape en cours ressort.
  const currentStep = recipe.recipe_steps.find(s => !stepsDone.has(s.id))?.id
  const steps = (
    <ol>
      {recipe.recipe_steps.map((step, i) => {
        const done = stepsDone.has(step.id)
        const now  = step.id === currentStep
        const last = i === recipe.recipe_steps.length - 1
        return (
          <li key={step.id} className="relative flex gap-3 pb-3 last:pb-0">
            {!last && <span aria-hidden="true" className={`absolute left-[19px] top-11 bottom-0 w-px ${done ? 'bg-[var(--kkb-sauge)]' : 'border-l border-dashed border-[var(--kkb-filet)]'}`} />}
            <button type="button" onClick={() => toggleStep(step.id)} aria-pressed={done} aria-label={`Étape ${step.step_number}${done ? ' faite' : ''}`}
              className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-dosis text-base font-extrabold transition-colors ${
                done ? 'bg-[var(--kkb-sauge)] text-[var(--kkb-profond)]' : now ? 'bg-[var(--kkb-foret)] text-[var(--kkb-creme)]' : 'bg-[var(--kkb-creme)] text-[var(--kkb-foret)]'
              }`}>
              {done ? <Check className="h-5 w-5" /> : step.step_number}
            </button>
            <div className={`min-w-0 flex-1 rounded-[var(--kkb-r-lg)] px-4 py-2.5 transition-colors ${now ? 'bg-[var(--kkb-foret-50)]' : ''}`}>
              {now && <p className="font-quicksand text-xs font-bold text-[var(--kkb-foret-500)]">En cours</p>}
              <p className={`font-quicksand text-[15px] leading-relaxed ${done ? 'text-[var(--kkb-texte-2)]' : 'text-[var(--kkb-profond)]'}`}>{step.description}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )

  const stepsMeta = `${recipe.recipe_steps.length} étape${recipe.recipe_steps.length > 1 ? 's' : ''}${totalTime ? ` · ${formatDuration(totalTime)}` : ''}`

  const suggestionsBlock = suggestions.length > 0 && (
    <section className="space-y-3" aria-labelledby="pairing-title">
      <h2 id="pairing-title" className="text-h3 text-[var(--kkb-profond)]">Pour l’accompagner</h2>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 hide-scrollbar lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0 xl:grid-cols-4">
        {suggestions.map(s => {
          const Icon = s.role === 'drink' ? CupSoda : Salad
          return (
            <button key={`${s.role}-${s.id}`} type="button" onClick={() => router.push(`/recipes/${s.id}`)}
              className="flex shrink-0 items-center gap-3 rounded-[var(--kkb-r-lg)] bg-white p-2 pr-4 text-left transition-shadow hover:shadow-[0_8px_20px_rgba(31,58,46,0.08)]">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--kkb-r-md)] ${s.role === 'drink' ? 'bg-[var(--kkb-sauge-50)] text-[var(--kkb-foret-500)]' : 'bg-[var(--kkb-jaune-50)] text-[var(--kkb-jaune-text)]'}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-quicksand text-sm font-bold text-[var(--kkb-profond)]">{s.name}</span>
                <span className="block font-quicksand text-xs text-[var(--kkb-texte-2)]">{s.role === 'drink' ? 'Boisson' : 'Accompagnement'}</span>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )

  const hasContent = recipe.recipe_ingredients.length > 0 || recipe.recipe_steps.length > 0

  return (
    <>
      <RecipePrintSheet
        name={recipe.name}
        categoryName={recipe.categories?.name ?? null}
        difficulty={recipe.difficulty}
        prepTime={recipe.prep_time_min}
        cookTime={recipe.cook_time_min}
        servings={servings}
        photoUrl={recipe.photo_url}
        description={recipe.description}
        ingredients={recipe.recipe_ingredients.map(i => ({ id: i.id, name: i.name, qty: qtyOf(i) }))}
        steps={recipe.recipe_steps}
        sides={suggestions.filter(s => s.role === 'side').map(s => s.name)}
        drinks={suggestions.filter(s => s.role === 'drink').map(s => s.name)}
      />

      <div className="print:hidden">
      {/* ── Mobile ─────────────────────────────────────────────────────── */}
      <div className="pb-8 lg:hidden">
        <div className="relative">
          <RecipeVisual recipe={recipe} className="h-[300px] w-full" iconClassName="h-16 w-16" />
          <div className="absolute inset-0 bg-gradient-to-b from-[rgba(31,58,46,0.35)] via-transparent to-transparent" />
          <button type="button" onClick={() => router.push('/recipes')} aria-label="Retour au carnet"
            className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[var(--kkb-foret)] backdrop-blur-sm">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div ref={mobileMenuRef} className="absolute right-4 top-4">
            <button type="button" onClick={() => setMenuOpen(o => !o)} aria-label="Options de la recette" aria-expanded={menuOpen} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[var(--kkb-foret)] backdrop-blur-sm">
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {menuOpen && optionsMenu}
          </div>
        </div>

        {/* Feuille de la recette, posée sur la photo */}
        <div className="relative z-10 -mt-8 space-y-6 rounded-t-[28px] bg-[var(--kkb-creme)] px-4 pt-3">
          <div className="mx-auto h-1 w-10 rounded-full bg-[var(--kkb-filet)]" aria-hidden="true" />
          <div className="space-y-3 px-1">
            {heading}
            {foyerLine}
          </div>
          <div className="rounded-[var(--kkb-r-xl)] bg-white p-2">{metaTiles}</div>

          {hasContent && (
            <section className="space-y-4">
              <div className="relative grid grid-cols-2 rounded-full bg-white p-1" role="tablist" aria-label="Contenu de la recette">
                <span aria-hidden="true" className="pointer-events-none absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-[var(--kkb-foret)] transition-transform duration-300 ease-[cubic-bezier(0.34,1.35,0.64,1)] motion-reduce:transition-none"
                  style={{ transform: tab === 'steps' ? 'translateX(100%)' : 'none' }} />
                {([['ingredients', 'Ingrédients', recipe.recipe_ingredients.length], ['steps', 'Préparation', recipe.recipe_steps.length]] as const).map(([v, label, n]) => (
                  <button key={v} type="button" role="tab" aria-selected={tab === v} onClick={() => setTab(v)}
                    className={`relative z-10 h-11 rounded-full font-quicksand text-sm font-bold transition-colors ${tab === v ? 'text-[var(--kkb-creme)]' : 'text-[var(--kkb-texte-2)]'}`}>
                    {label} <span className="tabular-nums opacity-70">{n}</span>
                  </button>
                ))}
              </div>
              <div className="rounded-[var(--kkb-r-xl)] bg-white p-4">
                {tab === 'ingredients' ? ingredients : steps}
              </div>
            </section>
          )}

          {suggestionsBlock}

          {/* Réserve la place de la barre d'action flottante */}
          <div className="h-16" aria-hidden="true" />
        </div>

        <div className="fixed inset-x-4 bottom-[var(--kkb-nav-offset)] z-30 mx-auto flex max-w-sm items-center gap-2 rounded-full bg-white p-1.5 shadow-[var(--kkb-shadow-sheet)]">
          {favoriteButton('h-12 w-12')}
          <button type="button" onClick={() => setAddOpen(true)}
            className="flex h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[var(--kkb-orange)] px-5 font-quicksand text-base font-bold text-white transition-transform active:scale-[0.98]">
            <CalendarPlus className="h-5 w-5" /> Ajouter au menu
          </button>
        </div>
      </div>

      {/* ── Desktop ────────────────────────────────────────────────────── */}
      <div className="hidden space-y-5 pb-8 lg:block">
        <nav className="flex items-center gap-2 font-quicksand text-sm text-[var(--kkb-texte-2)]" aria-label="Fil d'Ariane">
          <button type="button" onClick={() => router.push('/recipes')} aria-label="Retour au carnet"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--kkb-foret)] transition-colors hover:bg-[var(--kkb-foret-50)]">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => router.push('/recipes')} className="font-semibold hover:text-[var(--kkb-foret)]">Carnet de recettes</button>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="truncate font-bold text-[var(--kkb-profond)]">{recipe.name}</span>
        </nav>

        <div className="grid grid-cols-12 gap-5">
          {/* Photo */}
          <div className="relative col-span-7 min-h-[420px] overflow-hidden rounded-[var(--kkb-r-xl)]">
            <RecipeVisual recipe={recipe} className="h-full min-h-[420px] w-full" iconClassName="h-24 w-24" />
            {recipe.foyer_favorites > 0 && (
              <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 font-quicksand text-xs font-bold text-[var(--kkb-foret)] backdrop-blur-sm">
                <Heart className="h-3.5 w-3.5 fill-[var(--kkb-orange)] text-[var(--kkb-orange)]" /> Favori de {recipe.foyer_favorites} à la table
              </span>
            )}
          </div>

          {/* Fiche : titre, repères, actions */}
          <section className="col-span-5 flex flex-col rounded-[var(--kkb-r-xl)] bg-white p-7">
            {heading}
            <div className="mt-5">{metaTiles}</div>
            <div className="mt-auto flex items-center gap-2 pt-6">
              <button type="button" onClick={() => setAddOpen(true)}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[var(--kkb-orange)] font-quicksand text-[15px] font-bold text-white transition-colors hover:bg-[var(--kkb-orange-700)]">
                <CalendarPlus className="h-5 w-5" /> Ajouter au menu
              </button>
              {favoriteButton('h-12 w-12')}
              <div ref={desktopMenuRef} className="relative">
                <button type="button" onClick={() => setMenuOpen(o => !o)} aria-label="Options de la recette" aria-expanded={menuOpen}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--kkb-creme)] text-[var(--kkb-foret)] transition-colors hover:bg-[var(--kkb-foret-50)]">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
                {menuOpen && optionsMenu}
              </div>
            </div>
          </section>

          {/* Ingrédients */}
          {recipe.recipe_ingredients.length > 0 && (
            <section className="sticky top-24 col-span-5 self-start rounded-[var(--kkb-r-xl)] bg-white p-6" aria-labelledby="ing-title">
              <h2 id="ing-title" className="mb-4 flex items-baseline gap-2 text-h2 text-[var(--kkb-foret)]">
                Ingrédients <span className="font-quicksand text-sm font-semibold text-[var(--kkb-texte-2)]">{recipe.recipe_ingredients.length}</span>
              </h2>
              {ingredients}
            </section>
          )}

          {/* Préparation */}
          {recipe.recipe_steps.length > 0 && (
            <section className={`rounded-[var(--kkb-r-xl)] bg-white p-6 ${recipe.recipe_ingredients.length > 0 ? 'col-span-7' : 'col-span-12'}`} aria-labelledby="steps-title">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 id="steps-title" className="text-h2 text-[var(--kkb-foret)]">Préparation</h2>
                <span className="font-quicksand text-sm text-[var(--kkb-texte-2)]">{stepsMeta}</span>
              </div>
              {steps}
            </section>
          )}

          {suggestionsBlock && <div className="col-span-12">{suggestionsBlock}</div>}
        </div>
      </div>
      </div>

      <AddToMenuSheet recipeId={recipe.id} open={addOpen} onClose={() => setAddOpen(false)} />

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6 lg:items-center">
          <div role="alertdialog" aria-modal="true" className="w-full max-w-sm space-y-4 rounded-[var(--kkb-r-xl)] bg-white p-5 shadow-xl">
            <p className="text-h3 text-[var(--kkb-profond)]">Supprimer cette recette ?</p>
            <p className="font-quicksand text-sm text-[var(--kkb-texte-2)]">Cette action est irréversible. La recette sera définitivement supprimée.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setConfirmDelete(false)} className="h-11 flex-1 rounded-full border-[1.5px] border-[var(--kkb-filet)] font-quicksand text-sm font-bold text-[var(--kkb-foret)]">Annuler</button>
              <button type="button" onClick={() => void deleteRecipe()} disabled={deleting} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[var(--kkb-danger)] font-quicksand text-sm font-bold text-white disabled:opacity-60">
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />} Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
