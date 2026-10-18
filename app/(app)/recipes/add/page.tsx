'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Link2, Loader2, Sparkles, Wand2 } from 'lucide-react'
import { RecipeFormHero } from '@/components/recipes/recipe-form-hero'
import { MEAL_LABEL, type MealType } from '@/lib/constants/meal-type'
import type { SimilarRecipe } from '@/lib/utils/recipe-similarity'
import { DuplicateDialog } from '@/components/recipes/duplicate-dialog'
import { RecipeForm, clearRecipeDraft, emptyStep, uid, type IngredientRow, type RecipeFormValues, type StepRow } from '../_recipe-form'
import { RecipeFormSkeleton } from '@/components/skeletons/page-skeletons'

const DRAFT_KEY = 'kkb_recipe_draft_new'

type SaveOpts = { force?: boolean; parentId?: string; variantLabel?: string }

function RecipeAddInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  // Contexte plan : création depuis une case du planning puis affectation
  const planId     = searchParams.get('plan_id')
  const itemId     = searchParams.get('item_id')
  const mealType   = searchParams.get('meal_type') as MealType | null
  const dayOfWeek  = searchParams.get('day_of_week')
  const appliesAll = searchParams.get('applies_all') === 'true'
  const dayLabel   = searchParams.get('day_label')
  const isPlanCtx  = !!planId
  const focusImport = searchParams.get('import') === '1'

  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [lastValues, setLastValues] = useState<RecipeFormValues | null>(null)
  const [duplicate,  setDuplicate]  = useState<SimilarRecipe | null>(null)

  const [importUrl,      setImportUrl]      = useState('')
  const [importing,      setImporting]      = useState(false)
  const [importError,    setImportError]    = useState<string | null>(null)
  const [importWarning,  setImportWarning]  = useState<string | null>(null)
  const [importDomain,   setImportDomain]   = useState<string | null>(null)
  const [formKey,        setFormKey]        = useState(0)
  const [importedValues, setImportedValues] = useState<Partial<RecipeFormValues>>({})
  const urlInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (focusImport) {
      urlInputRef.current?.focus()
      urlInputRef.current?.scrollIntoView({ block: 'center' })
    }
  }, [focusImport])

  async function handleImport() {
    setImporting(true)
    setImportError(null)
    setImportWarning(null)
    try {
      const res = await fetch('/api/recipes/import-url', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: importUrl }),
      })
      const data = await res.json()
      if (!res.ok) { setImportError(data.error ?? 'Import impossible'); return }

      const ingredients: IngredientRow[] = ((data.partial.ingredients ?? []) as unknown[])
        .map(ing => ({ _id: uid(), name: String(ing), quantity: '', unit: '' }))
      const steps: StepRow[] = ((data.partial.steps ?? []) as unknown[])
        .map(s => ({ ...emptyStep(), description: String(s) }))

      setImportedValues({
        ...data.partial,
        ingredients:   ingredients.length ? ingredients : undefined,
        steps:         steps.length ? steps : undefined,
        source_url:    data.source_url,
        raw_html_hash: data.raw_html_hash,
      })
      setImportDomain(new URL(importUrl).hostname.replace('www.', ''))
      setFormKey(k => k + 1)
      if (!data.success) setImportWarning('Ingrédients non détectés : vérifie et complète à la main.')
    } catch {
      setImportError('Erreur réseau')
    } finally {
      setImporting(false)
    }
  }

  async function save(values: RecipeFormValues, opts: SaveOpts) {
    setError(null)
    setLoading(true)
    const body: Record<string, unknown> = {
      name:          values.name.trim(),
      description:   values.description.trim() || null,
      category_id:   values.categoryId || null,
      prep_time_min: values.prepTime ? Number(values.prepTime) : null,
      cook_time_min: values.cookTime ? Number(values.cookTime) : null,
      servings:      values.servings,
      difficulty:    values.difficulty || null,
      visibility:    isPlanCtx ? 'private' : values.visibility,
      circle_id:     values.visibility === 'circle' ? values.circleId : null,
      ingredients:   values.ingredients.filter(i => i.name.trim()),
      steps:         values.steps.filter(s => s.description.trim()),
      suggested_sides:  values.sideItems.map(i => i.id),
      suggested_drinks: values.drinkItems.map(i => i.id),
      photo_url:     values.photo_url ?? null,
      source_url:    values.source_url ?? null,
      raw_html_hash: values.raw_html_hash ?? null,
      force:         isPlanCtx || !!opts.force,
    }
    if (opts.parentId) {
      body.parent_recipe_id = opts.parentId
      body.variant_label    = opts.variantLabel ?? null
    }

    const res  = await fetch('/api/recipes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setLoading(false)

    if (res.status === 409 && data.conflict && !isPlanCtx) { setDuplicate(data.existing); return }
    if (!res.ok) { setError(data?.error ?? 'Erreur lors de l’enregistrement'); return }

    clearRecipeDraft(DRAFT_KEY)

    if (isPlanCtx) {
      const recipeId = data.id as string
      if (itemId) {
        await fetch(`/api/meal-plans/${planId}/items/${itemId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipe_id: recipeId }),
        })
      } else {
        await fetch(`/api/meal-plans/${planId}/items`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ day_of_week: dayOfWeek, meal_type: mealType, applies_all_days: appliesAll, recipe_id: recipeId }),
        })
      }
      router.push('/plan')
      return
    }
    router.push(`/recipes/${data.id}`)
  }

  async function handleFormSubmit(values: RecipeFormValues) {
    setLastValues(values)
    // Contrôle de doublon : seulement pour une recette partagée (cercle / communauté)
    if (!isPlanCtx && values.visibility !== 'private') {
      setLoading(true)
      try {
        const res = await fetch('/api/recipes/check-duplicate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: values.name, visibility: values.visibility, circle_id: values.circleId || null }),
        })
        const data = await res.json()
        if (res.ok && data.duplicate) { setDuplicate(data.duplicate); return }
      } finally {
        setLoading(false)
      }
    }
    await save(values, { force: true })
  }

  async function openExisting() {
    if (!duplicate) return
    setLoading(true)
    const res = await fetch(`/api/recipes/${duplicate.id}`).then(r => r.json()).catch(() => null)
    if (!res?.is_favorited) await fetch(`/api/recipes/${duplicate.id}/favorite`, { method: 'POST' })
    clearRecipeDraft(DRAFT_KEY)
    router.push(`/recipes/${duplicate.id}`)
  }

  const planHeader = isPlanCtx && mealType ? `${MEAL_LABEL[mealType] ?? mealType}${dayLabel ? ` · ${dayLabel}` : ''}` : null

  return (
    <div className="mx-auto max-w-lg px-4 pb-44 pt-2 lg:max-w-none lg:px-0 lg:pb-32 lg:pt-0">
      <div className="mb-4 grid grid-cols-1 gap-4 lg:mb-5 lg:grid-cols-12 lg:gap-5">
        <RecipeFormHero
          className={isPlanCtx ? 'lg:col-span-12' : 'lg:col-span-7 xl:col-span-8'}
          onBack={() => router.push(isPlanCtx ? '/plan' : '/recipes')}
          backLabel={isPlanCtx ? 'Retour au menu' : 'Retour au carnet'}
          eyebrow={isPlanCtx ? 'Menu de la semaine' : 'Carnet de recettes'}
          title={planHeader ? `Nouveau repas · ${planHeader}` : 'Nouvelle recette'}
          subtitle={isPlanCtx
            ? 'Elle rejoint ton carnet et prend sa place dans le menu dès que tu l’enregistres.'
            : 'Note tes secrets de cuisine pas à pas, à ton rythme : le brouillon se garde tout seul.'}
        />

        {/* Import par lien (seule « magie » du MVP, cf. docs/decisions.md §4) */}
        {!isPlanCtx && (
          <section className="flex flex-col rounded-[var(--kkb-r-xl)] bg-white p-5 lg:col-span-5 lg:p-6 xl:col-span-4" aria-labelledby="import-title">
            <h2 id="import-title" className="flex items-center gap-2.5 text-h3 text-[var(--kkb-profond)]">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--kkb-jaune-50)] text-[var(--kkb-jaune-text)]"><Wand2 className="h-4 w-4" /></span>
              Importer depuis un lien
            </h2>
            <p className="mt-2 font-quicksand text-sm text-[var(--kkb-texte-2)]">
              Colle l’adresse d’une recette trouvée sur le web : on remplit la fiche pour toi, tu n’as plus qu’à vérifier.
            </p>
            <div className="mt-auto pt-4">
              <div className={`flex h-12 items-center gap-2 rounded-full border-[1.5px] bg-[var(--kkb-creme)] pl-4 pr-1.5 transition-colors focus-within:border-[var(--kkb-foret-500)] ${importError ? 'border-[var(--kkb-danger)]' : 'border-transparent'}`}>
                <Link2 className="h-4 w-4 shrink-0 text-[var(--kkb-texte-2)]" />
                <input ref={urlInputRef} type="url" value={importUrl} placeholder="https://…" aria-label="Lien de la recette à importer"
                  onChange={e => { setImportUrl(e.target.value); setImportError(null); setImportWarning(null) }}
                  onKeyDown={e => { if (e.key === 'Enter' && importUrl.trim()) void handleImport() }}
                  className="min-w-0 flex-1 bg-transparent font-quicksand text-sm text-[var(--kkb-profond)] outline-none placeholder:text-[var(--kkb-texte-2)]" />
                <button type="button" onClick={() => void handleImport()} disabled={!importUrl.trim() || importing}
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[var(--kkb-foret)] px-4 font-quicksand text-[13px] font-bold text-[var(--kkb-creme)] transition-colors hover:bg-[var(--kkb-foret-900)] disabled:opacity-50">
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Importer
                </button>
              </div>
              <div aria-live="polite">
                {importDomain && !importWarning && !importError && (
                  <p className="mt-2 flex items-center gap-1.5 font-quicksand text-xs text-[var(--kkb-foret-500)]"><CheckCircle2 className="h-3.5 w-3.5" /> Importée depuis {importDomain} : vérifie et complète la fiche.</p>
                )}
                {importWarning && <p className="mt-2 flex items-center gap-1.5 font-quicksand text-xs text-[var(--kkb-jaune-text)]"><AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {importWarning}</p>}
                {importError && <p className="mt-2 font-quicksand text-xs text-[var(--kkb-danger)]">{importError}</p>}
              </div>
            </div>
          </section>
        )}
      </div>

      <RecipeForm
        key={formKey}
        defaultValues={isPlanCtx ? { ...importedValues, visibility: 'private' } : importedValues}
        onSubmit={handleFormSubmit}
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

    </div>
  )
}

export default function RecipeAddPage() {
  return (
    <Suspense fallback={<RecipeFormSkeleton />}>
      <RecipeAddInner />
    </Suspense>
  )
}
