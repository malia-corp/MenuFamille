'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, ArrowLeft, BookOpen, Link2, Loader2, ScanLine, Sparkles, Wand2 } from 'lucide-react'
import { MEAL_LABEL, type MealType } from '@/lib/constants/meal-type'
import type { SimilarRecipe } from '@/lib/utils/recipe-similarity'
import { DuplicateDialog } from '@/components/recipes/duplicate-dialog'
import { toast } from '@/lib/stores/toast-store'
import { RecipeForm, clearRecipeDraft, emptyStep, uid, type IngredientRow, type RecipeFormValues, type StepRow } from '../_recipe-form'

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
    <div className="mx-auto max-w-[1300px] px-4 pb-44 pt-3 lg:px-8 lg:pb-28 lg:pt-6">
      <div className="mb-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <button type="button" onClick={() => router.push(isPlanCtx ? '/plan' : '/recipes')}
            className="hidden items-center gap-1.5 text-sm font-quicksand text-[var(--kkb-text-tertiary)] hover:text-[var(--kkb-coral)] lg:flex">
            <ArrowLeft className="h-4 w-4" /> {isPlanCtx ? 'Menu' : 'Carnet'} <span className="text-[var(--kkb-text-tertiary)]">/</span>
            <span className="font-bold text-[var(--kkb-coral)]">Nouvelle recette</span>
          </button>
          <p className="flex items-center gap-1.5 text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--kkb-coral)] lg:hidden">
            <BookOpen className="h-3.5 w-3.5" /> {planHeader ? `Nouveau repas · ${planHeader}` : 'Transmission culinaire'}
          </p>
          <h1 className="font-dosis font-extrabold text-[22px] leading-tight text-[var(--kkb-text-primary)] lg:text-[28px]">
            <span className="lg:hidden">Nouvelle création culinaire</span>
            <span className="hidden lg:inline">{planHeader ? `Nouveau repas — ${planHeader}` : 'Nouvelle recette'}</span>
          </h1>
          <p className="text-sm font-quicksand text-[var(--kkb-text-secondary)]">
            Enregistre tes secrets de cuisine pas à pas, avec douceur et à ton rythme.
          </p>
        </div>

        {!isPlanCtx && (
          <section className="space-y-3 rounded-[var(--kkb-radius-sm)] border border-[var(--kkb-warning)] bg-[var(--kkb-warning-light)] p-3.5 lg:w-[440px] lg:shrink-0">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-[#B07A12]" />
              <p className="flex-1 text-sm font-quicksand font-bold text-[var(--kkb-text-primary)]">Magie Express</p>
              <span className="rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-success-light)] px-2 py-0.5 text-[10px] font-quicksand font-bold uppercase tracking-wide text-[var(--kkb-success)]">Gain de temps</span>
            </div>
            <p className="text-[13px] font-quicksand text-[var(--kkb-text-secondary)]">
              Importe automatiquement une recette depuis un lien web, ou numérise une page de ton carnet manuscrit.
            </p>
            <div className="flex gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[var(--kkb-radius-sm)] border border-[var(--kkb-border)] bg-white px-3 focus-within:border-[var(--kkb-coral)]">
                <Link2 className="h-4 w-4 shrink-0 text-[var(--kkb-text-tertiary)]" />
                <input ref={urlInputRef} type="url" value={importUrl} placeholder="Lien Instagram, TikTok, Marmiton..." aria-label="Lien de la recette à importer"
                  onChange={e => { setImportUrl(e.target.value); setImportError(null); setImportWarning(null) }}
                  onKeyDown={e => { if (e.key === 'Enter' && importUrl.trim()) void handleImport() }}
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-sm font-quicksand outline-none placeholder:text-[var(--kkb-text-tertiary)]" />
              </div>
              <button type="button" onClick={() => void handleImport()} disabled={!importUrl.trim() || importing}
                className="flex shrink-0 items-center gap-1.5 rounded-[var(--kkb-radius-sm)] bg-[var(--kkb-coral)] px-3.5 text-[13px] font-quicksand font-bold text-white disabled:opacity-50">
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Importer
              </button>
            </div>
            {importDomain && <p className="text-[11px] font-quicksand text-[var(--kkb-text-tertiary)]">Importée depuis {importDomain} : vérifie et complète si nécessaire.</p>}
            {importWarning && <p className="flex items-center gap-1 text-[11px] font-quicksand text-[#B07A12]"><AlertTriangle className="h-3.5 w-3.5" /> {importWarning}</p>}
            {importError && <p className="text-xs font-quicksand text-[var(--kkb-danger)]">{importError}</p>}
            <p className="text-center text-[10px] font-quicksand font-bold uppercase tracking-widest text-[var(--kkb-text-tertiary)]">Ou bien</p>
            <button type="button" onClick={() => toast.info('Bientôt disponible')}
              className="flex w-full items-center justify-center gap-2 rounded-[var(--kkb-radius-sm)] border border-[var(--kkb-border)] bg-white py-2.5 text-sm font-quicksand font-semibold text-[var(--kkb-text-secondary)]">
              <ScanLine className="h-4 w-4" /> Numériser un carnet de notes ou une photo
            </button>
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
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--kkb-coral)]" /></div>}>
      <RecipeAddInner />
    </Suspense>
  )
}
