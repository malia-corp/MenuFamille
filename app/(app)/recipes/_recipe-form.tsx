'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Globe, ImagePlus, Lock, Minus, Plus, Search, Trash2, Users, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ── Types exportés ────────────────────────────────────────────
export interface IngredientRow { _id: string; name: string; quantity: string; unit: string }
export interface StepRow { _id: string; description: string }
export type DifficultyVal  = 'facile' | 'moyen' | 'difficile'
export type VisibilityVal  = 'private' | 'circle' | 'community'

export interface RecipeFormValues {
  name: string
  description: string
  categoryId: string
  prepTime: string
  cookTime: string
  servings: number
  difficulty: DifficultyVal | ''
  visibility: VisibilityVal
  circleId: string
  ingredients: IngredientRow[]
  steps: StepRow[]
  suggestedSides: string[]
  suggestedDrinks: string[]
  photo_url?: string
  source_url?: string
  raw_html_hash?: string
}

export interface RecipeFormProps {
  defaultValues?: Partial<RecipeFormValues>
  onSubmit: (values: RecipeFormValues) => Promise<void>
  loading: boolean
  apiError: string | null
  submitLabel?: string
  submitIcon?: React.ElementType
  hideSubmit?: boolean
  hideVisibility?: boolean
  onNameChange?: () => void
  children?: React.ReactNode
}

// ── Internals ─────────────────────────────────────────────────
interface Category { id: string; name: string; icon: string | null; slug: string }
interface Circle  { id: string; name: string }
interface AssocItem { id: string; name: string }
interface PickerRecipe { id: string; name: string; categories: { icon: string | null } | null }
type AssocScope = 'all' | 'mes' | 'famille' | 'communaute'

// Une recette de catégorie boisson ou bouillie n'a pas d'accompagnement au
// sens culinaire — pas de section à afficher dans ces cas.
const NO_ASSOCIATIONS_SLUGS = new Set(['boisson', 'bouillie-cereales'])

// Mêmes filtres que le picker de planification (/plan) — cohérence d'UX.
const ASSOC_SCOPE_OPTIONS: { val: AssocScope; label: string }[] = [
  { val: 'all',        label: 'Tout'         },
  { val: 'mes',        label: 'Mes recettes' },
  { val: 'famille',    label: 'Famille'      },
  { val: 'communaute',  label: 'Communauté'   },
]

const VISIBILITY_OPTIONS: { value: VisibilityVal; label: string; sub: string; Icon: React.ElementType }[] = [
  { value: 'private',   label: 'Seulement moi',  sub: 'Visible uniquement par vous',          Icon: Lock  },
  { value: 'circle',    label: 'Ma famille',      sub: 'Partagée avec votre cercle familial',  Icon: Users },
  { value: 'community', label: 'Communauté',      sub: 'Visible par tous les utilisateurs',    Icon: Globe },
]

const DIFFICULTY_OPTIONS: { value: DifficultyVal; label: string }[] = [
  { value: 'facile',    label: 'Facile'    },
  { value: 'moyen',     label: 'Moyen'     },
  { value: 'difficile', label: 'Difficile' },
]

export const uid = () => Math.random().toString(36).slice(2)

const INPUT = 'w-full px-3 py-2.5 rounded-xl border border-[var(--kkb-border)] bg-[var(--kkb-surface)] text-sm font-quicksand text-[var(--kkb-text-primary)] placeholder:text-[var(--kkb-text-tertiary)] focus:outline-none focus:border-[var(--kkb-coral)]'
const SMALL = 'px-2 py-2.5 rounded-xl border border-[var(--kkb-border)] bg-[var(--kkb-surface)] text-sm font-quicksand text-[var(--kkb-text-primary)] focus:outline-none focus:border-[var(--kkb-coral)]'
const SECTION = 'font-dosis font-semibold text-base text-[var(--kkb-text-primary)]'

export function RecipeForm({
  defaultValues,
  onSubmit,
  loading,
  apiError,
  submitLabel = 'Créer la recette',
  submitIcon: SubmitIcon,
  hideSubmit = false,
  hideVisibility = false,
  onNameChange,
  children,
}: RecipeFormProps) {
  const router = useRouter()

  const [name,        setName]        = useState(defaultValues?.name        ?? '')
  const [description, setDescription] = useState(defaultValues?.description ?? '')
  const [categoryId,  setCategoryId]  = useState(defaultValues?.categoryId  ?? '')
  const [prepTime,    setPrepTime]    = useState(defaultValues?.prepTime     ?? '')
  const [cookTime,    setCookTime]    = useState(defaultValues?.cookTime     ?? '')
  const [servings,    setServings]    = useState(defaultValues?.servings     ?? 4)
  const [difficulty,  setDifficulty]  = useState<DifficultyVal | ''>(defaultValues?.difficulty ?? '')
  const [visibility,  setVisibility]  = useState<VisibilityVal>(defaultValues?.visibility ?? 'private')
  const [circleId,    setCircleId]    = useState(defaultValues?.circleId    ?? '')
  const [nameError,    setNameError]    = useState<string | null>(null)
  const [circleError,  setCircleError]  = useState<string | null>(null)
  const [photoFile,    setPhotoFile]    = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(defaultValues?.photo_url ?? null)
  const [photoError,   setPhotoError]   = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)

  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    defaultValues?.ingredients ?? [{ _id: uid(), name: '', quantity: '', unit: '' }]
  )
  const [steps, setSteps] = useState<StepRow[]>(
    defaultValues?.steps ?? [{ _id: uid(), description: '' }]
  )

  const [categories, setCategories] = useState<Category[]>([])
  const [circles,    setCircles]    = useState<Circle[]>([])

  // ── Accompagnements & boissons suggérés (associations manuelles) ────────
  const [assocOpen,   setAssocOpen]   = useState(false)
  const [sideItems,   setSideItems]   = useState<AssocItem[]>([])
  const [drinkItems,  setDrinkItems]  = useState<AssocItem[]>([])
  const [assocPicker, setAssocPicker] = useState<'side' | 'drink' | null>(null)
  const [assocSearch, setAssocSearch] = useState('')
  const [assocScope,    setAssocScope]    = useState<AssocScope>('all')
  const [assocCategory, setAssocCategory] = useState<string | null>(null)
  const [assocResults, setAssocResults] = useState<PickerRecipe[]>([])
  const [assocLoading, setAssocLoading] = useState(false)
  const assocSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedCategorySlug = categories.find(c => c.id === categoryId)?.slug
  const hideAssociations = !!selectedCategorySlug && NO_ASSOCIATIONS_SLUGS.has(selectedCategorySlug)

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => { if (Array.isArray(d)) setCategories(d) }).catch(() => {})
    fetch('/api/circles').then(r => r.json()).then(d => {
      const list = Array.isArray(d?.data) ? d.data : []
      setCircles(list.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })))
    }).catch(() => {})
  }, [])

  function handleNameChange(v: string) {
    setName(v)
    setNameError(null)
    onNameChange?.()
  }

  function openAssocPicker(mode: 'side' | 'drink') {
    setAssocPicker(mode)
    setAssocSearch('')
    setAssocScope('all')
    setAssocCategory(null)
    void searchAssocRecipes('all', null, '')
  }

  async function searchAssocRecipes(scope: AssocScope, categoryId: string | null, query: string) {
    setAssocLoading(true)
    try {
      const params = new URLSearchParams({ scope })
      if (categoryId)    params.set('category_id', categoryId)
      if (query.trim())  params.set('search', query.trim())
      const res = await fetch(`/api/recipes?${params}`)
      const data = await res.json()
      setAssocResults(Array.isArray(data) ? data : [])
    } catch {
      setAssocResults([])
    } finally {
      setAssocLoading(false)
    }
  }

  function handleAssocSearch(value: string) {
    setAssocSearch(value)
    if (assocSearchTimerRef.current) clearTimeout(assocSearchTimerRef.current)
    assocSearchTimerRef.current = setTimeout(() => void searchAssocRecipes(assocScope, assocCategory, value), 300)
  }

  function handleAssocScopeChange(scope: AssocScope) {
    setAssocScope(scope)
    void searchAssocRecipes(scope, assocCategory, assocSearch)
  }

  function handleAssocCategoryChange(catId: string | null) {
    setAssocCategory(catId)
    void searchAssocRecipes(assocScope, catId, assocSearch)
  }

  function toggleAssocItem(recipe: PickerRecipe) {
    const setItems = assocPicker === 'side' ? setSideItems : setDrinkItems
    setItems(prev =>
      prev.some(i => i.id === recipe.id)
        ? prev.filter(i => i.id !== recipe.id)
        : [...prev, { id: recipe.id, name: recipe.name }]
    )
  }

  function removeAssocItem(mode: 'side' | 'drink', id: string) {
    const setItems = mode === 'side' ? setSideItems : setDrinkItems
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function addIngredient()  { setIngredients(p => [...p, { _id: uid(), name: '', quantity: '', unit: '' }]) }
  function removeIngredient(id: string) { setIngredients(p => p.length > 1 ? p.filter(i => i._id !== id) : p) }
  function updateIngredient(id: string, f: keyof Omit<IngredientRow, '_id'>, v: string) {
    setIngredients(p => p.map(i => i._id === id ? { ...i, [f]: v } : i))
  }

  function addStep()  { setSteps(p => [...p, { _id: uid(), description: '' }]) }
  function removeStep(id: string) { setSteps(p => p.length > 1 ? p.filter(s => s._id !== id) : p) }
  function updateStep(id: string, v: string) { setSteps(p => p.map(s => s._id === id ? { ...s, description: v } : s)) }

  async function handleSubmit() {
    setNameError(null)
    setCircleError(null)
    if (!name.trim() || name.trim().length < 2) { setNameError('Minimum 2 caractères'); return }
    if (visibility === 'circle' && !circleId)   { setCircleError('Sélectionne un cercle familial'); return }

    let resolvedPhotoUrl = defaultValues?.photo_url ?? undefined
    if (photoFile) {
      setPhotoUploading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const ext = photoFile.name.split('.').pop()
      const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { data: upload, error: uploadErr } = await supabase.storage
        .from('recipe-photos')
        .upload(path, photoFile, { upsert: false })
      setPhotoUploading(false)
      if (uploadErr) { setPhotoError(uploadErr.message ?? 'Erreur upload photo'); return }
      const { data: { publicUrl } } = supabase.storage.from('recipe-photos').getPublicUrl(upload.path)
      resolvedPhotoUrl = publicUrl
    } else if (photoPreview === null) {
      resolvedPhotoUrl = undefined
    }

    await onSubmit({
      name, description, categoryId, prepTime, cookTime, servings, difficulty, visibility, circleId,
      ingredients, steps,
      suggestedSides:  sideItems.map(i => i.id),
      suggestedDrinks: drinkItems.map(i => i.id),
      photo_url: resolvedPhotoUrl,
      source_url: defaultValues?.source_url,
      raw_html_hash: defaultValues?.raw_html_hash,
    })
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-4 space-y-6 pb-10">

      {/* ── Photo ────────────────────────────────────── */}
      <section className="space-y-2">
        <h2 className={SECTION}>Photo</h2>

        {photoPreview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoPreview} alt="Aperçu" className="w-full h-40 object-cover rounded-xl" />
            <button type="button"
              onClick={() => { setPhotoFile(null); setPhotoPreview(null); setPhotoError(null) }}
              className="absolute top-2 right-2 bg-white/80 rounded-full p-1 hover:bg-white transition-colors"
              aria-label="Supprimer la photo">
              <X className="h-4 w-4 text-[var(--kkb-text-primary)]" />
            </button>
          </div>
        ) : (
          <label htmlFor="photo-upload" className="cursor-pointer block w-full">
            <div className="flex flex-col items-center gap-2 py-6 rounded-xl border-2 border-dashed border-[var(--kkb-border)] bg-[var(--kkb-surface)] hover:border-[var(--kkb-coral)] transition-colors">
              <ImagePlus className="h-6 w-6 text-[var(--kkb-text-tertiary)]" />
              <p className="text-xs font-quicksand text-[var(--kkb-text-tertiary)]">
                Ajouter une photo JPG, PNG ou GIF (max 5 Mo)
              </p>
            </div>
            <input id="photo-upload" type="file" accept="image/jpeg,image/png,image/gif"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (!file) return
                if (file.size > 5 * 1024 * 1024) { setPhotoError('Fichier trop lourd (max 5 Mo)'); return }
                setPhotoFile(file)
                setPhotoPreview(URL.createObjectURL(file))
                setPhotoError(null)
              }} />
          </label>
        )}
        {photoError && <p className="text-xs text-red-600 font-quicksand">{photoError}</p>}
      </section>

      {/* ── Informations ─────────────────────────────── */}
      <section className="space-y-3">
        <h2 className={SECTION}>Informations</h2>

        <div className="space-y-1">
          <input type="text" placeholder="Nom de la recette *" aria-label="Nom de la recette" value={name}
            onChange={e => handleNameChange(e.target.value)}
            className={`${INPUT} ${nameError ? 'border-red-400' : ''}`} />
          {nameError && <p className="text-xs text-red-500 font-quicksand px-1">{nameError}</p>}
        </div>

        <textarea placeholder="Astuce ou description (optionnel)" aria-label="Astuce ou description" value={description}
          onChange={e => setDescription(e.target.value)} rows={2}
          className={`${INPUT} resize-none`} />

        <select value={categoryId} onChange={e => setCategoryId(e.target.value)} aria-label="Catégorie" className={INPUT}>
          <option value="">Catégorie (optionnel)</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
          ))}
        </select>
      </section>

      {/* ── Temps & Portions ─────────────────────────── */}
      <section className="space-y-3">
        <h2 className={SECTION}>Temps & Portions</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="recipe-prep-time" className="text-xs font-quicksand text-[var(--kkb-text-tertiary)] mb-1 block">Préparation</label>
            <div className="flex items-center gap-1.5">
              <input id="recipe-prep-time" type="number" min="0" placeholder="0" value={prepTime}
                onChange={e => setPrepTime(e.target.value)} className={`${INPUT} flex-1`} />
              <span className="text-xs font-quicksand text-[var(--kkb-text-tertiary)]">min</span>
            </div>
          </div>
          <div>
            <label htmlFor="recipe-cook-time" className="text-xs font-quicksand text-[var(--kkb-text-tertiary)] mb-1 block">Cuisson</label>
            <div className="flex items-center gap-1.5">
              <input id="recipe-cook-time" type="number" min="0" placeholder="0" value={cookTime}
                onChange={e => setCookTime(e.target.value)} className={`${INPUT} flex-1`} />
              <span className="text-xs font-quicksand text-[var(--kkb-text-tertiary)]">min</span>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-quicksand text-[var(--kkb-text-tertiary)] mb-2 block">Nombre de portions *</label>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setServings(s => Math.max(1, s - 1))} disabled={servings <= 1}
              aria-label="Diminuer le nombre de portions"
              className="w-8 h-8 rounded-full flex items-center justify-center border border-[var(--kkb-border)] text-[var(--kkb-text-secondary)] disabled:opacity-40 hover:border-[var(--kkb-coral)] hover:text-[var(--kkb-coral)] transition-colors">
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-6 text-center font-dosis font-bold text-lg text-[var(--kkb-text-primary)]">{servings}</span>
            <button type="button" onClick={() => setServings(s => s + 1)}
              aria-label="Augmenter le nombre de portions"
              className="w-8 h-8 rounded-full flex items-center justify-center border border-[var(--kkb-border)] text-[var(--kkb-text-secondary)] hover:border-[var(--kkb-coral)] hover:text-[var(--kkb-coral)] transition-colors">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-quicksand text-[var(--kkb-text-tertiary)] mb-1.5 block">Difficulté</label>
          <div className="flex gap-2">
            {DIFFICULTY_OPTIONS.map(opt => (
              <button key={opt.value} type="button"
                onClick={() => setDifficulty(p => p === opt.value ? '' : opt.value)}
                className={`flex-1 py-2 rounded-xl text-xs font-quicksand font-medium border transition-colors ${
                  difficulty === opt.value
                    ? 'bg-[var(--kkb-coral)] text-white border-[var(--kkb-coral)]'
                    : 'bg-white border-[var(--kkb-border)] text-[var(--kkb-text-secondary)]'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Visibilité ───────────────────────────────── */}
      {!hideVisibility && (
        <section className="space-y-3">
          <h2 className={SECTION}>Visibilité</h2>

          <div className="space-y-2">
            {VISIBILITY_OPTIONS.map(opt => {
              const Icon = opt.Icon
              const selected = visibility === opt.value
              return (
                <button key={opt.value} type="button" onClick={() => setVisibility(opt.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                    selected ? 'border-[var(--kkb-coral)] bg-[var(--kkb-coral-light)]' : 'border-[var(--kkb-border)] bg-white'
                  }`}>
                  <Icon className={`h-5 w-5 flex-shrink-0 ${selected ? 'text-[var(--kkb-coral)]' : 'text-[var(--kkb-text-tertiary)]'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-quicksand font-medium ${selected ? 'text-[var(--kkb-coral)]' : 'text-[var(--kkb-text-primary)]'}`}>{opt.label}</p>
                    <p className="text-xs font-quicksand text-[var(--kkb-text-tertiary)]">{opt.sub}</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${
                    selected ? 'border-[var(--kkb-coral)] bg-[var(--kkb-coral)]' : 'border-[var(--kkb-border)]'
                  }`} />
                </button>
              )
            })}
          </div>

          {visibility === 'circle' && (
            circles.length === 0 ? (
              <p className="text-xs font-quicksand text-[var(--kkb-text-tertiary)] px-1">
                Aucun cercle.{' '}
                <span className="text-[var(--kkb-coral)] underline cursor-pointer"
                  onClick={() => router.push('/circle')}>
                  Créer un cercle familial
                </span>
              </p>
            ) : (
              <div className="space-y-1">
                <select value={circleId} onChange={e => { setCircleId(e.target.value); setCircleError(null) }} aria-label="Cercle familial" className={INPUT}>
                  <option value="">Choisir un cercle *</option>
                  {circles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {circleError && <p className="text-xs text-red-500 font-quicksand px-1">{circleError}</p>}
              </div>
            )
          )}
        </section>
      )}

      {/* ── Ingrédients ──────────────────────────────── */}
      <section className="space-y-3">
        <h2 className={SECTION}>Ingrédients</h2>

        <div className="space-y-2">
          {ingredients.map((ing, idx) => (
            <div key={ing._id} className="flex items-center gap-1.5">
              <input type="number" min="0" placeholder="Qté" aria-label={`Quantité de l'ingrédient ${idx + 1}`} value={ing.quantity}
                onChange={e => updateIngredient(ing._id, 'quantity', e.target.value)}
                className={`${SMALL} w-14 text-center`} />
              <input type="text" placeholder="Unité" aria-label={`Unité de l'ingrédient ${idx + 1}`} value={ing.unit}
                onChange={e => updateIngredient(ing._id, 'unit', e.target.value)}
                className={`${SMALL} w-16`} />
              <input type="text" placeholder={`Ingrédient ${idx + 1}`} aria-label={`Nom de l'ingrédient ${idx + 1}`} value={ing.name}
                onChange={e => updateIngredient(ing._id, 'name', e.target.value)}
                className={`${SMALL} flex-1 min-w-0`} />
              <button type="button" onClick={() => removeIngredient(ing._id)} disabled={ingredients.length === 1}
                className="p-1.5 text-[var(--kkb-text-tertiary)] hover:text-red-500 disabled:opacity-30 transition-colors flex-shrink-0"
                aria-label="Supprimer">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <button type="button" onClick={addIngredient}
          className="flex items-center gap-1.5 text-sm font-quicksand font-medium text-[var(--kkb-coral)] hover:opacity-80">
          <Plus className="h-4 w-4" /> Ajouter un ingrédient
        </button>
      </section>

      {/* ── Préparation ──────────────────────────────── */}
      <section className="space-y-3">
        <h2 className={SECTION}>Préparation</h2>

        <div className="space-y-3">
          {steps.map((step, idx) => (
            <div key={step._id} className="flex gap-2">
              <div className="flex-shrink-0 w-6 h-6 mt-2.5 rounded-full bg-[var(--kkb-coral)] flex items-center justify-center">
                <span className="text-xs font-dosis font-bold text-white">{idx + 1}</span>
              </div>
              <textarea placeholder={`Étape ${idx + 1}…`} aria-label={`Description de l'étape ${idx + 1}`} value={step.description}
                onChange={e => updateStep(step._id, e.target.value)} rows={2}
                className="flex-1 px-3 py-2 rounded-xl border border-[var(--kkb-border)] bg-[var(--kkb-surface)] text-sm font-quicksand text-[var(--kkb-text-primary)] placeholder:text-[var(--kkb-text-tertiary)] focus:outline-none focus:border-[var(--kkb-coral)] resize-none" />
              <button type="button" onClick={() => removeStep(step._id)} disabled={steps.length === 1}
                className="p-1.5 mt-2 text-[var(--kkb-text-tertiary)] hover:text-red-500 disabled:opacity-30 transition-colors flex-shrink-0"
                aria-label="Supprimer">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <button type="button" onClick={addStep}
          className="flex items-center gap-1.5 text-sm font-quicksand font-medium text-[var(--kkb-coral)] hover:opacity-80">
          <Plus className="h-4 w-4" /> Ajouter une étape
        </button>
      </section>

      {/* ── Accompagnements & boissons suggérés ────────── */}
      {!hideAssociations && (
        <section className="space-y-3">
          <button type="button" onClick={() => setAssocOpen(o => !o)}
            className="w-full flex items-center justify-between">
            <span className={SECTION}>Accompagnements & boissons suggérés</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-quicksand text-[var(--kkb-text-tertiary)]">optionnel</span>
              <ChevronDown className={`h-4 w-4 text-[var(--kkb-text-tertiary)] transition-transform ${assocOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {assocOpen && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-quicksand font-semibold text-[var(--kkb-text-secondary)]">Accompagnements</p>
                <div className="flex flex-wrap gap-1.5">
                  {sideItems.map(item => (
                    <span key={item.id}
                      className="flex items-center gap-1 bg-[var(--kkb-coral-light)] border border-[var(--kkb-border)] rounded-full px-2.5 py-1 text-xs font-quicksand text-[var(--kkb-text-primary)]">
                      {item.name}
                      <button type="button" onClick={() => removeAssocItem('side', item.id)} aria-label={`Retirer ${item.name}`}>
                        <X className="h-3 w-3 text-[var(--kkb-text-tertiary)] hover:text-red-500" />
                      </button>
                    </span>
                  ))}
                  <button type="button" onClick={() => openAssocPicker('side')}
                    className="flex items-center gap-1 border border-dashed border-[var(--kkb-coral)]/40 rounded-full px-2.5 py-1 text-xs font-quicksand text-[var(--kkb-coral)]">
                    <Plus className="h-3 w-3" /> Ajouter
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-quicksand font-semibold text-[var(--kkb-text-secondary)]">Boissons</p>
                <div className="flex flex-wrap gap-1.5">
                  {drinkItems.map(item => (
                    <span key={item.id}
                      className="flex items-center gap-1 bg-[var(--kkb-coral-light)] border border-[var(--kkb-border)] rounded-full px-2.5 py-1 text-xs font-quicksand text-[var(--kkb-text-primary)]">
                      {item.name}
                      <button type="button" onClick={() => removeAssocItem('drink', item.id)} aria-label={`Retirer ${item.name}`}>
                        <X className="h-3 w-3 text-[var(--kkb-text-tertiary)] hover:text-red-500" />
                      </button>
                    </span>
                  ))}
                  <button type="button" onClick={() => openAssocPicker('drink')}
                    className="flex items-center gap-1 border border-dashed border-[var(--kkb-coral)]/40 rounded-full px-2.5 py-1 text-xs font-quicksand text-[var(--kkb-coral)]">
                    <Plus className="h-3 w-3" /> Ajouter
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Feuille de sélection accompagnement/boisson ── */}
      {assocPicker && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setAssocPicker(null)} aria-hidden="true" />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--kkb-bg)] rounded-t-2xl shadow-xl flex flex-col max-h-[75vh]">
            <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-[var(--kkb-border)]" />
            </div>
            <div className="flex items-center justify-between px-4 pb-2 flex-shrink-0">
              <p className="font-dosis font-bold text-base text-[var(--kkb-text-primary)]">
                {assocPicker === 'side' ? 'Choisir un accompagnement' : 'Choisir une boisson'}
              </p>
              <button type="button" onClick={() => setAssocPicker(null)} className="p-1.5 -mr-1 text-[var(--kkb-text-tertiary)]" aria-label="Fermer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-4 pb-2 flex-shrink-0">
              <div className="flex items-center gap-2 bg-[var(--kkb-coral-light)] border border-[var(--kkb-border)] rounded-xl px-3 py-2">
                <Search className="h-4 w-4 text-[var(--kkb-text-tertiary)] flex-shrink-0" />
                <input type="search" placeholder="Chercher une recette…" aria-label="Chercher une recette" value={assocSearch}
                  onChange={e => handleAssocSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm font-quicksand text-[var(--kkb-text-primary)] placeholder:text-[var(--kkb-text-tertiary)] outline-none"
                  autoFocus />
              </div>
            </div>

            {/* Pills scope */}
            <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto scrollbar-hide flex-shrink-0">
              {ASSOC_SCOPE_OPTIONS.map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => handleAssocScopeChange(opt.val)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-quicksand font-bold transition-colors ${
                    assocScope === opt.val
                      ? 'bg-[var(--kkb-coral)] text-white'
                      : 'bg-[var(--kkb-coral-light)] text-[var(--kkb-text-secondary)] border border-[var(--kkb-border)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Pills catégorie */}
            {categories.length > 0 && (
              <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto scrollbar-hide flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleAssocCategoryChange(null)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-quicksand font-bold transition-colors ${
                    assocCategory === null
                      ? 'bg-[var(--kkb-coral)] text-white'
                      : 'bg-[var(--kkb-coral-light)] text-[var(--kkb-text-secondary)] border border-[var(--kkb-border)]'
                  }`}
                >
                  Tous
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleAssocCategoryChange(cat.id)}
                    className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-quicksand font-bold transition-colors ${
                      assocCategory === cat.id
                        ? 'bg-[var(--kkb-coral)] text-white'
                        : 'bg-[var(--kkb-coral-light)] text-[var(--kkb-text-secondary)] border border-[var(--kkb-border)]'
                    }`}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>
            )}

            <div className="border-t border-[var(--kkb-border)] flex-shrink-0" />
            <div className="overflow-y-auto flex-1">
              {assocLoading ? (
                <div className="flex justify-center py-8">
                  <span className="text-xs font-quicksand text-[var(--kkb-text-tertiary)]">Chargement…</span>
                </div>
              ) : assocResults.length === 0 ? (
                <p className="text-sm font-quicksand text-[var(--kkb-text-tertiary)] text-center py-8">Aucune recette trouvée</p>
              ) : (
                assocResults.map(recipe => {
                  const selected = (assocPicker === 'side' ? sideItems : drinkItems).some(i => i.id === recipe.id)
                  return (
                    <button key={recipe.id} type="button" onClick={() => toggleAssocItem(recipe)}
                      className="w-full flex items-center gap-3 px-4 py-3 border-b border-[var(--kkb-border)]/40 last:border-0 hover:bg-[var(--kkb-coral-light)] transition-colors">
                      <span className="text-xl flex-shrink-0">{recipe.categories?.icon ?? '🍴'}</span>
                      <span className="flex-1 min-w-0 text-left text-sm font-quicksand font-medium text-[var(--kkb-text-primary)] truncate">
                        {recipe.name}
                      </span>
                      {selected && <X className="h-4 w-4 text-[var(--kkb-coral)] flex-shrink-0" />}
                    </button>
                  )
                })
              )}
            </div>
            <div className="p-3 flex-shrink-0">
              <button type="button" onClick={() => setAssocPicker(null)}
                className="w-full py-2.5 rounded-xl bg-[var(--kkb-coral)] text-white font-quicksand font-semibold text-sm">
                Terminé
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Erreur API + contenu injecté ─────────────── */}
      {apiError && <p className="text-sm text-red-600 font-quicksand px-1">{apiError}</p>}
      {children}

      {/* ── Bouton principal ─────────────────────────── */}
      {!hideSubmit && (
        <button type="button" onClick={handleSubmit} disabled={loading || photoUploading}
          className="w-full py-3.5 rounded-xl bg-[var(--kkb-coral)] text-white font-quicksand font-semibold text-sm hover:bg-[var(--kkb-coral-hover)] disabled:opacity-60 transition-colors">
          {photoUploading ? 'Upload photo…' : loading ? 'En cours…' : SubmitIcon ? (
            <span className="flex items-center justify-center gap-2">
              <SubmitIcon className="h-4 w-4" />
              {submitLabel}
            </span>
          ) : submitLabel}
        </button>
      )}
    </div>
  )
}
