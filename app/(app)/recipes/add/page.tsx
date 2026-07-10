'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, Link as LinkIcon } from 'lucide-react'
import { RecipeForm, RecipeFormValues, uid, IngredientRow, StepRow } from '../_recipe-form'

type ConflictChoice = 'use' | 'variant' | 'independent'

const INPUT = 'w-full px-3 py-2.5 rounded-xl border border-[var(--mf-border-warm)] bg-[var(--mf-bg-card-alt)] text-sm font-quicksand text-[var(--mf-text-primary)] placeholder:text-[var(--mf-text-tertiary)] focus:outline-none focus:border-[var(--mf-primary)]'

export default function RecipeAddPage() {
  const router = useRouter()

  const [loading, setLoading]         = useState(false)
  const [error,   setError]           = useState<string | null>(null)
  const [lastValues, setLastValues]   = useState<RecipeFormValues | null>(null)
  const [conflict, setConflict]       = useState<{ id: string; name: string } | null>(null)
  const [conflictChoice, setConflictChoice] = useState<ConflictChoice>('use')
  const [variantLabel, setVariantLabel]     = useState('')

  // Import URL
  const [importUrl,     setImportUrl]     = useState('')
  const [importing,     setImporting]     = useState(false)
  const [importError,   setImportError]   = useState<string | null>(null)
  const [importWarning, setImportWarning] = useState<string | null>(null)
  const [importDomain,  setImportDomain]  = useState<string | null>(null)
  const [formKey,        setFormKey]        = useState(0)
  const [importedValues, setImportedValues] = useState<Partial<RecipeFormValues>>({})

  async function handleImport() {
    setImporting(true)
    setImportError(null)
    setImportWarning(null)
    try {
      const res = await fetch('/api/recipes/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl }),
      })
      const data = await res.json()
      if (!res.ok) { setImportError(data.error ?? 'Erreur import'); return }

      // Mapper string[] → IngredientRow[] / StepRow[]
      const rawIngredients = (data.partial.ingredients ?? []) as unknown[]
      const rawSteps       = (data.partial.steps       ?? []) as unknown[]

      const mappedIngredients: IngredientRow[] = rawIngredients.map((ing: unknown) => ({
        _id:      uid(),
        name:     typeof ing === 'string' ? ing : String(ing),
        quantity: '',
        unit:     '',
      }))
      const mappedSteps: StepRow[] = rawSteps.map((s: unknown) => ({
        _id:         uid(),
        description: typeof s === 'string' ? s : String(s),
      }))

      setImportedValues({
        ...data.partial,
        ingredients:   mappedIngredients.length ? mappedIngredients : undefined,
        steps:         mappedSteps.length       ? mappedSteps       : undefined,
        source_url:    data.source_url,
        raw_html_hash: data.raw_html_hash,
      })
      setImportDomain(new URL(importUrl).hostname.replace('www.', ''))
      setFormKey(k => k + 1)

      if (!data.success) {
        setImportWarning('Ingrédients non détectés — vérifiez et complétez manuellement')
      }
    } catch {
      setImportError('Erreur réseau')
    } finally {
      setImporting(false)
    }
  }

  async function callApi(values: RecipeFormValues, opts: { force?: boolean; parentId?: string; variantLabelVal?: string } = {}) {
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
      visibility:    values.visibility,
      circle_id:     values.visibility === 'circle' ? values.circleId : null,
      ingredients:   values.ingredients.filter(i => i.name.trim()),
      steps:         values.steps.filter(s => s.description.trim()),
      photo_url:     values.photo_url ?? null,
      source_url:    values.source_url ?? null,
      raw_html_hash: values.raw_html_hash ?? null,
    }
    if (opts.force)    body.force            = true
    if (opts.parentId) {
      body.parent_recipe_id = opts.parentId
      body.variant_label    = opts.variantLabelVal?.trim() || null
    }

    const res  = await fetch('/api/recipes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setLoading(false)

    if (res.status === 409 && data.conflict) {
      setConflict(data.existing)
      setConflictChoice('use')
      return
    }
    if (!res.ok) {
      setError(data?.error ?? 'Erreur lors de la création')
      return
    }
    router.push(`/recipes/${data.id}`)
  }

  async function handleFormSubmit(values: RecipeFormValues) {
    setLastValues(values)
    await callApi(values)
  }

  async function confirmConflict() {
    if (!conflict || !lastValues) return
    if (conflictChoice === 'use') {
      await fetch(`/api/recipes/${conflict.id}/favorite`, { method: 'POST' })
      router.push(`/recipes/${conflict.id}`)
      return
    }
    if (conflictChoice === 'variant') {
      if (!variantLabel.trim()) { setError('Indique un nom pour cette variante'); return }
      await callApi(lastValues, { parentId: conflict.id, variantLabelVal: variantLabel })
      return
    }
    await callApi(lastValues, { force: true })
  }

  return (
    <>
      {/* Sub-header */}
      <div className="sticky top-14 z-30 bg-[var(--mf-bg-page)] border-b border-[var(--mf-border-warm)] px-4 h-10 flex items-center gap-2.5">
        <button type="button" onClick={() => router.back()}
          className="p-1 -ml-1 text-[var(--mf-text-secondary)] hover:text-[var(--mf-primary)]" aria-label="Retour">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <p className="font-dosis font-semibold text-sm text-[var(--mf-text-primary)]">Nouvelle recette</p>
      </div>

      {/* Bloc import URL */}
      <div className="max-w-sm mx-auto px-4 pt-4 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--mf-text-tertiary)]" />
            <input
              type="url"
              placeholder="Coller un lien de recette…"
              value={importUrl}
              onChange={e => { setImportUrl(e.target.value); setImportError(null); setImportWarning(null) }}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--mf-border-warm)] bg-[var(--mf-bg-card-alt)] text-sm font-quicksand text-[var(--mf-text-primary)] placeholder:text-[var(--mf-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--mf-primary)]/30"
            />
          </div>
          <button
            type="button"
            onClick={handleImport}
            disabled={!importUrl.trim() || importing}
            className="bg-[var(--mf-primary)] text-white rounded-xl px-3 disabled:opacity-50 flex items-center hover:bg-[var(--mf-primary-hover)] transition-colors"
            aria-label="Importer la recette"
          >
            {importing
              ? <span className="text-xs font-quicksand px-1">…</span>
              : <Download className="h-4 w-4" />}
          </button>
        </div>
        {importDomain && (
          <p className="text-[11px] font-quicksand text-[var(--mf-text-tertiary)]">
            Importée depuis {importDomain} — vérifiez et complétez si nécessaire
          </p>
        )}
        {importWarning && (
          <p className="text-[11px] font-quicksand text-amber-700 bg-amber-50 px-2 py-1.5 rounded-lg">
            ⚠ {importWarning}
          </p>
        )}
        {importError && <p className="text-xs text-red-600 font-quicksand">{importError}</p>}
      </div>

      <RecipeForm
        key={formKey}
        defaultValues={importedValues}
        onSubmit={handleFormSubmit}
        loading={loading}
        apiError={error}
        submitLabel="Créer la recette"
        hideSubmit={!!conflict}
        onNameChange={() => setConflict(null)}
      >
        {/* Dialogue doublon (décision CDC 5.3.2) */}
        {conflict && (
          <div className="bg-[var(--mf-gold-bg)] border border-[var(--mf-gold)]/40 rounded-xl p-4 space-y-3">
            <p className="text-sm font-quicksand font-medium text-[var(--mf-text-primary)]">
              Une recette similaire existe déjà :{' '}
              <span className="font-semibold">&ldquo;{conflict.name}&rdquo;</span>
            </p>

            <div className="space-y-2">
              {[
                { val: 'use' as ConflictChoice,         label: 'Utiliser cette recette', sub: 'Ouvrir la recette existante' },
                { val: 'variant' as ConflictChoice,     label: 'Créer comme variante',   sub: 'Liée à la recette originale' },
                { val: 'independent' as ConflictChoice, label: 'Créer indépendamment',   sub: 'Ignorer la similarité' },
              ].map(opt => (
                <button key={opt.val} type="button" onClick={() => setConflictChoice(opt.val)}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${
                    conflictChoice === opt.val
                      ? 'border-[var(--mf-primary)] bg-white'
                      : 'border-[var(--mf-border-warm)] bg-white/60'
                  }`}>
                  <div className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 transition-colors ${
                    conflictChoice === opt.val
                      ? 'border-[var(--mf-primary)] bg-[var(--mf-primary)]'
                      : 'border-[var(--mf-border-warm)]'
                  }`} />
                  <div>
                    <p className="text-xs font-quicksand font-semibold text-[var(--mf-text-primary)]">{opt.label}</p>
                    <p className="text-xs font-quicksand text-[var(--mf-text-tertiary)]">{opt.sub}</p>
                  </div>
                </button>
              ))}
            </div>

            {conflictChoice === 'variant' && (
              <input type="text" placeholder="Nom de votre variante (ex : version légère)"
                value={variantLabel} onChange={e => setVariantLabel(e.target.value)}
                className={INPUT} />
            )}

            <button type="button" onClick={confirmConflict} disabled={loading}
              className="w-full py-3 rounded-xl bg-[var(--mf-primary)] text-white font-quicksand font-semibold text-sm hover:bg-[var(--mf-primary-hover)] disabled:opacity-60 transition-colors">
              {loading ? 'En cours…' : 'Confirmer'}
            </button>
          </div>
        )}
      </RecipeForm>
    </>
  )
}
