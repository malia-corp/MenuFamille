'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { RecipeForm, emptyIngredient, emptyStep, uid, type RecipeFormValues } from '../../_recipe-form'

interface ApiRecipe {
  id: string
  name: string
  description: string | null
  tip: string | null
  category_id: string | null
  prep_time_min: number | null
  cook_time_min: number | null
  servings: number
  difficulty: string | null
  visibility: string
  circle_id: string | null
  photo_url: string | null
  recipe_ingredients: { id: string; name: string; quantity: number | null; unit: string | null; sort_order: number }[]
  recipe_steps: { id: string; step_number: number; title: string | null; description: string; duration_min: number | null }[]
}

export default function RecipeEditPage() {
  const router = useRouter()
  const id = useParams().id as string

  const [defaultValues, setDefaultValues] = useState<Partial<RecipeFormValues>>()
  const [initError, setInitError] = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then(async r => {
        const data: ApiRecipe = await r.json()
        if (!r.ok) { setInitError('Recette introuvable ou accès refusé'); return }
        setDefaultValues({
          name:        data.name,
          description: data.description ?? '',
          tip:         data.tip ?? '',
          categoryId:  data.category_id ?? '',
          prepTime:    data.prep_time_min != null ? String(data.prep_time_min) : '',
          cookTime:    data.cook_time_min != null ? String(data.cook_time_min) : '',
          servings:    data.servings,
          difficulty:  (data.difficulty ?? '') as RecipeFormValues['difficulty'],
          visibility:  data.visibility as RecipeFormValues['visibility'],
          circleId:    data.circle_id ?? '',
          photo_url:   data.photo_url ?? undefined,
          ingredients: data.recipe_ingredients.length
            ? data.recipe_ingredients.map(i => ({ _id: uid(), name: i.name, quantity: i.quantity != null ? String(i.quantity) : '', unit: i.unit ?? '' }))
            : [emptyIngredient()],
          steps: data.recipe_steps.length
            ? data.recipe_steps.map(s => ({ _id: uid(), title: s.title ?? '', description: s.description, duration: s.duration_min != null ? String(s.duration_min) : '' }))
            : [emptyStep()],
        })
      })
      .catch(() => setInitError('Impossible de charger la recette'))
  }, [id])

  async function handleSubmit(values: RecipeFormValues) {
    setError(null)
    setLoading(true)
    const body = {
      name:          values.name.trim(),
      description:   values.description.trim() || null,
      tip:           values.tip.trim() || null,
      category_id:   values.categoryId || null,
      prep_time_min: values.prepTime ? Number(values.prepTime) : null,
      cook_time_min: values.cookTime ? Number(values.cookTime) : null,
      servings:      values.servings,
      difficulty:    values.difficulty || null,
      visibility:    values.visibility,
      circle_id:     values.visibility === 'circle' ? values.circleId : null,
      ingredients:   values.ingredients.filter(i => i.name.trim()),
      steps:         values.steps.filter(s => s.description.trim()).map(s => ({ title: s.title, description: s.description, duration_min: s.duration || null })),
      photo_url:     values.photo_url ?? null,
      // N'écrase les associations existantes que si l'utilisateur en a choisi
      ...(values.sideItems.length || values.drinkItems.length
        ? { suggested_sides: values.sideItems.map(i => i.id), suggested_drinks: values.drinkItems.map(i => i.id) }
        : {}),
    }
    const res  = await fetch(`/api/recipes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data?.error ?? 'Erreur lors de la modification'); return }
    router.push(`/recipes/${id}`)
  }

  if (initError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4">
        <p className="text-center text-sm font-quicksand text-[var(--kkb-danger)]">{initError}</p>
        <button type="button" onClick={() => router.back()} className="text-xs font-quicksand font-bold text-[var(--kkb-coral)] underline">Retour</button>
      </div>
    )
  }
  if (!defaultValues) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--kkb-coral)]" /></div>
  }

  return (
    <div className="mx-auto max-w-[1300px] px-4 pb-44 pt-3 lg:px-8 lg:pb-28 lg:pt-6">
      <div className="mb-5 space-y-1">
        <button type="button" onClick={() => router.push(`/recipes/${id}`)}
          className="hidden items-center gap-1.5 text-sm font-quicksand text-[var(--kkb-text-tertiary)] hover:text-[var(--kkb-coral)] lg:flex">
          <ArrowLeft className="h-4 w-4" /> Recette <span>/</span> <span className="font-bold text-[var(--kkb-coral)]">Modifier</span>
        </button>
        <h1 className="font-dosis font-extrabold text-[22px] leading-tight text-[var(--kkb-text-primary)] lg:text-[28px]">Modifier la recette</h1>
        <p className="text-sm font-quicksand text-[var(--kkb-text-secondary)]">{defaultValues.name}</p>
      </div>

      <RecipeForm defaultValues={defaultValues} onSubmit={handleSubmit} loading={loading} apiError={error} submitLabel="Enregistrer les modifications" />
    </div>
  )
}
