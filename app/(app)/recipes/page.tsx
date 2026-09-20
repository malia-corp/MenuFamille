'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, HeartOff, Plus, Search } from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
  icon: string | null
  color: string | null
}

interface Recipe {
  id: string
  name: string
  description: string | null
  prep_time_min: number | null
  cook_time_min: number | null
  servings: number
  difficulty: 'facile' | 'moyen' | 'difficile' | null
  photo_url: string | null
  visibility: string
  is_favorited: boolean
  recipe_type?: string
  categories: Category | null
}

type Scope = 'all' | 'mes' | 'famille' | 'communaute'

const SCOPES: { value: Scope; label: string }[] = [
  { value: 'all',        label: 'Tout' },
  { value: 'mes',        label: 'Mes recettes' },
  { value: 'famille',    label: 'Famille' },
  { value: 'communaute', label: 'Communauté' },
]

export default function RecipesPage() {
  const router = useRouter()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scope, setScope] = useState<Scope>('all')
  const [search, setSearch] = useState('')
  const [recipeType, setRecipeType] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCategories(data) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)

    const doFetch = () => {
      const params = new URLSearchParams({ scope })
      if (search) params.set('search', search)
      if (selectedCategory) params.set('category_id', selectedCategory)
      if (recipeType) params.set('recipe_type', recipeType)

      setLoading(true)
      fetch(`/api/recipes?${params}`)
        .then(async (r) => {
          const data = await r.json()
          if (r.ok && Array.isArray(data)) {
            setRecipes(data)
            setError(null)
          } else {
            setError(data?.error ?? 'Erreur de chargement')
          }
          setLoading(false)
        })
        .catch(() => {
          setError('Impossible de charger les recettes')
          setLoading(false)
        })
    }

    if (search) {
      searchTimer.current = setTimeout(doFetch, 300)
    } else {
      doFetch()
    }

    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [scope, search, selectedCategory, recipeType])

  return (
    <>
    <div className="max-w-sm mx-auto px-4 py-4 space-y-4">

      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--mf-text-tertiary)]" />
        <input
          type="search"
          placeholder="Chercher une recette…"
          aria-label="Chercher une recette"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--mf-border-warm)] bg-[var(--mf-bg-card-alt)] text-sm font-quicksand text-[var(--mf-text-primary)] placeholder:text-[var(--mf-text-tertiary)] focus:outline-none focus:border-[var(--mf-primary)]"
        />
      </div>

      {/* Filtres scope */}
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {SCOPES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setScope(s.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-quicksand font-medium transition-colors ${
              scope === s.value
                ? 'bg-[var(--mf-primary)] text-white'
                : 'bg-white border border-[var(--mf-border-warm)] text-[var(--mf-text-secondary)]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Filtres type de recette */}
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {[
          { value: '',               label: 'Tout'           },
          { value: 'plat_principal', label: 'Plat principal' },
          { value: 'sauce',          label: 'Sauce'          },
          { value: 'accompagnement', label: 'Accompagnement' },
          { value: 'boisson',        label: 'Boisson'        },
        ].map(t => (
          <button
            key={t.value}
            type="button"
            onClick={() => setRecipeType(t.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-quicksand font-medium transition-colors ${
              recipeType === t.value
                ? 'bg-[var(--mf-primary)] text-white'
                : 'bg-white border border-[var(--mf-border-warm)] text-[var(--mf-text-secondary)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filtres catégorie */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-quicksand font-medium transition-colors ${
              !selectedCategory
                ? 'bg-[var(--mf-text-primary)] text-white'
                : 'bg-white border border-[var(--mf-border-warm)] text-[var(--mf-text-secondary)]'
            }`}
          >
            Tous types
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-quicksand font-medium transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-[var(--mf-text-primary)] text-white'
                  : 'bg-white border border-[var(--mf-border-warm)] text-[var(--mf-text-secondary)]'
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Titre + compteur */}
      <div className="flex items-baseline justify-between">
        <h1 className="font-dosis font-bold text-xl text-[var(--mf-text-primary)]">
          Livre de recettes
        </h1>
        {!loading && (
          <span className="text-xs text-[var(--mf-text-tertiary)] font-quicksand">
            {recipes.length} recette{recipes.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {error && (
        <div className="text-center py-8 space-y-2">
          <p className="text-sm text-red-600 font-quicksand">{error}</p>
          <button
            type="button"
            onClick={() => { setError(null); setSearch('') }}
            className="text-xs text-[var(--mf-primary)] underline font-quicksand"
          >
            Réessayer
          </button>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <p className="text-sm text-[var(--mf-text-tertiary)] font-quicksand">Chargement…</p>
        </div>
      )}

      {!loading && !error && recipes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-[var(--mf-text-tertiary)] font-quicksand">
            Aucune recette trouvée.
          </p>
        </div>
      )}

      {/* Grille de recettes */}
      {!loading && !error && recipes.length > 0 && (
        <div className="grid grid-cols-2 gap-3 pb-4">
          {recipes.map((recipe) => (
            <button
              key={recipe.id}
              type="button"
              onClick={() => router.push(`/recipes/${recipe.id}`)}
              className="text-left rounded-xl overflow-hidden border border-[var(--mf-border-warm)] bg-white shadow-sm active:scale-95 transition-transform"
            >
              {/* En-tête avec emoji catégorie */}
              <div className="relative h-24 flex items-center justify-center bg-[linear-gradient(135deg,_var(--mf-primary),_var(--mf-primary-hover))]">
                <span className="text-4xl select-none" aria-hidden="true">
                  {recipe.categories?.icon ?? '🍴'}
                </span>
                {recipe.recipe_type && recipe.recipe_type !== 'plat_principal' && (
                  <span className={`absolute top-1 left-1 text-[10px] font-quicksand font-bold px-1.5 py-0.5 rounded-full ${
                    recipe.recipe_type === 'sauce'          ? 'bg-orange-100 text-orange-700' :
                    recipe.recipe_type === 'accompagnement' ? 'bg-green-100 text-green-700'   :
                    recipe.recipe_type === 'boisson'        ? 'bg-blue-100 text-blue-700'     :
                    ''
                  }`}>
                    {recipe.recipe_type === 'sauce' ? 'Sauce' : recipe.recipe_type === 'accompagnement' ? 'Acc.' : 'Bois.'}
                  </span>
                )}
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation()
                    const res = await fetch(`/api/recipes/${recipe.id}/favorite`, { method: 'POST' })
                    if (res.ok) {
                      const data = await res.json()
                      setRecipes(prev => prev.map(r => r.id === recipe.id ? { ...r, is_favorited: data.is_favorited } : r))
                    }
                  }}
                  className="absolute top-2 right-2 p-1"
                  aria-label={recipe.is_favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                >
                  {recipe.is_favorited ? (
                    <Heart className="h-4 w-4 fill-red-400 text-red-400" />
                  ) : (
                    <HeartOff className="h-4 w-4 text-white/60" />
                  )}
                </button>
              </div>

              {/* Corps carte */}
              <div className="p-2.5 space-y-1">
                <p className="font-dosis font-semibold text-sm text-[var(--mf-text-primary)] line-clamp-2 leading-tight">
                  {recipe.name}
                </p>
                {recipe.categories && (
                  <span className="inline-block text-[10px] font-quicksand font-medium px-1.5 py-0.5 rounded-full bg-[var(--mf-bg-card)] text-[var(--mf-text-secondary)]">
                    {recipe.categories.name}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>

      {/* FAB — Ajouter une recette */}
      <button
        type="button"
        onClick={() => router.push('/recipes/add')}
        className="fixed bottom-20 right-4 w-12 h-12 rounded-full bg-[var(--mf-primary)] text-white flex items-center justify-center shadow-lg hover:bg-[var(--mf-primary-hover)] active:scale-95 transition-all z-40"
        aria-label="Ajouter une recette"
      >
        <Plus className="h-5 w-5" />
      </button>
    </>
  )
}
