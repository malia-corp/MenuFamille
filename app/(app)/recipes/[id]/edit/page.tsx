'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { RecipeFormHero } from '@/components/recipes/recipe-form-hero'
import { RecipeForm, emptyIngredient, emptyStep, uid, type RecipeFormValues } from '../../_recipe-form'
import { RecipeFormSkeleton } from '@/components/skeletons/page-skeletons'

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
  recipe_ingredients: { id: string; name: string; quantity: number | null; unit: string | null; sort_order: number }[]
  recipe_steps: { id: string; step_number: number; description: string }[]
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
            ? data.recipe_steps.map(s => ({ _id: uid(), description: s.description }))
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
      category_id:   values.categoryId || null,
      prep_time_min: values.prepTime ? Number(values.prepTime) : null,
      cook_time_min: values.cookTime ? Number(values.cookTime) : null,
      servings:      values.servings,
      difficulty:    values.difficulty || null,
      visibility:    values.visibility,
      circle_id:     values.visibility === 'circle' ? values.circleId : null,
      ingredients:   values.ingredients.filter(i => i.name.trim()),
      steps:         values.steps.filter(s => s.description.trim()),
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
        <button type="button" onClick={() => router.back()} className="text-xs font-quicksand font-bold text-[var(--kkb-foret)] underline">Retour</button>
      </div>
    )
  }
  if (!defaultValues) {
    return <RecipeFormSkeleton />
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-44 pt-2 lg:max-w-none lg:px-0 lg:pb-32 lg:pt-0">
      <RecipeFormHero
        className="mb-4 lg:mb-5"
        onBack={() => router.push(`/recipes/${id}`)}
        backLabel="Retour à la recette"
        eyebrow="Modifier la recette"
        title={defaultValues.name ?? 'Recette'}
        subtitle="Ajuste la fiche : tes changements apparaissent dès l’enregistrement."
      />

      <RecipeForm defaultValues={defaultValues} onSubmit={handleSubmit} loading={loading} apiError={error} submitLabel="Enregistrer les modifications" />
    </div>
  )
}
