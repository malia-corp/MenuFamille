import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Bone, Button, Txt } from '@/components/ui'
import { RecipeForm, RecipeFormHero, emptyIngredient, emptyStep, uid, type RecipeFormValues } from '@/components/recipes/RecipeForm'
import { request } from '@/lib/api'
import { toast } from '@/lib/toast'
import { C, R } from '@/theme'

interface ApiRecipe {
  id: string; name: string; description: string | null; category_id: string | null
  prep_time_min: number | null; cook_time_min: number | null; servings: number; difficulty: string | null
  visibility: string; circle_id: string | null; photo_url: string | null
  recipe_ingredients: { id: string; name: string; quantity: number | null; unit: string | null; sort_order: number }[]
  recipe_steps: { id: string; step_number: number; description: string }[]
}

// Modifier une recette (cf. app/(app)/recipes/[id]/edit/page.tsx).
export default function RecipeEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [defaults, setDefaults] = useState<Partial<RecipeFormValues>>()
  const [initError, setInitError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void request<ApiRecipe>(`/api/recipes/${id}`).then(res => {
      if (!res.ok || !res.data) { setInitError('Recette introuvable ou accès refusé'); return }
      const d = res.data
      setDefaults({
        name: d.name,
        description: d.description ?? '',
        categoryId: d.category_id ?? '',
        prepTime: d.prep_time_min != null ? String(d.prep_time_min) : '',
        cookTime: d.cook_time_min != null ? String(d.cook_time_min) : '',
        servings: d.servings,
        difficulty: (d.difficulty ?? '') as RecipeFormValues['difficulty'],
        visibility: d.visibility as RecipeFormValues['visibility'],
        circleId: d.circle_id ?? '',
        photo_url: d.photo_url ?? undefined,
        ingredients: d.recipe_ingredients.length
          ? d.recipe_ingredients.map(i => ({ _id: uid(), name: i.name, quantity: i.quantity != null ? String(i.quantity) : '', unit: i.unit ?? '' }))
          : [emptyIngredient()],
        steps: d.recipe_steps.length ? d.recipe_steps.map(s => ({ _id: uid(), description: s.description })) : [emptyStep()],
      })
    }).catch(() => setInitError('Impossible de charger la recette'))
  }, [id])

  async function handleSubmit(values: RecipeFormValues) {
    setError(null); setLoading(true)
    const body = {
      name: values.name.trim(),
      description: values.description.trim() || null,
      category_id: values.categoryId || null,
      prep_time_min: values.prepTime ? Number(values.prepTime) : null,
      cook_time_min: values.cookTime ? Number(values.cookTime) : null,
      servings: values.servings,
      difficulty: values.difficulty || null,
      visibility: values.visibility,
      circle_id: values.visibility === 'circle' ? values.circleId : null,
      ingredients: values.ingredients.filter(i => i.name.trim()),
      steps: values.steps.filter(s => s.description.trim()),
      photo_url: values.photo_url ?? null,
      // N'écrase les associations existantes que si l'utilisateur en a choisi
      ...(values.sideItems.length || values.drinkItems.length
        ? { suggested_sides: values.sideItems.map(i => i.id), suggested_drinks: values.drinkItems.map(i => i.id) }
        : {}),
    }
    const res = await request<{ error?: string }>(`/api/recipes/${id}`, { method: 'PATCH', json: body }).catch(() => null)
    setLoading(false)
    if (!res?.ok) { setError(res?.data?.error ?? 'Erreur lors de la modification'); return }
    toast.success('Recette modifiée')
    router.replace(`/recipes/${id}`)
  }

  if (initError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: C.creme }}>
        <Txt variant="small" color={C.danger} style={{ textAlign: 'center' }}>{initError}</Txt>
        <Button label="Retour" tone="link" onPress={() => router.back()} />
      </View>
    )
  }
  if (!defaults) {
    return (
      <View style={{ flex: 1, padding: 16, paddingTop: 60, gap: 16, backgroundColor: C.creme }}>
        <Bone style={{ height: 160, borderRadius: R.xl }} /><Bone style={{ height: 320, borderRadius: R.xl }} />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.creme }}>
      <RecipeForm
        defaultValues={defaults}
        onSubmit={handleSubmit}
        loading={loading}
        apiError={error}
        submitLabel="Enregistrer les modifications"
        header={(
          <RecipeFormHero onBack={() => router.back()} backLabel="Retour à la recette" eyebrow="Modifier la recette"
            title={defaults.name ?? 'Recette'} subtitle="Ajuste la fiche : tes changements apparaissent dès l’enregistrement." />
        )}
      />
    </View>
  )
}
