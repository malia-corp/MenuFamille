'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, ArrowDown, CheckCircle2, ChevronDown, ClipboardPaste, Link2, Loader2, Sparkles, Wand2 } from 'lucide-react'
import { RecipeFormHero } from '@/components/recipes/recipe-form-hero'
import { MEAL_LABEL, type MealType } from '@/lib/constants/meal-type'
import type { SimilarRecipe } from '@/lib/utils/recipe-similarity'
import { DuplicateDialog } from '@/components/recipes/duplicate-dialog'
import { RecipeForm, clearRecipeDraft, emptyStep, uid, type ImportReview, type IngredientRow, type RecipeFormValues, type ReviewField, type StepRow } from '../_recipe-form'
import { RecipeFormSkeleton } from '@/components/skeletons/page-skeletons'
import type { ImportedRecipe, ImportWarning, WarningCode } from '@/lib/import/types'

// Avertissement de l'import → champ à vérifier sur l'écran de relecture.
const WARNING_FIELDS: Partial<Record<WarningCode, ReviewField[]>> = {
  name_from_title: ['name'],
  times_total_only: ['times'],
  times_estimated: ['times'],
  rest_added_to_prep: ['times'],
  servings_missing: ['servings'],
  servings_range: ['servings'],
  servings_pieces: ['servings'],
  difficulty_missing: ['difficulty'],
  ingredients_missing: ['ingredients'],
  steps_missing: ['steps'],
  llm_used: ['ingredients', 'steps'],
}

interface ImportInfo {
  source: string            // domaine, ou « ton texte »
  status: 'complete' | 'partial' | 'failed'
  warnings: string[]
  notes: string[]
  llmUsed: boolean
}

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

  const [importMode,     setImportMode]     = useState<'url' | 'text'>('url')
  const [importText,     setImportText]     = useState('')
  const [importInfo,     setImportInfo]     = useState<ImportInfo | null>(null)
  const [importReview,   setImportReview]   = useState<ImportReview | undefined>(undefined)
  const [pasteSuggested, setPasteSuggested] = useState(false)
  // Traçabilité de l'import retenu (recipe_imports, migration y).
  const [importMeta, setImportMeta] = useState<{ source_type: string[]; status: string; rest_min: number | null } | null>(null)
  const [importUrl,      setImportUrl]      = useState('')
  const [importing,      setImporting]      = useState(false)
  const [importError,    setImportError]    = useState<string | null>(null)
  const [importWarning,  setImportWarning]  = useState<string | null>(null)
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
    setPasteSuggested(false)
    try {
      const byText = importMode === 'text'
      const res = await fetch(byText ? '/api/recipes/import-text' : '/api/recipes/import-url', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(byText ? { text: importText } : { url: importUrl }),
      })
      const data = await res.json()
      if (!res.ok) {
        // Message humain (site bloqué, délai…) et proposition de coller le texte.
        setImportError(data.error ?? 'Import impossible')
        setPasteSuggested(!byText && !!data.paste_suggested)
        return
      }

      // Réponse v2 (data.recipe) : la fiche proposée, relue avant enregistrement.
      const r = data.recipe as ImportedRecipe
      const ingredients: IngredientRow[] = r.ingredients.map(ing => ({
        _id: uid(),
        name: ing.optional ? `${ing.name} (optionnel)` : ing.name,
        quantity: ing.quantity === null ? '' : String(ing.quantity).replace('.', ','),
        unit: ing.unit ?? '',
      }))
      const steps: StepRow[] = r.steps.map(s => ({ ...emptyStep(), description: s.text }))
      let categoryId: string | undefined
      if (r.category_hint) {
        const cats = await fetch('/api/categories').then(c => c.json()).catch(() => []) as { id: string; slug: string }[]
        categoryId = Array.isArray(cats) ? cats.find(c => c.slug === r.category_hint)?.id : undefined
      }

      setImportedValues({
        name:          r.name,
        description:   r.tip ?? '',
        categoryId,
        prepTime:      r.prep_min === null ? '' : String(r.prep_min),
        cookTime:      r.cook_min === null ? '' : String(r.cook_min),
        ...(r.servings !== null ? { servings: r.servings } : {}),
        difficulty:    r.difficulty ?? '',
        photo_url:     r.photo_url ?? undefined,
        ingredients:   ingredients.length ? ingredients : undefined,
        steps:         steps.length ? steps : undefined,
        source_url:    data.source_url,
        raw_html_hash: data.raw_html_hash,
        parser_version: data.parser_version,
      })
      const warnings = (data.warnings ?? []) as ImportWarning[]
      const fields = new Set<ReviewField>(warnings.flatMap(w => WARNING_FIELDS[w.code] ?? []))
      if (categoryId) fields.add('category')
      if (r.prep_min === null && r.cook_min === null) fields.add('times')
      const hint = (...codes: WarningCode[]) => warnings.find(w => codes.includes(w.code))?.message
      setImportReview({
        fields: Array.from(fields),
        servingsMissing: r.servings === null,
        timesEstimated: warnings.some(w => w.code === 'times_estimated'),
        hints: {
          times: hint('times_estimated', 'times_total_only', 'rest_added_to_prep'),
          servings: hint('servings_pieces', 'servings_range', 'servings_missing'),
        },
      })
      setImportMeta({ source_type: data.source_type ?? [], status: data.status, rest_min: r.rest_min })
      setImportInfo({
        source: byText ? 'ton texte' : new URL(importUrl).hostname.replace('www.', ''),
        status: data.status,
        warnings: warnings.filter(w => w.code !== 'paste_suggested').map(w => w.message),
        notes: (data.raw_notes ?? []) as string[],
        llmUsed: !!data.llm_used,
      })
      setPasteSuggested(!byText && warnings.some(w => w.code === 'paste_suggested'))
      setFormKey(k => k + 1)
    } catch {
      setImportError('Erreur réseau')
    } finally {
      setImporting(false)
    }
  }

  // Défile jusqu'au premier champ à vérifier (les temps sont tout en bas sur mobile).
  function scrollToFirstFlag() {
    const order: [ReviewField, string][] = [
      ['name', 'recipe-name'], ['category', 'recipe-category'], ['ingredients', 'sec-ingredients'],
      ['steps', 'sec-steps'], ['times', 'recipe-times'], ['servings', 'recipe-servings'], ['difficulty', 'difficulty-label'],
    ]
    const first = order.find(([f]) => importReview?.fields.includes(f))
    if (first) document.getElementById(first[1])?.scrollIntoView({ block: 'center', behavior: 'smooth' })
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
      parser_version: values.parser_version ?? null,
      import_meta:   values.source_url ? importMeta : null,
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

        {/* Import : par lien ou par texte collé. Rien n'est enregistré sans relecture. */}
        {!isPlanCtx && (
          <section className="flex flex-col rounded-[var(--kkb-r-xl)] bg-white p-5 lg:col-span-5 lg:p-6 xl:col-span-4" aria-labelledby="import-title">
            <h2 id="import-title" className="flex items-center gap-2.5 text-h3 text-[var(--kkb-profond)]">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--kkb-jaune-50)] text-[var(--kkb-jaune-text)]"><Wand2 className="h-4 w-4" /></span>
              Importer une recette
            </h2>
            <div className="mt-3 grid grid-cols-2 rounded-full bg-[var(--kkb-creme)] p-1" role="tablist" aria-label="Source de la recette">
              {([['url', 'Un lien', Link2], ['text', 'Un texte', ClipboardPaste]] as const).map(([mode, label, Icon]) => (
                <button key={mode} type="button" role="tab" aria-selected={importMode === mode}
                  onClick={() => { setImportMode(mode); setImportError(null); setPasteSuggested(false) }}
                  className={`flex h-10 items-center justify-center gap-1.5 rounded-full font-quicksand text-sm font-bold transition-colors ${importMode === mode ? 'bg-[var(--kkb-foret)] text-[var(--kkb-creme)]' : 'text-[var(--kkb-texte-2)]'}`}>
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
            <p className="mt-3 font-quicksand text-sm text-[var(--kkb-texte-2)]">
              {importMode === 'url'
                ? 'Colle l’adresse d’une recette trouvée sur le web : on remplit la fiche, tu vérifies.'
                : 'Colle le texte d’une recette (message WhatsApp, légende, notes) : on le range dans la fiche.'}
            </p>
            <div className="mt-auto pt-4">
              {importMode === 'url' ? (
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
              ) : (
                <div className="space-y-2">
                  <textarea value={importText} onChange={e => { setImportText(e.target.value); setImportError(null) }} rows={6}
                    aria-label="Texte de la recette à importer"
                    placeholder={'Sauce graine de maman\nPour 6 personnes\nIngrédients\n- 1 kg de noix de palme\n…'}
                    className={`w-full resize-y rounded-[var(--kkb-r-lg)] border-[1.5px] bg-[var(--kkb-creme)] px-4 py-3 font-quicksand text-sm text-[var(--kkb-profond)] outline-none placeholder:text-[var(--kkb-texte-2)] focus:border-[var(--kkb-foret-500)] ${importError ? 'border-[var(--kkb-danger)]' : 'border-transparent'}`} />
                  <button type="button" onClick={() => void handleImport()} disabled={importText.trim().length < 20 || importing}
                    className="flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-[var(--kkb-foret)] font-quicksand text-sm font-bold text-[var(--kkb-creme)] transition-colors hover:bg-[var(--kkb-foret-900)] disabled:opacity-50">
                    {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Ranger dans la fiche
                  </button>
                </div>
              )}
              <div aria-live="polite">
                {importError && <p className="mt-2 font-quicksand text-xs text-[var(--kkb-danger)]">{importError}</p>}
                {importWarning && <p className="mt-2 flex items-center gap-1.5 font-quicksand text-xs text-[var(--kkb-jaune-text)]"><AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {importWarning}</p>}
                {pasteSuggested && (
                  <button type="button" onClick={() => { setImportMode('text'); setImportError(null) }}
                    className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--kkb-jaune-50)] px-3.5 font-quicksand text-xs font-bold text-[var(--kkb-jaune-text)]">
                    <ClipboardPaste className="h-3.5 w-3.5" /> Coller le texte de la recette
                  </button>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Bandeau de relecture : d'où vient la fiche, ce qu'il faut vérifier, le texte non classé. */}
      {importInfo && (
        <section className="mb-4 space-y-2 rounded-[var(--kkb-r-xl)] bg-[var(--kkb-warning-light)] p-4 lg:mb-5" aria-live="polite">
          <p className="flex items-start gap-2 font-quicksand text-sm font-bold text-[var(--kkb-profond)]">
            {importInfo.status === 'complete' && !importInfo.warnings.length
              ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--kkb-foret-500)]" />
              : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--kkb-jaune-text)]" />}
            Importée depuis {importInfo.source} : vérifie avant d’enregistrer.
          </p>
          {importInfo.warnings.length > 0 && (
            <ul className="ml-6 list-disc space-y-0.5 font-quicksand text-sm text-[var(--kkb-profond)]">
              {importInfo.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          )}
          {!!importReview?.fields.length && (
            <button type="button" onClick={scrollToFirstFlag}
              className="ml-6 inline-flex h-10 items-center gap-1.5 rounded-full bg-[var(--kkb-foret)] px-4 font-quicksand text-sm font-bold text-[var(--kkb-creme)]">
              <ArrowDown className="h-4 w-4" /> Voir {importReview.fields.length > 1 ? `les ${importReview.fields.length} points` : 'le point'} à vérifier
            </button>
          )}
          {importInfo.notes.length > 0 && (
            <details className="ml-6 font-quicksand text-sm text-[var(--kkb-profond)]">
              <summary className="flex cursor-pointer list-none items-center gap-1 font-bold text-[var(--kkb-jaune-text)]">
                <ChevronDown className="h-4 w-4" /> Texte non classé ({importInfo.notes.length})
              </summary>
              <ul className="mt-1 space-y-1">
                {importInfo.notes.map((n, i) => <li key={i} className="rounded-[var(--kkb-r-md)] bg-white/70 px-3 py-2">{n}</li>)}
              </ul>
            </details>
          )}
        </section>
      )}

      <RecipeForm
        key={formKey}
        review={importReview}
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
