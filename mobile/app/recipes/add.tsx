import { useState } from 'react'
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { AlertTriangle, CheckCircle2, Link2, Sparkles, Wand2 } from 'lucide-react-native'
import { Card, CardTitle, Txt } from '@/components/ui'
import { RecipeForm, RecipeFormHero, clearRecipeDraft, emptyStep, uid, type IngredientRow, type RecipeFormValues, type StepRow } from '@/components/recipes/RecipeForm'
import { DuplicateDialog, type SimilarRecipe } from '@/components/recipes/DuplicateDialog'
import { get, request } from '@/lib/api'
import { MEAL_LABEL, type MealType } from '@/shared/meal-type'
import { C, F, R } from '@/theme'

const DRAFT_KEY = 'kkb_recipe_draft_new'
type SaveOpts = { force?: boolean; parentId?: string; variantLabel?: string }

// Nouvelle recette (cf. app/(app)/recipes/add/page.tsx). Depuis une case du
// menu (plan_id…), la recette est créée puis assignée au repas.
export default function RecipeAddScreen() {
  const p = useLocalSearchParams<{ plan_id?: string; item_id?: string; meal_type?: string; day_of_week?: string; applies_all?: string; day_label?: string; import?: string }>()
  const planId = p.plan_id || null
  const isPlanCtx = !!planId
  const mealType = (p.meal_type || null) as MealType | null

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastValues, setLastValues] = useState<RecipeFormValues | null>(null)
  const [duplicate, setDuplicate] = useState<SimilarRecipe | null>(null)
  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importWarning, setImportWarning] = useState<string | null>(null)
  const [importDomain, setImportDomain] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [imported, setImported] = useState<Partial<RecipeFormValues>>({})

  async function handleImport() {
    setImporting(true); setImportError(null); setImportWarning(null)
    try {
      const res = await request<{ error?: string; success: boolean; source_url: string; raw_html_hash: string; partial: Partial<RecipeFormValues> & { ingredients?: unknown[]; steps?: unknown[] } }>(
        '/api/recipes/import-url', { method: 'POST', json: { url: importUrl.trim() } },
      )
      if (!res.ok || !res.data) { setImportError(res.data?.error ?? 'Import impossible'); return }
      const d = res.data
      const ingredients: IngredientRow[] = (d.partial.ingredients ?? []).map(ing => ({ _id: uid(), name: String(ing), quantity: '', unit: '' }))
      const steps: StepRow[] = (d.partial.steps ?? []).map(s => ({ ...emptyStep(), description: String(s) }))
      setImported({
        ...d.partial,
        ingredients: ingredients.length ? ingredients : undefined,
        steps: steps.length ? steps : undefined,
        source_url: d.source_url,
        raw_html_hash: d.raw_html_hash,
      })
      setImportDomain(importUrl.trim().replace(/^https?:\/\//, '').split('/')[0].replace('www.', ''))
      setFormKey(k => k + 1)
      if (!d.success) setImportWarning('Ingrédients non détectés : vérifie et complète à la main.')
    } catch {
      setImportError('Erreur réseau')
    } finally {
      setImporting(false)
    }
  }

  async function save(values: RecipeFormValues, opts: SaveOpts) {
    setError(null); setLoading(true)
    const body: Record<string, unknown> = {
      name: values.name.trim(),
      description: values.description.trim() || null,
      category_id: values.categoryId || null,
      prep_time_min: values.prepTime ? Number(values.prepTime) : null,
      cook_time_min: values.cookTime ? Number(values.cookTime) : null,
      servings: values.servings,
      difficulty: values.difficulty || null,
      visibility: isPlanCtx ? 'private' : values.visibility,
      circle_id: values.visibility === 'circle' ? values.circleId : null,
      ingredients: values.ingredients.filter(i => i.name.trim()),
      steps: values.steps.filter(s => s.description.trim()),
      suggested_sides: values.sideItems.map(i => i.id),
      suggested_drinks: values.drinkItems.map(i => i.id),
      photo_url: values.photo_url ?? null,
      source_url: values.source_url ?? null,
      raw_html_hash: values.raw_html_hash ?? null,
      force: isPlanCtx || !!opts.force,
    }
    if (opts.parentId) { body.parent_recipe_id = opts.parentId; body.variant_label = opts.variantLabel ?? null }

    const res = await request<{ id?: string; error?: string; conflict?: boolean; existing?: SimilarRecipe }>('/api/recipes', { method: 'POST', json: body }).catch(() => null)
    setLoading(false)
    if (!res) { setError('Connexion impossible'); return }
    if (res.status === 409 && res.data?.conflict && res.data.existing && !isPlanCtx) { setDuplicate(res.data.existing); return }
    if (!res.ok || !res.data?.id) { setError(res.data?.error ?? 'Erreur lors de l’enregistrement'); return }

    await clearRecipeDraft(DRAFT_KEY)
    const recipeId = res.data.id
    if (isPlanCtx) {
      if (p.item_id) await request(`/api/meal-plans/${planId}/items/${p.item_id}`, { method: 'PATCH', json: { recipe_id: recipeId } }).catch(() => null)
      else await request(`/api/meal-plans/${planId}/items`, { method: 'POST', json: { day_of_week: p.day_of_week, meal_type: mealType, applies_all_days: p.applies_all === 'true', recipe_id: recipeId } }).catch(() => null)
      router.navigate('/plan')
      return
    }
    router.replace(`/recipes/${recipeId}`)
  }

  async function handleSubmit(values: RecipeFormValues) {
    setLastValues(values)
    // Contrôle de doublon : seulement pour une recette partagée (cercle / communauté)
    if (!isPlanCtx && values.visibility !== 'private') {
      setLoading(true)
      const res = await request<{ duplicate?: SimilarRecipe }>('/api/recipes/check-duplicate', {
        method: 'POST', json: { name: values.name, visibility: values.visibility, circle_id: values.circleId || null },
      }).catch(() => null)
      setLoading(false)
      if (res?.ok && res.data?.duplicate) { setDuplicate(res.data.duplicate); return }
    }
    await save(values, { force: true })
  }

  async function openExisting() {
    if (!duplicate) return
    setLoading(true)
    const existing = await get<{ is_favorited?: boolean }>(`/api/recipes/${duplicate.id}`)
    if (!existing?.is_favorited) await request(`/api/recipes/${duplicate.id}/favorite`, { method: 'POST' }).catch(() => null)
    await clearRecipeDraft(DRAFT_KEY)
    router.replace(`/recipes/${duplicate.id}`)
  }

  const planHeader = isPlanCtx && mealType ? `${MEAL_LABEL[mealType] ?? mealType}${p.day_label ? ` · ${p.day_label}` : ''}` : null
  const back = () => (router.canGoBack() ? router.back() : router.navigate(isPlanCtx ? '/plan' : '/recipes'))

  const header = (
    <>
      <RecipeFormHero
        onBack={back}
        backLabel={isPlanCtx ? 'Retour au menu' : 'Retour au carnet'}
        eyebrow={isPlanCtx ? 'Menu de la semaine' : 'Carnet de recettes'}
        title={planHeader ? `Nouveau repas · ${planHeader}` : 'Nouvelle recette'}
        subtitle={isPlanCtx
          ? 'Elle rejoint ton carnet et prend sa place dans le menu dès que tu l’enregistres.'
          : 'Note tes secrets de cuisine pas à pas, à ton rythme : le brouillon se garde tout seul.'}
      />
      {/* Import par lien (seule « magie » du MVP, cf. docs/decisions.md §4) */}
      {!isPlanCtx && (
        <Card style={{ gap: 10 }}>
          <CardTitle icon={Wand2} title="Importer depuis un lien" tileBg={C.jaune50} tileFg={C.jauneText} />
          <Txt variant="small" style={{ fontSize: 14 }}>Colle l’adresse d’une recette trouvée sur le web : on remplit la fiche pour toi, tu n’as plus qu’à vérifier.</Txt>
          <View style={{ height: 48, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: R.pill, borderWidth: 1.5, borderColor: importError ? C.danger : 'transparent', backgroundColor: C.creme, paddingLeft: 14, paddingRight: 4 }}>
            <Link2 size={16} color={C.texte2} />
            <TextInput value={importUrl} onChangeText={v => { setImportUrl(v); setImportError(null); setImportWarning(null) }} placeholder="https://…" placeholderTextColor={C.texte2}
              autoFocus={p.import === '1'} autoCapitalize="none" keyboardType="url" returnKeyType="go" onSubmitEditing={() => { if (importUrl.trim()) void handleImport() }}
              accessibilityLabel="Lien de la recette à importer" style={{ flex: 1, fontFamily: F.body, fontSize: 14, color: C.profond, paddingVertical: 0 }} />
            <Pressable onPress={() => void handleImport()} disabled={!importUrl.trim() || importing} accessibilityRole="button"
              style={{ height: 38, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: R.pill, backgroundColor: C.foret, opacity: !importUrl.trim() || importing ? 0.5 : 1 }}>
              {importing ? <ActivityIndicator size="small" color={C.creme} /> : <Sparkles size={16} color={C.creme} />}
              <Txt style={{ fontFamily: F.bodyBold, fontSize: 13, color: C.creme }}>Importer</Txt>
            </Pressable>
          </View>
          {importDomain && !importWarning && !importError && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={14} color={C.foret500} />
              <Txt variant="meta" color={C.foret500} style={{ flex: 1 }}>Importée depuis {importDomain} : vérifie et complète la fiche.</Txt>
            </View>
          )}
          {!!importWarning && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={14} color={C.jauneText} /><Txt variant="meta" color={C.jauneText} style={{ flex: 1 }}>{importWarning}</Txt>
            </View>
          )}
          {!!importError && <Txt variant="meta" color={C.danger}>{importError}</Txt>}
        </Card>
      )}
    </>
  )

  return (
    <View style={{ flex: 1, backgroundColor: C.creme }}>
      <RecipeForm
        key={formKey}
        header={header}
        defaultValues={isPlanCtx ? { ...imported, visibility: 'private' } : imported}
        onSubmit={handleSubmit}
        loading={loading}
        apiError={error}
        submitLabel={isPlanCtx ? 'Enregistrer et assigner' : 'Enregistrer la recette'}
        hideVisibility={isPlanCtx}
        draftKey={isPlanCtx ? undefined : DRAFT_KEY}
      />
      {duplicate && lastValues && (
        <DuplicateDialog
          duplicate={duplicate}
          busy={loading}
          error={error}
          onUseExisting={() => void openExisting()}
          onVariant={label => void save(lastValues, { parentId: duplicate.id, variantLabel: label })}
          onCreateAnyway={() => void save(lastValues, { force: true })}
          onClose={() => setDuplicate(null)}
        />
      )}
    </View>
  )
}
