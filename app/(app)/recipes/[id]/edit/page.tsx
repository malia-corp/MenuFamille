'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { RecipeForm, RecipeFormValues, IngredientRow, StepRow, uid } from '../../_recipe-form'

interface ApiRecipe {
  id: string
  name: string
  description: string | null
  category_id: string | null
  prep_time_min: number | null
  cook_time_min: number | null
  servings: number
  difficulty: string | null
  visibility: string
  circle_id: string | null
  photo_url: string | null
  recipe_type?: string
  recipe_ingredients: { id: string; name: string; quantity: number | null; unit: string | null; sort_order: number }[]
  recipe_steps: { id: string; step_number: number; description: string }[]
}

export default function RecipeEditPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [defaultValues, setDefaultValues] = useState<Partial<RecipeFormValues>>()
  const [initialLoading, setInitialLoading] = useState(true)
  const [initError, setInitError]           = useState<string | null>(null)
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then(async r => {
        const data: ApiRecipe = await r.json()
        if (!r.ok) { setInitError('Recette introuvable ou accès refusé'); setInitialLoading(false); return }

        const ingredients: IngredientRow[] = data.recipe_ingredients.map(i => ({
          _id: uid(),
          name: i.name,
          quantity: i.quantity != null ? String(i.quantity) : '',
          unit: i.unit ?? '',
        }))
        const steps: StepRow[] = data.recipe_steps.map(s => ({
          _id: uid(),
          description: s.description,
        }))

        setDefaultValues({
          name:        data.name,
          description: data.description ?? '',
          categoryId:  data.category_id ?? '',
          prepTime:    data.prep_time_min != null ? String(data.prep_time_min) : '',
          cookTime:    data.cook_time_min != null ? String(data.cook_time_min) : '',
          servings:    data.servings,
          difficulty:  (data.difficulty ?? '') as RecipeFormValues['difficulty'],
          visibility:   data.visibility as RecipeFormValues['visibility'],
          circleId:     data.circle_id ?? '',
          recipe_type:  (data.recipe_type as RecipeFormValues['recipe_type'] | undefined) ?? 'plat_principal',
          photo_url:    data.photo_url ?? undefined,
          ingredients: ingredients.length > 0 ? ingredients : [{ _id: uid(), name: '', quantity: '', unit: '' }],
          steps:       steps.length > 0 ? steps : [{ _id: uid(), description: '' }],
        })
        setInitialLoading(false)
      })
      .catch(() => { setInitError('Impossible de charger la recette'); setInitialLoading(false) })
  }, [id])

  async function handleSubmit(values: RecipeFormValues) {
    setError(null)
    setLoading(true)

    const body = {
      name:          values.name.trim(),
      description:   values.description.trim() || null,
      category_id:   values.categoryId || null,
      prep_time_min: values.prepTime ? Number(values.prepTime) : null,
      cook_time_min: values.cookTime ? Number(values.cookTime) : null,
      servings:      values.servings,
      difficulty:    values.difficulty || null,
      visibility:    values.visibility,
      circle_id:     values.visibility === 'circle' ? values.circleId : null,
      ingredients:   values.ingredients.filter(i => i.name.trim()),
      steps:         values.steps.filter(s => s.description.trim()),
      recipe_type:   values.recipe_type,
      photo_url:     values.photo_url ?? null,
    }

    const res  = await fetch(`/api/recipes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setError(data?.error ?? 'Erreur lors de la modification'); return }
    router.push(`/recipes/${id}`)
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-[var(--mf-text-tertiary)] font-quicksand">Chargement…</p>
      </div>
    )
  }

  if (initError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4">
        <p className="text-sm text-red-600 font-quicksand text-center">{initError}</p>
        <button type="button" onClick={() => router.back()}
          className="text-xs text-[var(--mf-primary)] underline font-quicksand">
          Retour
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Sub-header */}
      <div className="sticky top-14 z-30 bg-[var(--mf-bg-page)] border-b border-[var(--mf-border-warm)] px-4 h-10 flex items-center gap-2.5">
        <button type="button" onClick={() => router.back()}
          className="p-1 -ml-1 text-[var(--mf-text-secondary)] hover:text-[var(--mf-primary)]" aria-label="Retour">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <p className="font-dosis font-semibold text-sm text-[var(--mf-text-primary)]">Modifier la recette</p>
      </div>

      <RecipeForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        loading={loading}
        apiError={error}
        submitLabel="Enregistrer les modifications"
      />
    </>
  )
}
