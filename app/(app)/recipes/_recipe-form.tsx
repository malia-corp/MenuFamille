'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Camera, Check, ChevronDown, Clock, CupSoda, Globe, ImagePlus, Loader2, Lock, Minus, Plus, Salad,
  Search, Star, Timer, Trash2, Users, UtensilsCrossed, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { categoryIcon } from '@/lib/constants/category-icon'

// ── Types exportés ────────────────────────────────────────────
export interface IngredientRow { _id: string; name: string; quantity: string; unit: string }
export interface StepRow { _id: string; description: string }
export interface AssocItem { id: string; name: string }
export type DifficultyVal = 'facile' | 'moyen' | 'difficile'
export type VisibilityVal = 'private' | 'circle' | 'community'

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
  sideItems: AssocItem[]
  drinkItems: AssocItem[]
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
  hideVisibility?: boolean
  // Brouillon local (création uniquement) : sauvegarde auto 2 s après la dernière saisie
  draftKey?: string
}

export const uid = () => Math.random().toString(36).slice(2)
export const emptyIngredient = (): IngredientRow => ({ _id: uid(), name: '', quantity: '', unit: '' })
export const emptyStep = (): StepRow => ({ _id: uid(), description: '' })

export function clearRecipeDraft(key: string) {
  try { localStorage.removeItem(key) } catch { /* stockage indisponible */ }
}

// ── Internals ─────────────────────────────────────────────────
interface Category { id: string; name: string; slug: string }
interface Circle  { id: string; name: string }
interface PickerRecipe { id: string; name: string; description: string | null }
type AssocScope = 'all' | 'mes' | 'famille' | 'communaute'
type DraftStatus = 'idle' | 'saving' | 'saved'

// Pas d'accompagnement au sens culinaire pour une boisson ou une bouillie.
const NO_ASSOCIATIONS_SLUGS = new Set(['boisson', 'bouillie-cereales'])
const DRAFT_DELAY_MS = 2000

// Un brouillon ne vaut la peine d'être gardé que s'il contient une saisie.
function isMeaningful(d: { name?: string; description?: string; ingredients?: IngredientRow[]; steps?: StepRow[] }) {
  return !!(d.name?.trim() || d.description?.trim()
    || d.ingredients?.some(i => i.name.trim()) || d.steps?.some(s => s.description.trim()))
}

const ASSOC_SCOPE_OPTIONS: { val: AssocScope; label: string }[] = [
  { val: 'all',        label: 'Tout'         },
  { val: 'mes',        label: 'Mes recettes' },
  { val: 'famille',    label: 'Famille'      },
  { val: 'communaute', label: 'Communauté'   },
]

const VISIBILITY_OPTIONS: { value: VisibilityVal; label: string; sub: string; Icon: typeof Lock }[] = [
  { value: 'private',   label: 'Seulement moi', sub: 'Visible uniquement par vous',                                           Icon: Lock  },
  { value: 'circle',    label: 'Ma famille',    sub: 'Partagée avec votre cercle familial pour les repas et votes.',          Icon: Users },
  { value: 'community', label: 'Communauté',    sub: "Visible et inspirante pour tous les foyers utilisateurs de l'app.",    Icon: Globe },
]

const DIFFICULTY_OPTIONS: { value: DifficultyVal; label: string }[] = [
  { value: 'facile', label: 'Facile' }, { value: 'moyen', label: 'Moyen' }, { value: 'difficile', label: 'Difficile' },
]

const LABEL   = 'mb-1.5 block text-[11px] font-quicksand font-bold uppercase tracking-wide text-[var(--kkb-text-tertiary)]'
const FIELD   = 'rounded-[var(--kkb-radius-sm)] border border-[var(--kkb-border)] bg-white px-3.5 py-2.5 text-sm font-quicksand text-[var(--kkb-text-primary)] outline-none placeholder:text-[var(--kkb-text-tertiary)] focus:border-[var(--kkb-coral)]'
const INPUT   = `w-full ${FIELD}`
const CARD    = 'space-y-4 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-4 lg:p-5'
const TITLE   = 'font-dosis font-bold text-lg text-[var(--kkb-text-primary)]'
const ADD_BTN = 'flex items-center gap-1.5 text-sm font-quicksand font-semibold text-[var(--kkb-coral)] hover:opacity-80'

function MinuteStepper({ id, label, icon: Icon, value, onChange }: {
  id: string; label: string; icon: typeof Clock; value: string; onChange: (v: string) => void
}) {
  const n = Number(value) || 0
  const step = (d: number) => onChange(String(Math.max(0, n + d)))
  return (
    <div className="rounded-[var(--kkb-radius-sm)] border border-[var(--kkb-border)] bg-white p-2.5">
      <label htmlFor={id} className="flex items-center gap-1 text-[10px] font-quicksand font-bold uppercase tracking-wide text-[var(--kkb-text-tertiary)]">
        <Icon className="h-3 w-3" /> {label}
      </label>
      <div className="mt-1 flex items-center gap-1">
        <button type="button" onClick={() => step(-5)} aria-label={`Moins 5 minutes (${label.toLowerCase()})`} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--kkb-border)] text-[var(--kkb-text-secondary)]"><Minus className="h-3.5 w-3.5" /></button>
        <input id={id} type="number" min={0} inputMode="numeric" value={value} placeholder="0" onChange={e => onChange(e.target.value)}
          className="w-full min-w-0 bg-transparent text-center font-quicksand font-bold text-lg text-[var(--kkb-text-primary)] outline-none" />
        <button type="button" onClick={() => step(5)} aria-label={`Plus 5 minutes (${label.toLowerCase()})`} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--kkb-border)] text-[var(--kkb-text-secondary)]"><Plus className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  )
}

export function RecipeForm({
  defaultValues, onSubmit, loading, apiError, submitLabel = 'Enregistrer la recette', hideVisibility = false, draftKey,
}: RecipeFormProps) {
  const router = useRouter()

  const [name,        setName]        = useState(defaultValues?.name        ?? '')
  const [description, setDescription] = useState(defaultValues?.description ?? '')
  const [categoryId,  setCategoryId]  = useState(defaultValues?.categoryId  ?? '')
  const [prepTime,    setPrepTime]    = useState(defaultValues?.prepTime    ?? '')
  const [cookTime,    setCookTime]    = useState(defaultValues?.cookTime    ?? '')
  const [servings,    setServings]    = useState(defaultValues?.servings    ?? 4)
  const [difficulty,  setDifficulty]  = useState<DifficultyVal | ''>(defaultValues?.difficulty ?? 'moyen')
  // Toujours "Seulement moi" par défaut (contrainte produit)
  const [visibility,  setVisibility]  = useState<VisibilityVal>(defaultValues?.visibility ?? 'private')
  const [circleId,    setCircleId]    = useState(defaultValues?.circleId    ?? '')
  const [ingredients, setIngredients] = useState<IngredientRow[]>(defaultValues?.ingredients?.length ? defaultValues.ingredients : [emptyIngredient()])
  const [steps,       setSteps]       = useState<StepRow[]>(defaultValues?.steps?.length ? defaultValues.steps : [emptyStep()])
  const [sideItems,   setSideItems]   = useState<AssocItem[]>(defaultValues?.sideItems ?? [])
  const [drinkItems,  setDrinkItems]  = useState<AssocItem[]>(defaultValues?.drinkItems ?? [])

  const [nameError,    setNameError]    = useState<string | null>(null)
  const [circleError,  setCircleError]  = useState<string | null>(null)
  const [photoFile,    setPhotoFile]    = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(defaultValues?.photo_url ?? null)
  const [photoError,   setPhotoError]   = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)

  const [categories, setCategories] = useState<Category[]>([])
  const [circles,    setCircles]    = useState<Circle[]>([])

  const [assocOpen,     setAssocOpen]     = useState(false)
  const [assocPicker,   setAssocPicker]   = useState<'side' | 'drink' | null>(null)
  const [assocSearch,   setAssocSearch]   = useState('')
  const [assocScope,    setAssocScope]    = useState<AssocScope>('all')
  const [assocCategory, setAssocCategory] = useState<string | null>(null)
  const [assocResults,  setAssocResults]  = useState<PickerRecipe[]>([])
  const [assocLoading,  setAssocLoading]  = useState(false)
  const assocTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [draftStatus,   setDraftStatus]   = useState<DraftStatus>('idle')
  const [draftRestored, setDraftRestored] = useState(false)
  const draftReady = useRef(!draftKey)

  const selectedSlug     = categories.find(c => c.id === categoryId)?.slug
  const hideAssociations = !!selectedSlug && NO_ASSOCIATIONS_SLUGS.has(selectedSlug)

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => { if (Array.isArray(d)) setCategories(d) }).catch(() => {})
    fetch('/api/circles').then(r => r.json()).then(d => {
      const list = Array.isArray(d?.data) ? d.data : []
      setCircles(list.map((c: Circle) => ({ id: c.id, name: c.name })))
    }).catch(() => {})
  }, [])

  // ── Brouillon local ──────────────────────────────────────────
  const snapshot = useMemo(() => ({
    name, description, categoryId, prepTime, cookTime, servings, difficulty, visibility, circleId,
    ingredients, steps, sideItems, drinkItems,
  }), [name, description, categoryId, prepTime, cookTime, servings, difficulty, visibility, circleId, ingredients, steps, sideItems, drinkItems])

  // Restauration au montage — sauf si le formulaire est pré-rempli (import).
  useEffect(() => {
    if (!draftKey) return
    try {
      const raw = defaultValues?.name ? null : localStorage.getItem(draftKey)
      const d = raw ? JSON.parse(raw) as Partial<typeof snapshot> : null
      if (d && isMeaningful(d)) {
        if (d.name !== undefined) setName(d.name)
        if (d.description !== undefined) setDescription(d.description)
        if (d.categoryId !== undefined) setCategoryId(d.categoryId)
        if (d.prepTime !== undefined) setPrepTime(d.prepTime)
        if (d.cookTime !== undefined) setCookTime(d.cookTime)
        if (d.servings) setServings(d.servings)
        if (d.difficulty !== undefined) setDifficulty(d.difficulty)
        if (d.visibility) setVisibility(d.visibility)
        if (d.circleId !== undefined) setCircleId(d.circleId)
        if (d.ingredients?.length) setIngredients(d.ingredients)
        if (d.steps?.length) setSteps(d.steps.map(s => ({ _id: s._id ?? uid(), description: s.description ?? '' })))
        if (d.sideItems) setSideItems(d.sideItems)
        if (d.drinkItems) setDrinkItems(d.drinkItems)
        setDraftRestored(true)
        setDraftStatus('saved')
      }
    } catch { /* brouillon illisible : ignoré */ }
    draftReady.current = true
  }, [draftKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!draftKey || !draftReady.current) return
    if (!isMeaningful(snapshot)) { setDraftStatus('idle'); return }
    setDraftStatus('saving')
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(snapshot))
        setDraftStatus('saved')
      } catch { setDraftStatus('idle') }
    }, DRAFT_DELAY_MS)
    return () => clearTimeout(t)
  }, [draftKey, snapshot])

  function discardDraft() {
    if (!draftKey) return
    clearRecipeDraft(draftKey)
    setName(''); setDescription(''); setCategoryId(''); setPrepTime(''); setCookTime('')
    setServings(4); setDifficulty('moyen'); setVisibility('private'); setCircleId('')
    setIngredients([emptyIngredient()]); setSteps([emptyStep()]); setSideItems([]); setDrinkItems([])
    setDraftRestored(false)
  }

  // ── Accompagnements & boissons ───────────────────────────────
  async function searchAssoc(scope: AssocScope, catId: string | null, query: string) {
    setAssocLoading(true)
    try {
      const params = new URLSearchParams({ scope })
      if (catId) params.set('category_id', catId)
      if (query.trim()) params.set('search', query.trim())
      const res = await fetch(`/api/recipes?${params}`)
      const data = await res.json()
      setAssocResults(Array.isArray(data) ? data : [])
    } catch {
      setAssocResults([])
    } finally {
      setAssocLoading(false)
    }
  }

  function openAssocPicker(mode: 'side' | 'drink') {
    setAssocPicker(mode); setAssocSearch(''); setAssocScope('all'); setAssocCategory(null)
    void searchAssoc('all', null, '')
  }

  function toggleAssocItem(recipe: PickerRecipe) {
    const setItems = assocPicker === 'side' ? setSideItems : setDrinkItems
    setItems(prev => prev.some(i => i.id === recipe.id) ? prev.filter(i => i.id !== recipe.id) : [...prev, { id: recipe.id, name: recipe.name }])
  }

  // ── Lignes ────────────────────────────────────────────────────
  const updateIngredient = (id: string, f: keyof Omit<IngredientRow, '_id'>, v: string) =>
    setIngredients(p => p.map(i => i._id === id ? { ...i, [f]: v } : i))
  const updateStep = (id: string, v: string) =>
    setSteps(p => p.map(s => s._id === id ? { ...s, description: v } : s))

  async function handleSubmit() {
    setNameError(null)
    setCircleError(null)
    if (name.trim().length < 2) { setNameError('Minimum 2 caractères'); document.getElementById('recipe-name')?.focus(); return }
    if (visibility === 'circle' && !circleId) { setCircleError('Sélectionne un cercle familial'); return }

    let photoUrl = defaultValues?.photo_url ?? undefined
    if (photoFile) {
      setPhotoUploading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const ext  = photoFile.name.split('.').pop()
      const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { data: upload, error: uploadErr } = await supabase.storage.from('recipe-photos').upload(path, photoFile, { upsert: false })
      setPhotoUploading(false)
      if (uploadErr) { setPhotoError(uploadErr.message ?? 'Erreur lors de l’envoi de la photo'); return }
      photoUrl = supabase.storage.from('recipe-photos').getPublicUrl(upload.path).data.publicUrl
    } else if (photoPreview === null) {
      photoUrl = undefined
    }

    await onSubmit({
      ...snapshot,
      sideItems:  hideAssociations ? [] : sideItems,
      drinkItems: hideAssociations ? [] : drinkItems,
      photo_url:  photoUrl,
      source_url: defaultValues?.source_url,
      raw_html_hash: defaultValues?.raw_html_hash,
    })
  }

  const pickFile = (file: File | undefined) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setPhotoError('Fichier trop lourd (max 5 Mo)'); return }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setPhotoError(null)
  }

  const chip = (item: AssocItem, mode: 'side' | 'drink') => (
    <span key={item.id} className={`flex items-center gap-1 rounded-[var(--kkb-radius-pill)] px-2.5 py-1 text-xs font-quicksand font-bold ${mode === 'side' ? 'bg-[var(--kkb-coral-light)] text-[var(--kkb-coral)]' : 'bg-[var(--kkb-teal-light)] text-[var(--kkb-teal)]'}`}>
      {item.name}
      <button type="button" onClick={() => (mode === 'side' ? setSideItems : setDrinkItems)(p => p.filter(i => i.id !== item.id))} aria-label={`Retirer ${item.name}`}>
        <X className="h-3 w-3" />
      </button>
    </span>
  )

  const busy = loading || photoUploading

  return (
    <>
      {draftRestored && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-[var(--kkb-radius-sm)] bg-[var(--kkb-teal-light)] px-4 py-2.5 text-sm font-quicksand text-[var(--kkb-teal)]">
          <span>Brouillon restauré : tu reprends là où tu t’étais arrêté(e).</span>
          <button type="button" onClick={discardDraft} className="shrink-0 font-bold underline">Repartir de zéro</button>
        </div>
      )}

      {/* Mobile : colonnes "contents" + ordre ; desktop : 2 colonnes 55/45 */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[55fr_45fr] lg:items-start lg:gap-6">
        <div className="contents lg:flex lg:flex-col lg:gap-5">
          {/* Nom */}
          <section className={`order-2 lg:order-1 ${CARD}`}>
            <div>
              <label htmlFor="recipe-name" className={LABEL}>Nom de la recette *</label>
              <input id="recipe-name" type="text" value={name} onChange={e => { setName(e.target.value); setNameError(null) }}
                placeholder="Ex. Alloco croustillant et poisson braisé" aria-invalid={!!nameError}
                className={`${INPUT} py-3 text-base font-bold lg:text-lg ${nameError ? 'border-[var(--kkb-danger)]' : ''}`} />
              {nameError && <p className="mt-1 text-xs font-quicksand text-[var(--kkb-danger)]">{nameError}</p>}
            </div>
          </section>

          {/* Temps, portions, difficulté */}
          <section className={`order-4 lg:order-2 ${CARD}`}>
            <div className="grid grid-cols-2 gap-3">
              <MinuteStepper id="recipe-prep" label="Préparation (min)" icon={Clock} value={prepTime} onChange={setPrepTime} />
              <MinuteStepper id="recipe-cook" label="Cuisson (min)" icon={Timer} value={cookTime} onChange={setCookTime} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className={`${LABEL} mb-0`}>Nombre de portions</span>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setServings(s => Math.max(1, s - 1))} disabled={servings <= 1} aria-label="Moins de portions"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--kkb-border)] text-[var(--kkb-text-secondary)] disabled:opacity-40"><Minus className="h-4 w-4" /></button>
                <span className="min-w-[2ch] text-center font-dosis font-bold text-xl text-[var(--kkb-coral)]" aria-live="polite">{servings}</span>
                <button type="button" onClick={() => setServings(s => s + 1)} aria-label="Plus de portions"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--kkb-coral)] text-white"><Plus className="h-4 w-4" /></button>
              </div>
            </div>
            <div>
              <span className={LABEL}>Niveau de difficulté</span>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Niveau de difficulté">
                {DIFFICULTY_OPTIONS.map(o => (
                  <button key={o.value} type="button" role="radio" aria-checked={difficulty === o.value} onClick={() => setDifficulty(o.value)}
                    className={`rounded-[var(--kkb-radius-pill)] py-2 text-sm font-quicksand font-bold transition-colors ${difficulty === o.value ? 'bg-[var(--kkb-coral)] text-white' : 'border border-[var(--kkb-border)] bg-white text-[var(--kkb-text-secondary)]'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Catégorie, description, astuce */}
          <section className={`order-3 lg:order-3 ${CARD}`}>
            <div>
              <label htmlFor="recipe-category" className={LABEL}>Catégorie (optionnel)</label>
              <div className="relative">
                <select id="recipe-category" value={categoryId} onChange={e => setCategoryId(e.target.value)} className={`${INPUT} appearance-none pr-9`}>
                  <option value="">Choisir une catégorie</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--kkb-text-tertiary)]" />
              </div>
            </div>
            <div>
              <label htmlFor="recipe-description" className={LABEL}>Astuce ou description (optionnel)</label>
              <textarea id="recipe-description" value={description} onChange={e => setDescription(e.target.value)} rows={3}
                placeholder="Le secret de famille : tremper les tranches de plantain dans une eau légèrement salée…" className={`${INPUT} resize-none`} />
            </div>
          </section>

          {/* Photo */}
          <section className={`order-1 lg:order-4 ${CARD}`}>
            <span className={LABEL}>Photo gourmande</span>
            {photoPreview ? (
              <div className="relative overflow-hidden rounded-[var(--kkb-radius-card)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreview} alt="Aperçu de la photo" className="aspect-video w-full object-cover" />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-[var(--kkb-radius-pill)] bg-white/90 px-2.5 py-1 text-[10px] font-quicksand font-bold uppercase tracking-wide text-[var(--kkb-coral)]">
                  <Star className="h-3 w-3" /> Photo principale
                </span>
                <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null) }} aria-label="Retirer la photo"
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[var(--kkb-text-secondary)]"><X className="h-4 w-4" /></button>
                <label className="absolute bottom-3 left-1/2 flex -translate-x-1/2 cursor-pointer items-center gap-1.5 rounded-[var(--kkb-radius-pill)] bg-white/95 px-4 py-2 text-xs font-quicksand font-bold text-[var(--kkb-text-primary)] shadow-sm">
                  <Camera className="h-4 w-4" /> Prendre ou changer
                  <input type="file" accept="image/jpeg,image/png,image/gif" className="sr-only" onChange={e => pickFile(e.target.files?.[0])} />
                </label>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-[var(--kkb-radius-card)] border-[1.5px] border-dashed border-[var(--kkb-border)] bg-[var(--kkb-bg)] px-4 py-10 text-center transition-colors hover:border-[var(--kkb-coral)]">
                <ImagePlus className="h-8 w-8 text-[var(--kkb-text-tertiary)]" />
                <span className="text-[13px] font-quicksand text-[var(--kkb-text-tertiary)]">Ajouter une photo JPG, PNG ou GIF (max 5 Mo)</span>
                <input type="file" accept="image/jpeg,image/png,image/gif" className="sr-only" onChange={e => pickFile(e.target.files?.[0])} />
              </label>
            )}
            {photoError && <p className="text-xs font-quicksand text-[var(--kkb-danger)]">{photoError}</p>}
          </section>

          {/* Visibilité */}
          {!hideVisibility && (
            <section className={`order-8 lg:order-5 ${CARD}`}>
              <h2 className={TITLE}>Visibilité</h2>
              <div className="space-y-2" role="radiogroup" aria-label="Visibilité de la recette">
                {VISIBILITY_OPTIONS.map(o => {
                  const selected = visibility === o.value
                  return (
                    <button key={o.value} type="button" role="radio" aria-checked={selected} onClick={() => setVisibility(o.value)}
                      className={`flex w-full items-center gap-3 rounded-[var(--kkb-radius-card)] px-4 py-3 text-left transition-colors ${selected ? 'border-2 border-[var(--kkb-coral)] bg-[var(--kkb-coral-light)]' : 'border border-[var(--kkb-border)] bg-white'}`}>
                      <o.Icon className="h-5 w-5 shrink-0 text-[var(--kkb-teal)]" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-quicksand font-bold text-[var(--kkb-text-primary)]">{o.label}</span>
                        <span className="block text-[13px] font-quicksand text-[var(--kkb-text-secondary)]">{o.sub}</span>
                      </span>
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-[var(--kkb-coral)]' : 'border-[var(--kkb-border)]'}`}>
                        {selected && <span className="h-2.5 w-2.5 rounded-full bg-[var(--kkb-coral)]" />}
                      </span>
                    </button>
                  )
                })}
              </div>
              {visibility === 'circle' && (circles.length === 0 ? (
                <p className="text-xs font-quicksand text-[var(--kkb-text-tertiary)]">
                  Aucun cercle familial. <button type="button" onClick={() => router.push('/circle')} className="font-bold text-[var(--kkb-coral)] underline">Créer un cercle</button>
                </p>
              ) : (
                <div>
                  <select value={circleId} onChange={e => { setCircleId(e.target.value); setCircleError(null) }} aria-label="Cercle familial" className={INPUT}>
                    <option value="">Choisir un cercle *</option>
                    {circles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {circleError && <p className="mt-1 text-xs font-quicksand text-[var(--kkb-danger)]">{circleError}</p>}
                </div>
              ))}
            </section>
          )}
        </div>

        <div className="contents lg:flex lg:flex-col lg:gap-5">
          {/* Ingrédients */}
          <section className={`order-5 lg:order-1 ${CARD}`}>
            <h2 className={TITLE}>Ingrédients</h2>
            <div className="divide-y-[0.5px] divide-[var(--kkb-border)]">
              {ingredients.map((ing, idx) => (
                <div key={ing._id} className="flex items-center gap-1.5 py-2 first:pt-0">
                  <input type="text" inputMode="decimal" placeholder="Qté" aria-label={`Quantité de l'ingrédient ${idx + 1}`} value={ing.quantity}
                    onChange={e => updateIngredient(ing._id, 'quantity', e.target.value)} className={`${FIELD} w-16 shrink-0 px-2 text-center`} />
                  <input type="text" placeholder="Unité" aria-label={`Unité de l'ingrédient ${idx + 1}`} value={ing.unit}
                    onChange={e => updateIngredient(ing._id, 'unit', e.target.value)} className={`${FIELD} w-20 shrink-0 px-2`} />
                  <input type="text" placeholder={`Ingrédient ${idx + 1}`} aria-label={`Nom de l'ingrédient ${idx + 1}`} value={ing.name}
                    onChange={e => updateIngredient(ing._id, 'name', e.target.value)} className={`${FIELD} min-w-0 flex-1`} />
                  <button type="button" onClick={() => setIngredients(p => p.length > 1 ? p.filter(i => i._id !== ing._id) : p)} disabled={ingredients.length === 1}
                    aria-label={`Supprimer l'ingrédient ${idx + 1}`} className="shrink-0 p-1.5 text-[var(--kkb-danger)] disabled:opacity-30">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setIngredients(p => [...p, emptyIngredient()])} className={ADD_BTN}><Plus className="h-4 w-4" /> Ajouter un ingrédient</button>
          </section>

          {/* Préparation */}
          <section className={`order-6 lg:order-2 ${CARD}`}>
            <div className="flex items-center justify-between">
              <h2 className={TITLE}>Préparation</h2>
              <span className="rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-teal-light)] px-2.5 py-0.5 text-[11px] font-quicksand font-bold uppercase tracking-wide text-[var(--kkb-teal)]">
                {steps.length} étape{steps.length > 1 ? 's' : ''}
              </span>
            </div>
            <ol className="space-y-4">
              {steps.map((step, idx) => (
                <li key={step._id} className="flex gap-2.5">
                  <span className="mt-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--kkb-coral)] font-dosis font-bold text-sm text-white">{idx + 1}</span>
                  <textarea value={step.description} onChange={e => updateStep(step._id, e.target.value)} rows={2}
                    placeholder={idx === 0 ? 'Éplucher les bananes plantains, les couper en rondelles obliques…' : `Étape ${idx + 1}…`}
                    aria-label={`Description de l'étape ${idx + 1}`} className={`${INPUT} min-w-0 flex-1 resize-none`} />
                  <button type="button" onClick={() => setSteps(p => p.length > 1 ? p.filter(s => s._id !== step._id) : p)} disabled={steps.length === 1}
                    aria-label={`Supprimer l'étape ${idx + 1}`} className="mt-1.5 shrink-0 p-1.5 text-[var(--kkb-text-tertiary)] hover:text-[var(--kkb-danger)] disabled:opacity-30">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ol>
            <button type="button" onClick={() => setSteps(p => [...p, emptyStep()])} className={ADD_BTN}><Plus className="h-4 w-4" /> Ajouter une étape</button>
          </section>

          {/* Accompagnements & boissons */}
          {!hideAssociations && (
            <section className={`order-7 lg:order-3 ${CARD}`}>
              <button type="button" onClick={() => setAssocOpen(o => !o)} aria-expanded={assocOpen} className="flex w-full items-center gap-2 text-left">
                <UtensilsCrossed className="h-4 w-4 shrink-0 text-[var(--kkb-text-tertiary)]" />
                <span className="flex-1 text-sm font-quicksand font-bold text-[var(--kkb-text-primary)]">Accompagnements &amp; Boissons</span>
                {(sideItems.length + drinkItems.length) > 0 && (
                  <span className="text-[11px] font-quicksand font-bold text-[var(--kkb-coral)]">{sideItems.length + drinkItems.length} sélectionné{sideItems.length + drinkItems.length > 1 ? 's' : ''}</span>
                )}
                <span className="rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-teal-light)] px-2 py-0.5 text-[10px] font-quicksand font-bold uppercase tracking-wide text-[var(--kkb-teal)]">Optionnel</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--kkb-text-tertiary)] transition-transform ${assocOpen ? 'rotate-180' : ''}`} />
              </button>
              {assocOpen && (
                <div className="space-y-4">
                  <p className="text-[13px] font-quicksand text-[var(--kkb-text-secondary)]">Qu’est-ce qui va bien avec ce plat ?</p>
                  {(['side', 'drink'] as const).map(mode => (
                    <div key={mode} className="space-y-2">
                      <span className={`${LABEL} flex items-center gap-1`}>
                        {mode === 'side' ? <Salad className="h-3.5 w-3.5" /> : <CupSoda className="h-3.5 w-3.5" />}
                        {mode === 'side' ? 'Accompagnements' : 'Boissons'}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(mode === 'side' ? sideItems : drinkItems).map(i => chip(i, mode))}
                        <button type="button" onClick={() => openAssocPicker(mode)}
                          className="flex items-center gap-1 rounded-[var(--kkb-radius-pill)] border border-dashed border-[var(--kkb-coral)] px-2.5 py-1 text-xs font-quicksand font-bold text-[var(--kkb-coral)]">
                          <Plus className="h-3 w-3" /> Ajouter
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {apiError && <p className="mt-4 text-sm font-quicksand text-[var(--kkb-danger)]">{apiError}</p>}

      {/* Enregistrer : pastille compacte centrée au-dessus de la bottom nav (mobile), barre pleine largeur (desktop) */}
      <div className="fixed bottom-[88px] left-1/2 z-30 -translate-x-1/2 lg:inset-x-0 lg:bottom-0 lg:left-60 lg:translate-x-0 lg:border-t lg:border-[var(--kkb-border)] lg:bg-white lg:px-8 lg:py-3">
        <div className="mx-auto flex max-w-[1300px] items-center gap-4">
          {draftKey && (
            <p className="hidden flex-1 items-center gap-1.5 text-xs font-quicksand text-[var(--kkb-success)] lg:flex" aria-live="polite">
              {draftStatus === 'saving' && <><Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--kkb-text-tertiary)]" /><span className="text-[var(--kkb-text-tertiary)]">Sauvegarde du brouillon…</span></>}
              {draftStatus === 'saved' && <><Check className="h-3.5 w-3.5" /> Brouillon sauvegardé</>}
            </p>
          )}
          <button type="button" onClick={() => void handleSubmit()} disabled={busy}
            className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral)] px-6 py-2.5 text-sm font-quicksand font-bold text-white shadow-[var(--kkb-shadow-fab)] hover:bg-[var(--kkb-coral-hover)] disabled:opacity-60 lg:ml-auto lg:gap-2 lg:px-8 lg:py-3.5 lg:text-[15px] lg:shadow-none">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {photoUploading ? 'Envoi de la photo…' : (
              <>
                <span className="lg:hidden">Enregistrer</span>
                <span className="hidden lg:inline">{submitLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sélecteur d'accompagnement / boisson (même filtres que la planification) */}
      {assocPicker && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 lg:items-center" onClick={e => { if (e.target === e.currentTarget) setAssocPicker(null) }}>
          <div className="flex max-h-[75vh] w-full flex-col rounded-t-[var(--kkb-radius-card)] bg-[var(--kkb-bg)] shadow-xl lg:max-w-lg lg:rounded-[var(--kkb-radius-card)]">
            <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-4">
              <p className="font-dosis font-bold text-base text-[var(--kkb-text-primary)]">{assocPicker === 'side' ? 'Choisir un accompagnement' : 'Choisir une boisson'}</p>
              <button type="button" onClick={() => setAssocPicker(null)} className="-mr-1 p-1.5 text-[var(--kkb-text-tertiary)]" aria-label="Fermer"><X className="h-5 w-5" /></button>
            </div>
            <div className="shrink-0 px-4 pb-2">
              <div className="flex items-center gap-2 rounded-[var(--kkb-radius-sm)] border border-[var(--kkb-border)] bg-white px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-[var(--kkb-text-tertiary)]" />
                <input type="search" autoFocus placeholder="Chercher une recette…" aria-label="Chercher une recette" value={assocSearch}
                  onChange={e => {
                    const v = e.target.value
                    setAssocSearch(v)
                    if (assocTimer.current) clearTimeout(assocTimer.current)
                    assocTimer.current = setTimeout(() => void searchAssoc(assocScope, assocCategory, v), 300)
                  }}
                  className="flex-1 bg-transparent text-sm font-quicksand outline-none placeholder:text-[var(--kkb-text-tertiary)]" />
              </div>
            </div>
            <div className="flex shrink-0 gap-1.5 overflow-x-auto px-4 pb-2 hide-scrollbar">
              {ASSOC_SCOPE_OPTIONS.map(o => (
                <button key={o.val} type="button" onClick={() => { setAssocScope(o.val); void searchAssoc(o.val, assocCategory, assocSearch) }}
                  className={`shrink-0 whitespace-nowrap rounded-[var(--kkb-radius-pill)] px-3 py-1.5 text-xs font-quicksand font-bold ${assocScope === o.val ? 'bg-[var(--kkb-coral)] text-white' : 'border border-[var(--kkb-border)] bg-white text-[var(--kkb-text-secondary)]'}`}>
                  {o.label}
                </button>
              ))}
            </div>
            {categories.length > 0 && (
              <div className="flex shrink-0 gap-1.5 overflow-x-auto px-4 pb-3 hide-scrollbar">
                {[{ id: null as string | null, name: 'Toutes', slug: '' }, ...categories].map(c => {
                  const Icon = c.id ? categoryIcon(c.slug) : null
                  return (
                    <button key={c.id ?? 'all'} type="button" onClick={() => { setAssocCategory(c.id); void searchAssoc(assocScope, c.id, assocSearch) }}
                      className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-[var(--kkb-radius-pill)] px-3 py-1.5 text-xs font-quicksand font-bold ${assocCategory === c.id ? 'bg-[var(--kkb-teal)] text-white' : 'border border-[var(--kkb-border)] bg-white text-[var(--kkb-text-secondary)]'}`}>
                      {Icon && <Icon className="h-3 w-3" />} {c.name}
                    </button>
                  )
                })}
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto border-t border-[var(--kkb-border)]">
              {assocLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[var(--kkb-coral)]" /></div>
              ) : assocResults.length === 0 ? (
                <p className="py-8 text-center text-sm font-quicksand text-[var(--kkb-text-tertiary)]">Aucune recette trouvée</p>
              ) : assocResults.map(recipe => {
                const selected = (assocPicker === 'side' ? sideItems : drinkItems).some(i => i.id === recipe.id)
                return (
                  <button key={recipe.id} type="button" onClick={() => toggleAssocItem(recipe)} aria-pressed={selected}
                    className="flex w-full items-center gap-3 border-b border-[var(--kkb-border)]/40 px-4 py-3 text-left last:border-0 hover:bg-[var(--kkb-coral-light)]">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-[1.5px] ${selected ? 'border-[var(--kkb-coral)] bg-[var(--kkb-coral)] text-white' : 'border-[var(--kkb-border)] bg-white'}`}>
                      {selected && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-quicksand font-bold text-[var(--kkb-text-primary)]">{recipe.name}</span>
                      {recipe.description && <span className="block truncate text-xs font-quicksand text-[var(--kkb-text-tertiary)]">{recipe.description}</span>}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="shrink-0 p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
              <button type="button" onClick={() => setAssocPicker(null)} className="w-full rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral)] py-2.5 text-sm font-quicksand font-bold text-white">Terminé</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
