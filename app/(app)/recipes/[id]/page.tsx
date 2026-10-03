'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, BookHeart, CalendarPlus, Check, ChefHat, ChevronRight, Clock, CupSoda, Heart,
  Loader2, Menu, Pencil, PlusCircle, Printer, Salad, Smile, Timer, Trash2, Users,
} from 'lucide-react'
import { categoryIcon } from '@/lib/constants/category-icon'
import { CategoryBadge } from '@/components/recipes/category-badge'
import { AddToMenuSheet } from '@/components/recipes/add-to-menu-sheet'
import { ServingsControl, scaleQuantity } from '@/components/recipes/servings-control'
import { ShareActions } from '@/components/ui/share-actions'
import { formatDuration, type RecipeCategory } from '@/components/recipes/types'

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

const DIFFICULTY_SHORT: Record<string, string> = { facile: 'Facile', moyen: 'Moyen', difficile: 'Difficile' }
const DIFFICULTY_LONG: Record<string, string>  = { facile: 'Accessible à tous', moyen: 'Intermédiaire', difficile: 'Pour cordon-bleu' }
const VISIBILITY_TAG: Record<Recipe['visibility'], string> = { private: 'Ma recette', circle: 'Recette de famille', community: 'Recette de la communauté' }

export default function RecipeDetailPage() {
  return (
    <Suspense fallback={<Centered><Loader2 className="h-6 w-6 animate-spin text-[var(--kkb-coral)]" /></Centered>}>
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
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [addOpen,     setAddOpen]     = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting,    setDeleting]    = useState(false)
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
    const res = await fetch(`/api/recipes/${id}/favorite`, { method: 'POST' })
    if (!res.ok) return
    const { is_favorited } = await res.json()
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

  if (error) {
    return (
      <Centered>
        <p className="text-center text-sm font-quicksand text-[var(--kkb-danger)]">{error}</p>
        <button type="button" onClick={() => router.push('/recipes')} className="text-xs font-quicksand font-bold text-[var(--kkb-coral)] underline">Retour au carnet</button>
      </Centered>
    )
  }
  if (!recipe) return <Centered><Loader2 className="h-6 w-6 animate-spin text-[var(--kkb-coral)]" /></Centered>

  const totalTime  = (recipe.prep_time_min ?? 0) + (recipe.cook_time_min ?? 0)
  const CatIcon    = categoryIcon(recipe.categories?.slug)
  const allChecked = recipe.recipe_ingredients.length > 0 && checked.size === recipe.recipe_ingredients.length
  const shareUrl   = typeof window !== 'undefined' ? `${window.location.origin}/recipes/${recipe.id}` : ''
  const qtyOf      = (ing: Ingredient) => [scaleQuantity(ing.quantity, servings, recipe.servings), ing.unit].filter(Boolean).join(' ') || 'Q.S.'

  const visual = (className: string, iconSize: string) => (
    <div className={`relative overflow-hidden bg-[linear-gradient(135deg,var(--kkb-coral),var(--kkb-coral-hover))] ${className}`}>
      {recipe.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={recipe.photo_url} alt={recipe.name} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center"><CatIcon className={`${iconSize} text-white/90`} aria-hidden="true" /></div>
      )}
    </div>
  )

  const optionsMenu = (
    <div className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-[var(--kkb-radius-sm)] border border-[var(--kkb-border)] bg-white py-1 shadow-lg">
      {recipe.is_owner && (
        <button type="button" onClick={() => router.push(`/recipes/${id}/edit`)} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-quicksand text-[var(--kkb-text-primary)] hover:bg-[var(--kkb-bg)]">
          <Pencil className="h-4 w-4 text-[var(--kkb-coral)]" /> Modifier
        </button>
      )}
      {recipe.visibility !== 'private' && (
        <ShareActions
          getPayload={() => ({ title: `${recipe.name} — KeskonBouf`, text: `Découvre la recette « ${recipe.name} » sur KeskonBouf`, url: shareUrl })}
          className="flex flex-col"
          buttonClassName="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-quicksand text-[var(--kkb-text-primary)] hover:bg-[var(--kkb-bg)] disabled:opacity-60"
        />
      )}
      {recipe.is_owner && (
        <button type="button" onClick={() => { setMenuOpen(false); setConfirmDelete(true) }} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-quicksand text-[var(--kkb-danger)] hover:bg-[var(--kkb-danger-light)]">
          <Trash2 className="h-4 w-4" /> Supprimer
        </button>
      )}
    </div>
  )
  const hasMenuItems = recipe.is_owner || recipe.visibility !== 'private'

  const tipCard = recipe.description && (
    <section className="space-y-2 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-warning)] bg-[var(--kkb-warning-light)] p-4 lg:p-5">
      <p className="flex items-center gap-2 text-[10px] font-quicksand font-bold uppercase tracking-wider text-[#B07A12]">
        <BookHeart className="h-4 w-4" /> Astuces de Maman · Transmission
      </p>
      <p className="text-sm font-quicksand italic leading-relaxed text-[var(--kkb-text-secondary)]">« {recipe.description} »</p>
    </section>
  )

  const suggestionIcon = (s: Suggestion) => s.role === 'drink' ? CupSoda : Salad
  const suggestionLabel = (s: Suggestion) => s.role === 'drink' ? 'Boisson' : 'Accompagnement'

  const steps = (
    <ol className="space-y-5">
      {recipe.recipe_steps.map(step => (
        <li key={step.id} className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--kkb-coral)] font-dosis font-bold text-sm text-white">{step.step_number}</span>
          <p className="min-w-0 flex-1 pt-0.5 text-sm font-quicksand leading-relaxed text-[var(--kkb-text-secondary)]">{step.description}</p>
        </li>
      ))}
    </ol>
  )

  return (
    <>
      {/* ── Mobile ─────────────────────────────────────────────────────── */}
      <div className="pb-40 lg:hidden">
        <div className="relative">
          {visual('h-[260px] w-full', 'h-16 w-16')}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
          {hasMenuItems && (
            <div ref={mobileMenuRef} className="absolute right-4 top-4 print:hidden">
              <button type="button" onClick={() => setMenuOpen(o => !o)} aria-label="Options de la recette" aria-expanded={menuOpen} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/25 text-white">
                <Menu className="h-6 w-6" />
              </button>
              {menuOpen && optionsMenu}
            </div>
          )}
          <div className="absolute inset-x-4 bottom-9 space-y-1.5">
            <span className="inline-block rounded-[var(--kkb-radius-pill)] bg-white/20 px-2.5 py-0.5 text-[10px] font-quicksand font-bold uppercase tracking-wider text-white backdrop-blur-sm">
              {recipe.categories?.name ?? VISIBILITY_TAG[recipe.visibility]}
            </span>
            <h1 className="font-dosis font-extrabold text-[22px] leading-tight text-white">{recipe.name}</h1>
          </div>
        </div>

        <div className="relative z-10 mx-4 -mt-5 grid grid-cols-4 divide-x divide-[var(--kkb-border)] rounded-[var(--kkb-radius-sm)] bg-white px-2 py-3 shadow-md">
          {[
            { icon: Clock,      value: formatDuration(totalTime) ?? '—', label: 'Temps' },
            { icon: Users,      value: `${recipe.servings} pers.`,         label: 'Portions' },
            { icon: ChefHat,    value: recipe.difficulty ? DIFFICULTY_SHORT[recipe.difficulty] : '—', label: 'Niveau' },
            { icon: CatIcon,    value: recipe.categories?.name ?? '—',     label: 'Type' },
          ].map(m => (
            <div key={m.label} className="flex min-w-0 flex-col items-center gap-0.5 px-1 text-center">
              <m.icon className="h-4 w-4 text-[var(--kkb-coral)]" />
              <span className="w-full truncate text-[13px] font-quicksand font-bold text-[var(--kkb-text-primary)]">{m.value}</span>
              <span className="text-[10px] font-quicksand text-[var(--kkb-text-tertiary)]">{m.label}</span>
            </div>
          ))}
        </div>

        <div className="space-y-7 px-4 pt-5">

          {recipe.recipe_ingredients.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--kkb-border)] pb-2">
                <h2 className="font-dosis font-bold text-lg text-[var(--kkb-text-primary)]">Ingrédients</h2>
                <ServingsControl value={servings} onChange={setServings} />
              </div>
              <ul>
                {recipe.recipe_ingredients.map(ing => (
                  <li key={ing.id} className="flex items-center justify-between gap-3 border-b-[0.5px] border-[var(--kkb-border)] py-2.5 last:border-0">
                    <span className="text-sm font-quicksand text-[var(--kkb-text-primary)]">{ing.name}</span>
                    <span className="shrink-0 text-sm font-quicksand font-bold text-[var(--kkb-coral)]">{qtyOf(ing)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {recipe.recipe_steps.length > 0 && (
            <section className="space-y-3">
              <h2 className="border-b border-[var(--kkb-border)] pb-2 font-dosis font-bold text-lg text-[var(--kkb-text-primary)]">Préparation</h2>
              {steps}
            </section>
          )}

          {tipCard}

          {suggestions.length > 0 && (
            <section className="space-y-2">
              <h2 className="font-dosis font-semibold text-base text-[var(--kkb-text-primary)]">Accompagnements &amp; Boissons suggérés</h2>
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 hide-scrollbar">
                {suggestions.map(s => {
                  const Icon = suggestionIcon(s)
                  return (
                    <button key={`${s.role}-${s.id}`} type="button" onClick={() => router.push(`/recipes/${s.id}`)}
                      className="flex shrink-0 items-center gap-2 rounded-[var(--kkb-radius-pill)] border border-[var(--kkb-border)] bg-white px-3.5 py-2.5 text-left">
                      <Icon className={`h-4 w-4 ${s.role === 'drink' ? 'text-[var(--kkb-teal)]' : 'text-[var(--kkb-coral)]'}`} />
                      <span className="text-sm font-quicksand font-bold text-[var(--kkb-text-primary)]">{s.name}</span>
                      <span className="text-[9px] font-quicksand font-bold uppercase tracking-wide text-[var(--kkb-text-tertiary)]">{suggestionLabel(s)}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          )}
        </div>

        <div className="fixed inset-x-0 bottom-[72px] z-30 flex gap-3 border-t border-[var(--kkb-border)] bg-white px-5 py-3 print:hidden">
          <button type="button" onClick={() => void toggleFavorite()} aria-label={recipe.is_favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'} aria-pressed={recipe.is_favorited}
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-[var(--kkb-border)]">
            <Heart className={`h-5 w-5 ${recipe.is_favorited ? 'fill-[var(--kkb-coral)] text-[var(--kkb-coral)]' : 'text-[var(--kkb-text-secondary)]'}`} />
          </button>
          <button type="button" onClick={() => setAddOpen(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral)] text-sm font-quicksand font-bold uppercase tracking-wide text-white">
            <PlusCircle className="h-5 w-5" /> Ajouter à mon menu
          </button>
        </div>
      </div>

      {/* ── Desktop ────────────────────────────────────────────────────── */}
      <div className="mx-auto hidden max-w-[1300px] space-y-6 px-8 py-6 lg:block">
        <nav className="flex items-center gap-1.5 text-xs font-quicksand text-[var(--kkb-text-tertiary)] print:hidden" aria-label="Fil d'Ariane">
          <button type="button" onClick={() => router.push('/recipes')} className="hover:text-[var(--kkb-coral)]">Carnet Culinaire</button>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-bold text-[var(--kkb-text-primary)]">Détail de la recette</span>
        </nav>

        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <button type="button" onClick={() => router.push('/recipes')} className="mr-auto flex items-center gap-1.5 text-sm font-quicksand font-semibold text-[var(--kkb-text-secondary)] hover:text-[var(--kkb-coral)]">
            <ArrowLeft className="h-4 w-4" /> Revenir au Carnet Culinaire
          </button>
          <button type="button" onClick={() => void toggleFavorite()} aria-pressed={recipe.is_favorited}
            className="flex items-center gap-2 rounded-[var(--kkb-radius-pill)] border border-[var(--kkb-border)] bg-white px-4 py-2 text-sm font-quicksand font-semibold text-[var(--kkb-text-secondary)] hover:border-[var(--kkb-coral)]">
            <Heart className={`h-4 w-4 ${recipe.is_favorited ? 'fill-[var(--kkb-coral)] text-[var(--kkb-coral)]' : ''}`} />
            Favori du foyer
            <span className="rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral-light)] px-2 py-0.5 text-xs font-bold text-[var(--kkb-coral)]">{recipe.foyer_favorites}/{recipe.foyer_size}</span>
          </button>
          {hasMenuItems && (
            <div ref={desktopMenuRef} className="relative">
              <button type="button" onClick={() => setMenuOpen(o => !o)} aria-expanded={menuOpen}
                className="flex items-center gap-2 rounded-[var(--kkb-radius-pill)] border border-[var(--kkb-border)] bg-white px-4 py-2 text-sm font-quicksand font-semibold text-[var(--kkb-text-secondary)] hover:border-[var(--kkb-coral)]">
                <Menu className="h-4 w-4" /> Options
              </button>
              {menuOpen && optionsMenu}
            </div>
          )}
          <button type="button" onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral)] px-5 py-2.5 text-sm font-quicksand font-bold text-white hover:bg-[var(--kkb-coral-hover)]">
            <CalendarPlus className="h-4 w-4" /> Planifier ce repas
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {recipe.categories && <CategoryBadge category={recipe.categories} />}
            <span className="rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-teal-light)] px-2 py-0.5 text-[10px] font-quicksand font-bold uppercase tracking-wide text-[var(--kkb-teal)]">{VISIBILITY_TAG[recipe.visibility]}</span>
          </div>
          <h1 className="font-dosis font-extrabold text-[32px] leading-tight text-[var(--kkb-text-primary)]">{recipe.name}</h1>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[
            { icon: Clock, label: 'Préparation', value: formatDuration(recipe.prep_time_min) ?? '—' },
            { icon: Timer, label: 'Cuisson',     value: formatDuration(recipe.cook_time_min) ?? '—' },
            { icon: Clock, label: 'Temps total', value: formatDuration(totalTime) ?? '—' },
            { icon: Smile, label: 'Difficulté',  value: recipe.difficulty ? DIFFICULTY_LONG[recipe.difficulty] : '—' },
          ].map(m => (
            <div key={m.label} className="flex items-center gap-3 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--kkb-coral-light)] text-[var(--kkb-coral)]"><m.icon className="h-5 w-5" /></span>
              <div className="min-w-0">
                <p className="text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--kkb-text-tertiary)]">{m.label}</p>
                <p className="truncate font-dosis font-bold text-lg text-[var(--kkb-text-primary)]">{m.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[55fr_45fr] items-start gap-6">
          <div className="space-y-5">
            <div className="relative">
              {visual('aspect-[4/3] w-full rounded-[var(--kkb-radius-card)]', 'h-24 w-24')}
              {recipe.categories && <span className="absolute bottom-3 left-3"><CategoryBadge category={recipe.categories} solid /></span>}
            </div>
            {tipCard}
            {suggestions.length > 0 && (
              <section className="space-y-3 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-5">
                <h2 className="font-dosis font-bold text-lg text-[var(--kkb-text-primary)]">Accompagnements &amp; Boissons suggérés</h2>
                <ul className="space-y-2">
                  {suggestions.map(s => {
                    const Icon = suggestionIcon(s)
                    return (
                      <li key={`${s.role}-${s.id}`}>
                        <button type="button" onClick={() => router.push(`/recipes/${s.id}`)} className="flex w-full items-center gap-3 rounded-[var(--kkb-radius-sm)] bg-[var(--kkb-bg)] p-3 text-left hover:bg-[var(--kkb-coral-light)]">
                          <Icon className={`h-5 w-5 shrink-0 ${s.role === 'drink' ? 'text-[var(--kkb-teal)]' : 'text-[var(--kkb-coral)]'}`} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-quicksand font-bold text-[var(--kkb-text-primary)]">{s.name}</span>
                            {s.description && <span className="block truncate text-xs font-quicksand text-[var(--kkb-text-tertiary)]">{s.description}</span>}
                          </span>
                          <span className="shrink-0 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-teal-light)] px-2 py-0.5 text-[10px] font-quicksand font-bold uppercase tracking-wide text-[var(--kkb-teal)]">{suggestionLabel(s)}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}
          </div>

          <div className="space-y-5">
            {recipe.recipe_ingredients.length > 0 && (
              <section className="space-y-4 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--kkb-text-tertiary)]">Du marché à la table</p>
                    <h2 className="font-dosis font-bold text-lg text-[var(--kkb-text-primary)]">Ingrédients du marché</h2>
                  </div>
                  <ServingsControl value={servings} onChange={setServings} suffix="pers." />
                </div>
                <div className="flex items-center justify-between text-xs font-quicksand text-[var(--kkb-text-tertiary)] print:hidden">
                  Coche les ingrédients que tu as déjà.
                  <button type="button" onClick={() => setChecked(allChecked ? new Set() : new Set(recipe.recipe_ingredients.map(i => i.id)))} className="font-bold text-[var(--kkb-coral)]">
                    {allChecked ? 'Tout décocher' : 'Tout cocher'}
                  </button>
                </div>
                <ul className="grid grid-cols-2 gap-2">
                  {recipe.recipe_ingredients.map(ing => {
                    const isChecked = checked.has(ing.id)
                    return (
                      <li key={ing.id}>
                        <label className="flex h-full cursor-pointer items-start gap-2 rounded-[var(--kkb-radius-sm)] border border-[var(--kkb-border)] p-2.5 hover:border-[var(--kkb-coral)]">
                          <input type="checkbox" checked={isChecked} onChange={() => toggleIngredient(ing.id)} className="peer sr-only" />
                          <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-[1.5px] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--kkb-coral)] ${isChecked ? 'border-[var(--kkb-coral)] bg-[var(--kkb-coral)] text-white' : 'border-[var(--kkb-border)]'}`}>
                            {isChecked && <Check className="h-3 w-3" />}
                          </span>
                          <span className={`min-w-0 flex-1 text-sm font-quicksand ${isChecked ? 'text-[var(--kkb-text-tertiary)] line-through' : 'text-[var(--kkb-text-primary)]'}`}>{ing.name}</span>
                          <span className="shrink-0 text-sm font-quicksand font-bold text-[var(--kkb-coral)]">{qtyOf(ing)}</span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            {recipe.recipe_steps.length > 0 && (
              <section className="space-y-4 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-5">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--kkb-text-tertiary)]">Méthode de préparation</p>
                    <h2 className="font-dosis font-bold text-lg text-[var(--kkb-text-primary)]">Étapes simples pas-à-pas</h2>
                  </div>
                  <span className="text-xs font-quicksand text-[var(--kkb-text-tertiary)]">
                    {recipe.recipe_steps.length} étape{recipe.recipe_steps.length > 1 ? 's' : ''}{totalTime ? ` · ${formatDuration(totalTime)}` : ''}
                  </span>
                </div>
                {steps}
              </section>
            )}
          </div>
        </div>

        <section className="flex items-center justify-between gap-6 rounded-[var(--kkb-radius-card)] bg-[var(--kkb-teal-light)] p-6 print:hidden">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[var(--kkb-teal)]"><Users className="h-5 w-5" /></span>
            <div>
              <p className="font-dosis font-bold text-lg text-[var(--kkb-text-primary)]">Prêt pour votre planning de la semaine ?</p>
              <p className="text-sm font-quicksand text-[var(--kkb-text-secondary)]">Intègre ce plat au menu familial ou imprime la fiche pour la cuisine.</p>
            </div>
          </div>
          <div className="flex shrink-0 gap-3">
            <button type="button" onClick={() => window.print()} className="flex items-center gap-2 rounded-[var(--kkb-radius-pill)] border border-[var(--kkb-border)] bg-white px-4 py-2.5 text-sm font-quicksand font-semibold text-[var(--kkb-text-secondary)] hover:border-[var(--kkb-coral)]">
              <Printer className="h-4 w-4" /> Imprimer la fiche
            </button>
            <button type="button" onClick={() => setAddOpen(true)} className="flex items-center gap-2 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral)] px-5 py-2.5 text-sm font-quicksand font-bold text-white hover:bg-[var(--kkb-coral-hover)]">
              <CalendarPlus className="h-4 w-4" /> Ajouter au menu de la semaine
            </button>
          </div>
        </section>
      </div>

      <AddToMenuSheet recipeId={recipe.id} open={addOpen} onClose={() => setAddOpen(false)} />

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6 lg:items-center">
          <div role="alertdialog" aria-modal="true" className="w-full max-w-sm space-y-4 rounded-[var(--kkb-radius-card)] bg-white p-5 shadow-xl">
            <p className="font-dosis font-bold text-lg text-[var(--kkb-text-primary)]">Supprimer cette recette ?</p>
            <p className="text-sm font-quicksand text-[var(--kkb-text-secondary)]">Cette action est irréversible. La recette sera définitivement supprimée.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setConfirmDelete(false)} className="flex-1 rounded-[var(--kkb-radius-pill)] border border-[var(--kkb-border)] py-3 text-sm font-quicksand font-bold text-[var(--kkb-text-secondary)]">Annuler</button>
              <button type="button" onClick={() => void deleteRecipe()} disabled={deleting} className="flex flex-1 items-center justify-center gap-2 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-danger)] py-3 text-sm font-quicksand font-bold text-white disabled:opacity-60">
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />} Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
