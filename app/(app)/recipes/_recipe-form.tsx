'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookHeart, Camera, Check, ChefHat, ChevronDown, Clock, CloudCheck, CupSoda, Eye, Flame, Globe, History, ImagePlus,
  ListOrdered, Loader2, Lock, Minus, Plus, Salad, Search, ShoppingBasket, Trash2, Users, UtensilsCrossed, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { categoryIcon } from '@/lib/constants/category-icon'
import { Select } from '@/components/ui/select'

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
  { value: 'private',   label: 'Seulement moi', sub: 'Elle reste dans ton carnet.',                                  Icon: Lock  },
  { value: 'circle',    label: 'Ma famille',    sub: 'Partagée avec ton cercle, pour les menus et les sondages.',    Icon: Users },
  { value: 'community', label: 'Communauté',    sub: 'Elle inspire tous les foyers de KeskonBouf.',                  Icon: Globe },
]

const DIFFICULTY_OPTIONS: { value: DifficultyVal; label: string }[] = [
  { value: 'facile', label: 'Facile' }, { value: 'moyen', label: 'Moyen' }, { value: 'difficile', label: 'Difficile' },
]

const LABEL   = 'mb-1.5 block font-quicksand text-sm font-bold text-[var(--kkb-profond)]'
const FIELD   = 'h-11 rounded-[var(--kkb-r-md)] border-[1.5px] border-[var(--kkb-filet)] bg-white px-3.5 font-quicksand text-[15px] text-[var(--kkb-profond)] outline-none transition-colors placeholder:text-[var(--kkb-texte-2)] hover:border-[var(--kkb-foret-300)] focus:border-[var(--kkb-foret-500)]'
const INPUT   = `w-full ${FIELD}`
// Cellule d'une ligne d'ingrédient, posée sur la tuile crème.
const CELL    = 'h-10 rounded-[var(--kkb-r-sm)] border-[1.5px] border-transparent bg-white px-2.5 font-quicksand text-sm text-[var(--kkb-profond)] outline-none transition-colors placeholder:font-quicksand placeholder:font-normal placeholder:text-[var(--kkb-texte-2)] focus:border-[var(--kkb-foret-500)]'
const CARD    = 'space-y-4 rounded-[var(--kkb-r-xl)] bg-white p-5 lg:p-6'
const ADD_BTN = 'flex h-11 w-full items-center justify-center gap-1.5 rounded-[var(--kkb-r-lg)] border-[1.5px] border-dashed border-[var(--kkb-foret-300)] font-quicksand text-sm font-bold text-[var(--kkb-foret)] transition-colors hover:bg-[var(--kkb-foret-50)]'

function MinuteStepper({ id, label, icon: Icon, value, onChange }: {
  id: string; label: string; icon: typeof Clock; value: string; onChange: (v: string) => void
}) {
  const n = Number(value) || 0
  const step = (d: number) => onChange(String(Math.max(0, n + d)))
  return (
    <div className="rounded-[var(--kkb-r-lg)] bg-[var(--kkb-creme)] p-3">
      <label htmlFor={id} className="flex items-center gap-1.5 font-quicksand text-sm font-bold text-[var(--kkb-profond)]">
        <Icon className="h-4 w-4 text-[var(--kkb-foret-500)]" /> {label}
      </label>
      <div className="mt-2 flex items-center gap-1">
        <button type="button" onClick={() => step(-5)} disabled={n <= 0} aria-label={`Moins 5 minutes (${label.toLowerCase()})`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[var(--kkb-foret)] disabled:opacity-40"><Minus className="h-3.5 w-3.5" /></button>
        <span className="flex min-w-0 flex-1 items-baseline justify-center gap-1">
          <input id={id} type="number" min={0} inputMode="numeric" value={value} placeholder="0" onChange={e => onChange(e.target.value)}
            className="w-full min-w-0 bg-transparent text-right font-dosis text-xl font-extrabold tabular-nums text-[var(--kkb-profond)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
          <span className="shrink-0 font-quicksand text-xs text-[var(--kkb-texte-2)]">min</span>
        </span>
        <button type="button" onClick={() => step(5)} aria-label={`Plus 5 minutes (${label.toLowerCase()})`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--kkb-foret)] text-[var(--kkb-creme)]"><Plus className="h-3.5 w-3.5" /></button>
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

  const [focusId,       setFocusId]       = useState<string | null>(null)
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

  // Ligne ajoutée (Entrée ou bouton) : le curseur s'y place.
  useEffect(() => {
    if (!focusId) return
    document.getElementById(focusId)?.focus()
    setFocusId(null)
  }, [focusId, ingredients, steps])

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
    <span key={item.id} className={`flex items-center gap-1 rounded-full py-1 pl-3 pr-1.5 font-quicksand text-xs font-bold ${mode === 'side' ? 'bg-[var(--kkb-jaune-50)] text-[var(--kkb-jaune-text)]' : 'bg-[var(--kkb-sauge-50)] text-[var(--kkb-foret-500)]'}`}>
      {item.name}
      <button type="button" onClick={() => (mode === 'side' ? setSideItems : setDrinkItems)(p => p.filter(i => i.id !== item.id))} aria-label={`Retirer ${item.name}`}
        className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-white/70">
        <X className="h-3 w-3" />
      </button>
    </span>
  )

  const busy = loading || photoUploading

  // Repères de la fiche : ce qui fait une recette utilisable.
  const checklist = [
    { label: 'Nom',         done: name.trim().length >= 2 },
    { label: 'Ingrédients', done: ingredients.some(i => i.name.trim()) },
    { label: 'Étapes',      done: steps.some(s => s.description.trim()) },
    { label: 'Photo',       done: !!photoPreview },
  ]

  function addIngredientAfter(id?: string) {
    const row = emptyIngredient()
    setIngredients(p => {
      const i = id ? p.findIndex(x => x._id === id) : p.length - 1
      return [...p.slice(0, i + 1), row, ...p.slice(i + 1)]
    })
    setFocusId(`ing-${row._id}`)
  }

  function addStep() {
    const row = emptyStep()
    setSteps(p => [...p, row])
    setFocusId(`step-${row._id}`)
  }

  return (
    <>
      {draftRestored && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-[var(--kkb-r-lg)] bg-[var(--kkb-sauge-50)] px-4 py-3 font-quicksand text-sm text-[var(--kkb-profond)]">
          <span className="flex items-center gap-2"><History className="h-4 w-4 shrink-0 text-[var(--kkb-foret-500)]" /> Brouillon retrouvé : tu reprends là où tu t’étais arrêté(e).</span>
          <button type="button" onClick={discardDraft} className="shrink-0 font-bold text-[var(--kkb-foret)] underline">Repartir de zéro</button>
        </div>
      )}

      {/* Mobile : colonnes « contents » + ordre ; desktop : 5 / 7 colonnes */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:items-start lg:gap-5">
        <div className="contents lg:col-span-5 lg:flex lg:flex-col lg:gap-5">
          {/* ── La fiche : photo, nom, catégorie, mot de la cuisine ─────── */}
          <section className={`order-1 ${CARD}`} aria-labelledby="sec-fiche">
            <CardTitle id="sec-fiche" icon={BookHeart}>La fiche</CardTitle>
            {photoPreview ? (
              <div className="relative overflow-hidden rounded-[var(--kkb-r-lg)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreview} alt="Aperçu de la photo" className="aspect-[4/3] w-full object-cover" />
                <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null) }} aria-label="Retirer la photo"
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[var(--kkb-foret)] backdrop-blur-sm"><X className="h-4 w-4" /></button>
                <label className="absolute bottom-3 left-1/2 flex -translate-x-1/2 cursor-pointer items-center gap-1.5 rounded-full bg-white/95 px-4 py-2 font-quicksand text-xs font-bold text-[var(--kkb-foret)] shadow-sm">
                  <Camera className="h-4 w-4" /> Changer la photo
                  <input type="file" accept="image/jpeg,image/png,image/gif" className="sr-only" onChange={e => pickFile(e.target.files?.[0])} />
                </label>
              </div>
            ) : (
              <label className="group flex aspect-[16/9] cursor-pointer flex-col items-center justify-center gap-3 rounded-[var(--kkb-r-lg)] border-[1.5px] border-dashed border-[var(--kkb-foret-300)] bg-[var(--kkb-foret-50)] px-4 text-center transition-colors hover:bg-[var(--kkb-sauge-50)]">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[var(--kkb-foret)] transition-transform group-hover:scale-105">
                  <ImagePlus className="h-6 w-6" />
                </span>
                <span>
                  <span className="block font-quicksand text-sm font-bold text-[var(--kkb-foret)]">Ajoute une photo gourmande</span>
                  <span className="block font-quicksand text-xs text-[var(--kkb-texte-2)]">JPG, PNG ou GIF, 5 Mo maximum</span>
                </span>
                <input type="file" accept="image/jpeg,image/png,image/gif" className="sr-only" onChange={e => pickFile(e.target.files?.[0])} />
              </label>
            )}
            {photoError && <p className="font-quicksand text-xs text-[var(--kkb-danger)]">{photoError}</p>}

            <div>
              <label htmlFor="recipe-name" className={LABEL}>Nom de la recette <span className="text-[var(--kkb-orange-text)]">*</span></label>
              <input id="recipe-name" type="text" value={name} onChange={e => { setName(e.target.value); setNameError(null) }}
                placeholder="Ex. Alloco croustillant et poisson braisé" aria-invalid={!!nameError} aria-describedby={nameError ? 'recipe-name-error' : undefined}
                className={`${INPUT} h-12 text-base font-bold ${nameError ? '!border-[var(--kkb-danger)]' : ''}`} />
              {nameError && <p id="recipe-name-error" className="mt-1 font-quicksand text-xs text-[var(--kkb-danger)]">{nameError}</p>}
            </div>
            <div>
              <label htmlFor="recipe-category" className={LABEL}>Catégorie</label>
              <Select
                id="recipe-category"
                value={categoryId}
                onChange={setCategoryId}
                options={[...(categoryId ? [{ value: '', label: 'Aucune catégorie' }] : []), ...categories.map(c => ({ value: c.id, label: c.name }))]}
                placeholder="Choisir une catégorie"
                searchPlaceholder="Rechercher une catégorie…"
              />
            </div>
            <div>
              <label htmlFor="recipe-description" className={LABEL}>Le mot de la cuisine</label>
              <textarea id="recipe-description" value={description} onChange={e => setDescription(e.target.value)} rows={3}
                placeholder="Le secret de famille : tremper les tranches de plantain dans une eau légèrement salée…" className={`${INPUT} h-auto resize-none py-3`} />
            </div>
          </section>

          {/* ── En cuisine : temps, portions, niveau ───────────────────── */}
          <section className={`order-4 ${CARD}`} aria-labelledby="sec-cuisine">
            <CardTitle id="sec-cuisine" icon={ChefHat}>En cuisine</CardTitle>
            <div className="grid grid-cols-2 gap-3">
              <MinuteStepper id="recipe-prep" label="Préparation" icon={Clock} value={prepTime} onChange={setPrepTime} />
              <MinuteStepper id="recipe-cook" label="Cuisson" icon={Flame} value={cookTime} onChange={setCookTime} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-[var(--kkb-r-lg)] bg-[var(--kkb-creme)] p-3">
              <span className="flex items-center gap-2 font-quicksand text-sm font-bold text-[var(--kkb-profond)]">
                <Users className="h-4 w-4 text-[var(--kkb-foret-500)]" /> Portions
              </span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setServings(s => Math.max(1, s - 1))} disabled={servings <= 1} aria-label="Moins de portions"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--kkb-foret)] disabled:opacity-40"><Minus className="h-4 w-4" /></button>
                <span className="min-w-[2ch] text-center font-dosis text-xl font-extrabold tabular-nums text-[var(--kkb-foret)]" aria-live="polite">{servings}</span>
                <button type="button" onClick={() => setServings(s => s + 1)} aria-label="Plus de portions"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--kkb-foret)] text-[var(--kkb-creme)]"><Plus className="h-4 w-4" /></button>
              </div>
            </div>
            <div>
              <span className={LABEL} id="difficulty-label">Niveau</span>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby="difficulty-label">
                {DIFFICULTY_OPTIONS.map((o, i) => {
                  const selected = difficulty === o.value
                  return (
                    <button key={o.value} type="button" role="radio" aria-checked={selected} onClick={() => setDifficulty(o.value)}
                      className={`flex flex-col items-center gap-1 rounded-[var(--kkb-r-lg)] border-[1.5px] py-2.5 transition-colors ${selected ? 'border-[var(--kkb-foret)] bg-[var(--kkb-foret)] text-[var(--kkb-creme)]' : 'border-[var(--kkb-filet)] bg-white text-[var(--kkb-texte-2)] hover:border-[var(--kkb-foret-300)]'}`}>
                      <span className="flex" aria-hidden="true">
                        {[0, 1, 2].map(h => (
                          <ChefHat key={h} className={`h-3.5 w-3.5 ${h <= i ? (selected ? 'text-[var(--kkb-sauge)]' : 'text-[var(--kkb-foret-500)]') : (selected ? 'text-white/25' : 'text-[var(--kkb-filet)]')}`} />
                        ))}
                      </span>
                      <span className="font-quicksand text-sm font-bold">{o.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          {/* ── Qui la voit ? ───────────────────────────────────────────── */}
          {!hideVisibility && (
            <section className={`order-6 ${CARD}`} aria-labelledby="sec-visibilite">
              <CardTitle id="sec-visibilite" icon={Eye}>Qui la voit ?</CardTitle>
              <div className="space-y-2" role="radiogroup" aria-labelledby="sec-visibilite">
                {VISIBILITY_OPTIONS.map(o => {
                  const selected = visibility === o.value
                  return (
                    <button key={o.value} type="button" role="radio" aria-checked={selected} onClick={() => setVisibility(o.value)}
                      className={`flex w-full items-center gap-3 rounded-[var(--kkb-r-lg)] border-[1.5px] px-3 py-3 text-left transition-colors ${selected ? 'border-[var(--kkb-foret)] bg-[var(--kkb-foret-50)]' : 'border-[var(--kkb-filet)] bg-white hover:border-[var(--kkb-foret-300)]'}`}>
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${selected ? 'bg-[var(--kkb-foret)] text-[var(--kkb-creme)]' : 'bg-[var(--kkb-creme)] text-[var(--kkb-foret)]'}`}>
                        <o.Icon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-quicksand text-sm font-bold text-[var(--kkb-profond)]">{o.label}</span>
                        <span className="block font-quicksand text-xs text-[var(--kkb-texte-2)]">{o.sub}</span>
                      </span>
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-[var(--kkb-foret)]' : 'border-[var(--kkb-filet)]'}`}>
                        {selected && <span className="h-2.5 w-2.5 rounded-full bg-[var(--kkb-foret)]" />}
                      </span>
                    </button>
                  )
                })}
              </div>
              {visibility === 'circle' && (circles.length === 0 ? (
                <p className="font-quicksand text-xs text-[var(--kkb-texte-2)]">
                  Aucun cercle familial. <button type="button" onClick={() => router.push('/circle/create')} className="font-bold text-[var(--kkb-foret)] underline">Créer un cercle</button>
                </p>
              ) : (
                <div>
                  <Select
                    value={circleId}
                    onChange={v => { setCircleId(v); setCircleError(null) }}
                    options={circles.map(c => ({ value: c.id, label: c.name }))}
                    ariaLabel="Cercle familial"
                    placeholder="Choisir un cercle *"
                    searchPlaceholder="Rechercher un cercle…"
                    invalid={!!circleError}
                  />
                  {circleError && <p className="mt-1 font-quicksand text-xs text-[var(--kkb-danger)]">{circleError}</p>}
                </div>
              ))}
            </section>
          )}
        </div>

        <div className="contents lg:col-span-7 lg:flex lg:flex-col lg:gap-5">
          {/* ── Ingrédients ─────────────────────────────────────────────── */}
          <section className={`order-2 ${CARD}`} aria-labelledby="sec-ingredients">
            <div className="flex items-center justify-between gap-3">
              <CardTitle id="sec-ingredients" icon={ShoppingBasket}>Ingrédients</CardTitle>
              <span className="hidden font-quicksand text-xs text-[var(--kkb-texte-2)] sm:block">Entrée pour passer à la ligne suivante</span>
            </div>
            <ul className="space-y-2">
              {ingredients.map((ing, idx) => (
                <li key={ing._id} className="flex flex-wrap items-center gap-1.5 rounded-[var(--kkb-r-lg)] bg-[var(--kkb-creme)] p-1.5 sm:flex-nowrap">
                  <input type="text" inputMode="decimal" placeholder="Qté" aria-label={`Quantité de l'ingrédient ${idx + 1}`} value={ing.quantity}
                    onChange={e => updateIngredient(ing._id, 'quantity', e.target.value)} className={`${CELL} order-3 w-0 min-w-0 flex-1 text-center font-dosis font-extrabold text-[var(--kkb-foret)] sm:order-none sm:w-16 sm:flex-none sm:shrink-0`} />
                  <input type="text" placeholder="Unité" aria-label={`Unité de l'ingrédient ${idx + 1}`} value={ing.unit}
                    onChange={e => updateIngredient(ing._id, 'unit', e.target.value)} className={`${CELL} order-4 w-0 min-w-0 flex-[2] sm:order-none sm:w-24 sm:flex-none sm:shrink-0`} />
                  <input id={`ing-${ing._id}`} type="text" placeholder={idx === 0 ? 'Ex. Bananes plantains mûres' : `Ingrédient ${idx + 1}`} aria-label={`Nom de l'ingrédient ${idx + 1}`} value={ing.name}
                    onChange={e => updateIngredient(ing._id, 'name', e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addIngredientAfter(ing._id) } }}
                    className={`${CELL} order-1 min-w-0 flex-1 basis-[calc(100%-44px)] sm:order-none sm:basis-auto`} />
                  <button type="button" onClick={() => setIngredients(p => p.length > 1 ? p.filter(i => i._id !== ing._id) : p)} disabled={ingredients.length === 1}
                    aria-label={`Supprimer l'ingrédient ${idx + 1}`} className="order-2 flex h-9 w-9 shrink-0 sm:order-none items-center justify-center rounded-full text-[var(--kkb-texte-2)] transition-colors hover:bg-[var(--kkb-danger-light)] hover:text-[var(--kkb-danger)] disabled:opacity-30">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => addIngredientAfter()} className={ADD_BTN}><Plus className="h-4 w-4" /> Ajouter un ingrédient</button>
          </section>

          {/* ── Préparation ─────────────────────────────────────────────── */}
          <section className={`order-3 ${CARD}`} aria-labelledby="sec-steps">
            <div className="flex items-center justify-between gap-3">
              <CardTitle id="sec-steps" icon={ListOrdered}>Préparation</CardTitle>
              <span className="rounded-full bg-[var(--kkb-foret-50)] px-2.5 py-0.5 font-quicksand text-xs font-bold text-[var(--kkb-foret)]">
                {steps.length} étape{steps.length > 1 ? 's' : ''}
              </span>
            </div>
            <ol>
              {steps.map((step, idx) => (
                <li key={step._id} className="relative flex gap-3 pb-3 last:pb-0">
                  {idx < steps.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-[17px] top-10 border-l border-dashed border-[var(--kkb-filet)]" />}
                  <span className="relative mt-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--kkb-foret)] font-dosis text-sm font-extrabold text-[var(--kkb-creme)]">{idx + 1}</span>
                  <textarea id={`step-${step._id}`} value={step.description} onChange={e => updateStep(step._id, e.target.value)} rows={2}
                    placeholder={idx === 0 ? 'Éplucher les bananes plantains, les couper en rondelles obliques…' : `Étape ${idx + 1}…`}
                    aria-label={`Description de l'étape ${idx + 1}`} className={`${INPUT} h-auto min-w-0 flex-1 resize-none py-2.5`} />
                  <button type="button" onClick={() => setSteps(p => p.length > 1 ? p.filter(s => s._id !== step._id) : p)} disabled={steps.length === 1}
                    aria-label={`Supprimer l'étape ${idx + 1}`} className="mt-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--kkb-texte-2)] transition-colors hover:bg-[var(--kkb-danger-light)] hover:text-[var(--kkb-danger)] disabled:opacity-30">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ol>
            <button type="button" onClick={addStep} className={ADD_BTN}><Plus className="h-4 w-4" /> Ajouter une étape</button>
          </section>

          {/* ── Accompagnements & boissons ──────────────────────────────── */}
          {!hideAssociations && (
            <section className={`order-5 ${CARD}`} aria-labelledby="sec-assoc">
              <button type="button" onClick={() => setAssocOpen(o => !o)} aria-expanded={assocOpen} className="flex w-full items-center gap-2 text-left">
                <CardTitle id="sec-assoc" icon={UtensilsCrossed}>Pour l’accompagner</CardTitle>
                <span className="ml-auto font-quicksand text-xs font-semibold text-[var(--kkb-texte-2)]">
                  {(sideItems.length + drinkItems.length) > 0 ? `${sideItems.length + drinkItems.length} choisi${sideItems.length + drinkItems.length > 1 ? 's' : ''}` : 'Facultatif'}
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--kkb-texte-2)] transition-transform ${assocOpen ? 'rotate-180' : ''}`} />
              </button>
              {assocOpen && (
                <div className="space-y-4">
                  <p className="font-quicksand text-sm text-[var(--kkb-texte-2)]">Qu’est-ce qui va bien avec ce plat ? Ces idées seront proposées sur la fiche.</p>
                  {(['side', 'drink'] as const).map(mode => (
                    <div key={mode} className="space-y-2">
                      <span className="flex items-center gap-1.5 font-quicksand text-sm font-bold text-[var(--kkb-profond)]">
                        {mode === 'side' ? <Salad className="h-4 w-4 text-[var(--kkb-jaune-text)]" /> : <CupSoda className="h-4 w-4 text-[var(--kkb-foret-500)]" />}
                        {mode === 'side' ? 'Accompagnements' : 'Boissons'}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(mode === 'side' ? sideItems : drinkItems).map(i => chip(i, mode))}
                        <button type="button" onClick={() => openAssocPicker(mode)}
                          className="flex items-center gap-1 rounded-full border-[1.5px] border-dashed border-[var(--kkb-foret-300)] px-3 py-1 font-quicksand text-xs font-bold text-[var(--kkb-foret)] hover:bg-[var(--kkb-foret-50)]">
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

      {apiError && <p role="alert" className="mt-4 rounded-[var(--kkb-r-md)] bg-[var(--kkb-danger-light)] px-3 py-2 font-quicksand text-sm text-[var(--kkb-danger)]">{apiError}</p>}

      {/* Enregistrer : pastille au-dessus de la barre basse (mobile), barre flottante alignée sur le contenu (desktop) */}
      <div className="fixed bottom-[var(--kkb-nav-offset)] left-1/2 z-30 -translate-x-1/2 lg:bottom-5 lg:left-[calc(var(--kkb-rail-offset)+var(--kkb-gutter))] lg:right-[var(--kkb-gutter)] lg:translate-x-0">
        <div className="flex items-center gap-4 lg:rounded-full lg:bg-white lg:p-2 lg:pl-6 lg:shadow-[0_12px_32px_rgba(31,58,46,0.14)]">
          <ul className="hidden flex-1 items-center gap-4 lg:flex" aria-label="Fiche à remplir">
            {checklist.map(c => (
              <li key={c.label} className={`flex items-center gap-1.5 font-quicksand text-sm ${c.done ? 'font-bold text-[var(--kkb-foret)]' : 'text-[var(--kkb-texte-2)]'}`}>
                <span className={`flex h-5 w-5 items-center justify-center rounded-full ${c.done ? 'bg-[var(--kkb-sauge)] text-[var(--kkb-profond)]' : 'border-[1.5px] border-dashed border-[var(--kkb-filet)]'}`}>
                  {c.done && <Check className="h-3 w-3" />}
                </span>
                {c.label}
                <span className="sr-only">{c.done ? '(rempli)' : '(à remplir)'}</span>
              </li>
            ))}
            {draftKey && draftStatus !== 'idle' && (
              <li className="ml-auto flex items-center gap-1.5 font-quicksand text-xs text-[var(--kkb-texte-2)]" aria-live="polite">
                {draftStatus === 'saving' ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sauvegarde…</> : <><CloudCheck className="h-3.5 w-3.5 text-[var(--kkb-foret-500)]" /> Brouillon gardé</>}
              </li>
            )}
          </ul>
          <button type="button" onClick={() => void handleSubmit()} disabled={busy}
            className="flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[var(--kkb-orange)] px-6 font-quicksand text-[15px] font-bold text-white shadow-[var(--kkb-shadow-fab)] transition-colors hover:bg-[var(--kkb-orange-700)] disabled:opacity-60 lg:px-8 lg:shadow-none">
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

      {/* Sélecteur d'accompagnement / boisson (mêmes filtres que la planification) */}
      {assocPicker && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 lg:items-center" onClick={e => { if (e.target === e.currentTarget) setAssocPicker(null) }}>
          <div role="dialog" aria-modal="true" aria-labelledby="assoc-title" className="flex max-h-[80vh] w-full flex-col rounded-t-[var(--kkb-r-xl)] bg-[var(--kkb-creme)] shadow-xl lg:max-w-lg lg:rounded-[var(--kkb-r-xl)]">
            <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-5">
              <p id="assoc-title" className="text-h3 text-[var(--kkb-profond)]">{assocPicker === 'side' ? 'Choisir un accompagnement' : 'Choisir une boisson'}</p>
              <button type="button" onClick={() => setAssocPicker(null)} className="-mr-1 flex h-9 w-9 items-center justify-center rounded-full text-[var(--kkb-texte-2)] hover:bg-white" aria-label="Fermer"><X className="h-5 w-5" /></button>
            </div>
            <div className="shrink-0 px-5 pb-3">
              <div className="flex h-11 items-center gap-2 rounded-full bg-white px-4 ring-[var(--kkb-foret-300)] focus-within:ring-2">
                <Search className="h-4 w-4 shrink-0 text-[var(--kkb-texte-2)]" />
                <input type="search" autoFocus placeholder="Chercher une recette…" aria-label="Chercher une recette" value={assocSearch}
                  onChange={e => {
                    const v = e.target.value
                    setAssocSearch(v)
                    if (assocTimer.current) clearTimeout(assocTimer.current)
                    assocTimer.current = setTimeout(() => void searchAssoc(assocScope, assocCategory, v), 300)
                  }}
                  className="flex-1 bg-transparent font-quicksand text-sm text-[var(--kkb-profond)] outline-none placeholder:text-[var(--kkb-texte-2)]" />
              </div>
            </div>
            <div className="flex shrink-0 gap-1.5 overflow-x-auto px-5 pb-2 hide-scrollbar">
              {ASSOC_SCOPE_OPTIONS.map(o => (
                <button key={o.val} type="button" onClick={() => { setAssocScope(o.val); void searchAssoc(o.val, assocCategory, assocSearch) }}
                  className={`h-9 shrink-0 whitespace-nowrap rounded-full px-3.5 font-quicksand text-xs font-bold transition-colors ${assocScope === o.val ? 'bg-[var(--kkb-foret)] text-[var(--kkb-creme)]' : 'bg-white text-[var(--kkb-texte-2)]'}`}>
                  {o.label}
                </button>
              ))}
            </div>
            {categories.length > 0 && (
              <div className="flex shrink-0 gap-1.5 overflow-x-auto px-5 pb-3 hide-scrollbar">
                {[{ id: null as string | null, name: 'Toutes', slug: '' }, ...categories].map(c => {
                  const Icon = c.id ? categoryIcon(c.slug) : null
                  return (
                    <button key={c.id ?? 'all'} type="button" onClick={() => { setAssocCategory(c.id); void searchAssoc(assocScope, c.id, assocSearch) }}
                      className={`flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 font-quicksand text-xs font-bold transition-colors ${assocCategory === c.id ? 'bg-[var(--kkb-sauge)] text-[var(--kkb-profond)]' : 'bg-white text-[var(--kkb-texte-2)]'}`}>
                      {Icon && <Icon className="h-3 w-3" />} {c.name}
                    </button>
                  )
                })}
              </div>
            )}
            <div className="mx-3 min-h-0 flex-1 overflow-y-auto rounded-[var(--kkb-r-lg)] bg-white">
              {assocLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[var(--kkb-foret)]" /></div>
              ) : assocResults.length === 0 ? (
                <p className="py-8 text-center font-quicksand text-sm text-[var(--kkb-texte-2)]">Aucune recette trouvée</p>
              ) : assocResults.map(recipe => {
                const selected = (assocPicker === 'side' ? sideItems : drinkItems).some(i => i.id === recipe.id)
                return (
                  <button key={recipe.id} type="button" onClick={() => toggleAssocItem(recipe)} aria-pressed={selected}
                    className="flex w-full items-center gap-3 border-b border-[var(--kkb-lin)] px-4 py-3 text-left last:border-0 hover:bg-[var(--kkb-foret-50)]">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] ${selected ? 'border-[var(--kkb-foret)] bg-[var(--kkb-foret)] text-[var(--kkb-creme)]' : 'border-[var(--kkb-filet)] bg-white'}`}>
                      {selected && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-quicksand text-sm font-bold text-[var(--kkb-profond)]">{recipe.name}</span>
                      {recipe.description && <span className="block truncate font-quicksand text-xs text-[var(--kkb-texte-2)]">{recipe.description}</span>}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="shrink-0 p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
              <button type="button" onClick={() => setAssocPicker(null)} className="h-11 w-full rounded-full bg-[var(--kkb-foret)] font-quicksand text-sm font-bold text-[var(--kkb-creme)]">Terminé</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function CardTitle({ id, icon: Icon, children }: { id: string; icon: typeof Clock; children: React.ReactNode }) {
  return (
    <h2 id={id} className="flex items-center gap-2.5 text-h3 text-[var(--kkb-profond)]">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--kkb-foret-50)] text-[var(--kkb-foret)]">
        <Icon className="h-4 w-4" />
      </span>
      {children}
    </h2>
  )
}
