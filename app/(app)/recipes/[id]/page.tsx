'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CalendarPlus,
  ChefHat,
  Clock,
  Heart,
  HeartOff,
  Lightbulb,
  Minus,
  Pencil,
  Plus,
  Trash2,
  Users,
  Utensils,
} from 'lucide-react'

interface Category {
  id: string
  name: string
  icon: string | null
}

interface Ingredient {
  id: string
  name: string
  quantity: number | null
  unit: string | null
  sort_order: number
}

interface Step {
  id: string
  step_number: number
  description: string
  duration_min: number | null
}

interface Recipe {
  id: string
  user_id: string | null
  name: string
  description: string | null
  prep_time_min: number | null
  cook_time_min: number | null
  servings: number
  difficulty: 'facile' | 'moyen' | 'difficile' | null
  photo_url: string | null
  visibility: string
  is_favorited: boolean
  categories: Category | null
  recipe_ingredients: Ingredient[]
  recipe_steps: Step[]
}

const DIFFICULTY_LABEL: Record<string, string> = {
  facile: 'Facile',
  moyen: 'Moyen',
  difficile: 'Difficile',
}

function formatQty(qty: number | null, servings: number, originalServings: number): string {
  if (!qty) return ''
  const scaled = qty * (servings / originalServings)
  if (Number.isInteger(scaled)) return String(scaled)
  const rounded = Math.round(scaled * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

export default function RecipeDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [recipe,            setRecipe]            = useState<Recipe | null>(null)
  const [loading,           setLoading]           = useState(true)
  const [error,             setError]             = useState<string | null>(null)
  const [servings,          setServings]          = useState(1)
  const [toastVisible,      setToastVisible]      = useState(false)
  const [currentUserId,     setCurrentUserId]     = useState<string | null>(null)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [deleting,          setDeleting]          = useState(false)

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then(async (r) => {
        const data = await r.json()
        if (r.ok) {
          setRecipe(data)
          setServings(data.servings)
        } else {
          setError(data?.error ?? 'Recette introuvable')
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Impossible de charger la recette')
        setLoading(false)
      })

    fetch('/api/users/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.id) setCurrentUserId(data.id) })
      .catch(() => {})
  }, [id])

  async function toggleFavorite() {
    if (!recipe) return
    const res = await fetch(`/api/recipes/${id}/favorite`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setRecipe(prev => prev ? { ...prev, is_favorited: data.is_favorited } : prev)
    }
  }

  async function deleteRecipe() {
    setDeleting(true)
    const res = await fetch(`/api/recipes/${id}`, { method: 'DELETE' })
    if (res.ok || res.status === 204) {
      router.push('/recipes')
    } else {
      setDeleting(false)
      setShowConfirmDelete(false)
    }
  }

  function showToast() {
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-[var(--mf-text-tertiary)] font-quicksand">Chargement…</p>
      </div>
    )
  }

  if (error || !recipe) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4">
        <p className="text-sm text-red-600 font-quicksand text-center">{error ?? 'Recette introuvable'}</p>
        <button type="button" onClick={() => router.back()}
          className="text-xs text-[var(--mf-primary)] underline font-quicksand">
          Retour
        </button>
      </div>
    )
  }

  const totalMin = (recipe.prep_time_min ?? 0) + (recipe.cook_time_min ?? 0)
  const isOwner  = currentUserId !== null && recipe.user_id === currentUserId

  return (
    <>
      {/* Sous-header de navigation */}
      <div className="sticky top-14 z-30 bg-[var(--mf-bg-page)] border-b border-[var(--mf-border-warm)] px-4 h-10 flex items-center gap-2.5">
        <button type="button" onClick={() => router.back()}
          className="p-1 -ml-1 text-[var(--mf-text-secondary)] hover:text-[var(--mf-primary)]"
          aria-label="Retour">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <p className="font-dosis font-semibold text-sm text-[var(--mf-text-primary)] truncate flex-1">
          {recipe.name}
        </p>
        {isOwner && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button type="button" onClick={() => router.push(`/recipes/${id}/edit`)}
              className="p-1.5 text-[var(--mf-text-secondary)] hover:text-[var(--mf-primary)] transition-colors"
              aria-label="Modifier">
              <Pencil className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setShowConfirmDelete(true)}
              className="p-1.5 text-[var(--mf-text-secondary)] hover:text-red-500 transition-colors"
              aria-label="Supprimer">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="max-w-sm mx-auto px-4 py-4 space-y-5 pb-8">

        {/* Badge catégorie + nom */}
        <div className="space-y-1.5">
          {recipe.categories && (
            <span className="inline-flex items-center gap-1 text-[10px] font-quicksand font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--mf-gold-bg)] text-[var(--mf-gold)]">
              {recipe.categories.icon} {recipe.categories.name}
            </span>
          )}
          <h1 className="font-dosis font-bold text-2xl text-[var(--mf-text-primary)] leading-tight">
            {recipe.name}
          </h1>
        </div>

        {/* Métadonnées */}
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {totalMin > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--mf-text-secondary)] font-quicksand">
              <Clock className="h-3.5 w-3.5 text-[var(--mf-primary)]" />
              {totalMin} min
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-[var(--mf-text-secondary)] font-quicksand">
            <Users className="h-3.5 w-3.5 text-[var(--mf-primary)]" />
            {recipe.servings} pers.
          </div>
          {recipe.difficulty && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--mf-text-secondary)] font-quicksand">
              <ChefHat className="h-3.5 w-3.5 text-[var(--mf-primary)]" />
              {DIFFICULTY_LABEL[recipe.difficulty]}
            </div>
          )}
          {recipe.categories && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--mf-text-secondary)] font-quicksand">
              <Utensils className="h-3.5 w-3.5 text-[var(--mf-primary)]" />
              {recipe.categories.name}
            </div>
          )}
          {/* Toggle favori interactif */}
          <button
            type="button"
            onClick={toggleFavorite}
            className="flex items-center gap-1.5 text-xs font-quicksand text-[var(--mf-text-secondary)] hover:text-[var(--mf-primary)] transition-colors"
            aria-label={recipe.is_favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            {recipe.is_favorited ? (
              <Heart className="h-3.5 w-3.5 fill-red-400 text-red-400" />
            ) : (
              <HeartOff className="h-3.5 w-3.5 text-[var(--mf-text-tertiary)]" />
            )}
            {recipe.is_favorited ? 'Favori' : 'Non favori'}
          </button>
        </div>

        {/* Contrôle portions */}
        {recipe.recipe_ingredients.length > 0 && (
          <div className="flex items-center justify-between bg-[var(--mf-bg-card)] rounded-xl px-4 py-3">
            <span className="text-sm font-quicksand font-medium text-[var(--mf-text-primary)]">Portions</span>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setServings((s) => Math.max(1, s - 1))} disabled={servings <= 1}
                className="w-8 h-8 rounded-full flex items-center justify-center border border-[var(--mf-border-warm)] text-[var(--mf-text-secondary)] disabled:opacity-40 hover:border-[var(--mf-primary)] hover:text-[var(--mf-primary)] transition-colors"
                aria-label="Réduire les portions">
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-6 text-center font-dosis font-bold text-lg text-[var(--mf-text-primary)]">{servings}</span>
              <button type="button" onClick={() => setServings((s) => s + 1)}
                className="w-8 h-8 rounded-full flex items-center justify-center border border-[var(--mf-border-warm)] text-[var(--mf-text-secondary)] hover:border-[var(--mf-primary)] hover:text-[var(--mf-primary)] transition-colors"
                aria-label="Augmenter les portions">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Ingrédients */}
        {recipe.recipe_ingredients.length > 0 && (
          <div className="space-y-2">
            <h2 className="font-dosis font-semibold text-base text-[var(--mf-text-primary)]">Ingrédients</h2>
            <div className="space-y-1.5">
              {recipe.recipe_ingredients.map((ing) => (
                <div key={ing.id} className="flex items-center gap-2 py-1.5 border-b border-[var(--mf-border-warm)]/40 last:border-0">
                  <span className="w-16 text-right text-sm font-quicksand font-medium text-[var(--mf-primary)] flex-shrink-0">
                    {formatQty(ing.quantity, servings, recipe.servings)}
                    {ing.unit ? ` ${ing.unit}` : ''}
                  </span>
                  <span className="text-sm font-quicksand text-[var(--mf-text-primary)]">{ing.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Préparation */}
        {recipe.recipe_steps.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-dosis font-semibold text-base text-[var(--mf-text-primary)]">Préparation</h2>
            <div className="space-y-3">
              {recipe.recipe_steps.map((step) => (
                <div key={step.id} className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--mf-primary)] flex items-center justify-center">
                    <span className="text-xs font-dosis font-bold text-white">{step.step_number}</span>
                  </div>
                  <p className="text-sm font-quicksand text-[var(--mf-text-primary)] leading-relaxed pt-0.5">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Encart astuce */}
        {recipe.description && (
          <div className="bg-[var(--mf-gold-bg)] rounded-xl p-4 flex gap-3">
            <Lightbulb className="h-5 w-5 text-[var(--mf-gold)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-quicksand font-bold uppercase tracking-wider text-[var(--mf-gold)] mb-1">Astuce</p>
              <p className="text-sm font-quicksand text-[var(--mf-text-secondary)] leading-relaxed">{recipe.description}</p>
            </div>
          </div>
        )}

        {/* Bouton "Ajouter à mon menu" */}
        <button type="button" onClick={showToast}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[var(--mf-primary)] text-white font-quicksand font-semibold text-sm hover:bg-[var(--mf-primary-hover)] transition-colors">
          <CalendarPlus className="h-4 w-4" />
          Ajouter à mon menu
        </button>
      </div>

      {/* Dialog confirmation suppression */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 space-y-4 shadow-xl">
            <p className="font-dosis font-bold text-base text-[var(--mf-text-primary)]">
              Supprimer cette recette ?
            </p>
            <p className="text-sm font-quicksand text-[var(--mf-text-secondary)] leading-relaxed">
              Cette action est irréversible. La recette sera définitivement supprimée.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowConfirmDelete(false)}
                className="flex-1 py-3 rounded-xl border border-[var(--mf-border-warm)] text-sm font-quicksand font-medium text-[var(--mf-text-secondary)] hover:border-[var(--mf-primary)] transition-colors">
                Annuler
              </button>
              <button type="button" onClick={deleteRecipe} disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-quicksand font-semibold hover:bg-red-600 disabled:opacity-60 transition-colors">
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast stub */}
      {toastVisible && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-[var(--mf-text-primary)] text-white text-sm font-quicksand shadow-lg">
          Disponible bientôt ✨
        </div>
      )}
    </>
  )
}
