import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import {
  ArrowLeft, BookHeart, Camera, Check, ChefHat, ChevronDown, Clock, CupSoda, Eye, Flame, Globe, History, ImagePlus,
  ListOrdered, Lock, Minus, Plus, Salad, Search, ShoppingBasket, Trash2, Users, UtensilsCrossed, X, type LucideIcon,
} from 'lucide-react-native'
import { Card, CardTitle, Field, FieldLabel, Select, Sheet, Txt, Button } from '@/components/ui'
import { get } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { categoryIcon } from '@/shared/category-icon'
import { C, F, R, SHADOW } from '@/theme'

export interface IngredientRow { _id: string; name: string; quantity: string; unit: string }
export interface StepRow { _id: string; description: string }
export interface AssocItem { id: string; name: string }
export type DifficultyVal = 'facile' | 'moyen' | 'difficile'
export type VisibilityVal = 'private' | 'circle' | 'community'

export interface RecipeFormValues {
  name: string; description: string; categoryId: string; prepTime: string; cookTime: string; servings: number
  difficulty: DifficultyVal | ''; visibility: VisibilityVal; circleId: string
  ingredients: IngredientRow[]; steps: StepRow[]; sideItems: AssocItem[]; drinkItems: AssocItem[]
  photo_url?: string; source_url?: string; raw_html_hash?: string
}

export const uid = () => Math.random().toString(36).slice(2)
export const emptyIngredient = (): IngredientRow => ({ _id: uid(), name: '', quantity: '', unit: '' })
export const emptyStep = (): StepRow => ({ _id: uid(), description: '' })
export const clearRecipeDraft = (key: string) => AsyncStorage.removeItem(key).catch(() => {})

interface Category { id: string; name: string; slug: string }
interface PickerRecipe { id: string; name: string; description: string | null }
type AssocScope = 'all' | 'mes' | 'famille' | 'communaute'

const NO_ASSOCIATIONS_SLUGS = new Set(['boisson', 'bouillie-cereales'])
const ASSOC_SCOPES: { val: AssocScope; label: string }[] = [
  { val: 'all', label: 'Tout' }, { val: 'mes', label: 'Mes recettes' }, { val: 'famille', label: 'Famille' }, { val: 'communaute', label: 'Communauté' },
]
const VISIBILITY_OPTIONS: { value: VisibilityVal; label: string; sub: string; Icon: LucideIcon }[] = [
  { value: 'private', label: 'Seulement moi', sub: 'Elle reste dans ton carnet.', Icon: Lock },
  { value: 'circle', label: 'Ma famille', sub: 'Partagée avec ton cercle, pour les menus et les sondages.', Icon: Users },
  { value: 'community', label: 'Communauté', sub: 'Elle inspire tous les foyers de KeskonBouf.', Icon: Globe },
]
const DIFFICULTY_OPTIONS: { value: DifficultyVal; label: string }[] = [
  { value: 'facile', label: 'Facile' }, { value: 'moyen', label: 'Moyen' }, { value: 'difficile', label: 'Difficile' },
]

const isMeaningful = (d: { name?: string; description?: string; ingredients?: IngredientRow[]; steps?: StepRow[] }) =>
  !!(d.name?.trim() || d.description?.trim() || d.ingredients?.some(i => i.name.trim()) || d.steps?.some(s => s.description.trim()))

// Bandeau vert des écrans de formulaire de recette.
export function RecipeFormHero({ onBack, backLabel, eyebrow, title, subtitle }: { onBack: () => void; backLabel: string; eyebrow: string; title: string; subtitle: string }) {
  return (
    <View style={{ backgroundColor: C.foret, borderRadius: R.xl, padding: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel={backLabel}
          style={{ width: 40, height: 40, borderRadius: R.pill, backgroundColor: C.white10, alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={20} color={C.creme} />
        </Pressable>
        <Txt style={{ fontFamily: F.bodySemi, fontSize: 14, color: C.foret100 }}>{eyebrow}</Txt>
      </View>
      <Txt variant="h1" color={C.creme} style={{ marginTop: 14 }}>{title}</Txt>
      <Txt variant="small" color={C.foret100} style={{ marginTop: 4, fontSize: 14 }}>{subtitle}</Txt>
    </View>
  )
}

function Stepper({ label, icon: Icon, value, onChange }: { label: string; icon: LucideIcon; value: string; onChange: (v: string) => void }) {
  const n = Number(value) || 0
  const step = (d: number) => onChange(String(Math.max(0, n + d)))
  return (
    <View style={{ flex: 1, borderRadius: R.lg, backgroundColor: C.creme, padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon size={16} color={C.foret500} /><Txt variant="smallBold" style={{ fontSize: 14 }}>{label}</Txt>
      </View>
      <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Pressable onPress={() => step(-5)} disabled={n <= 0} accessibilityLabel={`Moins 5 minutes (${label.toLowerCase()})`}
          style={{ width: 32, height: 32, borderRadius: R.pill, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', opacity: n <= 0 ? 0.4 : 1 }}>
          <Minus size={14} color={C.foret} />
        </Pressable>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}>
          <TextInput value={value} onChangeText={v => onChange(v.replace(/\D/g, ''))} placeholder="0" placeholderTextColor={C.texte2} keyboardType="number-pad"
            accessibilityLabel={`${label} en minutes`} style={{ minWidth: 28, textAlign: 'right', fontFamily: F.title, fontSize: 20, color: C.profond, padding: 0 }} />
          <Txt variant="meta">min</Txt>
        </View>
        <Pressable onPress={() => step(5)} accessibilityLabel={`Plus 5 minutes (${label.toLowerCase()})`}
          style={{ width: 32, height: 32, borderRadius: R.pill, backgroundColor: C.foret, alignItems: 'center', justifyContent: 'center' }}>
          <Plus size={14} color={C.creme} />
        </Pressable>
      </View>
    </View>
  )
}

function AddRowButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      style={({ pressed }) => ({ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: R.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.foret300, backgroundColor: pressed ? C.foret50 : 'transparent' })}>
      <Plus size={16} color={C.foret} /><Txt variant="smallBold" color={C.foret} style={{ fontSize: 14 }}>{label}</Txt>
    </Pressable>
  )
}

// Formulaire de recette (cf. app/(app)/recipes/_recipe-form.tsx).
export function RecipeForm({ defaultValues, onSubmit, loading, apiError, submitLabel = 'Enregistrer la recette', hideVisibility = false, draftKey, header }: {
  defaultValues?: Partial<RecipeFormValues>; onSubmit: (v: RecipeFormValues) => Promise<void>; loading: boolean; apiError: string | null
  submitLabel?: string; hideVisibility?: boolean; draftKey?: string; header?: React.ReactNode
}) {
  const insets = useSafeAreaInsets()
  const [name, setName] = useState(defaultValues?.name ?? '')
  const [description, setDescription] = useState(defaultValues?.description ?? '')
  const [categoryId, setCategoryId] = useState(defaultValues?.categoryId ?? '')
  const [prepTime, setPrepTime] = useState(defaultValues?.prepTime ?? '')
  const [cookTime, setCookTime] = useState(defaultValues?.cookTime ?? '')
  const [servings, setServings] = useState(defaultValues?.servings ?? 4)
  const [difficulty, setDifficulty] = useState<DifficultyVal | ''>(defaultValues?.difficulty ?? 'moyen')
  const [visibility, setVisibility] = useState<VisibilityVal>(defaultValues?.visibility ?? 'private')
  const [circleId, setCircleId] = useState(defaultValues?.circleId ?? '')
  const [ingredients, setIngredients] = useState<IngredientRow[]>(defaultValues?.ingredients?.length ? defaultValues.ingredients : [emptyIngredient()])
  const [steps, setSteps] = useState<StepRow[]>(defaultValues?.steps?.length ? defaultValues.steps : [emptyStep()])
  const [sideItems, setSideItems] = useState<AssocItem[]>(defaultValues?.sideItems ?? [])
  const [drinkItems, setDrinkItems] = useState<AssocItem[]>(defaultValues?.drinkItems ?? [])
  const [nameError, setNameError] = useState<string | null>(null)
  const [circleError, setCircleError] = useState<string | null>(null)
  const [photo, setPhoto] = useState<{ uri: string; mime: string; ext: string } | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(defaultValues?.photo_url ?? null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [circles, setCircles] = useState<{ id: string; name: string }[]>([])
  const [assocOpen, setAssocOpen] = useState(false)
  const [picker, setPicker] = useState<'side' | 'drink' | null>(null)
  const [assocSearch, setAssocSearch] = useState('')
  const [assocScope, setAssocScope] = useState<AssocScope>('all')
  const [assocCategory, setAssocCategory] = useState<string | null>(null)
  const [assocResults, setAssocResults] = useState<PickerRecipe[]>([])
  const [assocLoading, setAssocLoading] = useState(false)
  const assocTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [draftRestored, setDraftRestored] = useState(false)
  const draftReady = useRef(!draftKey)
  const refs = useRef<Record<string, TextInput | null>>({})
  const [focusId, setFocusId] = useState<string | null>(null)

  const selectedSlug = categories.find(c => c.id === categoryId)?.slug
  const hideAssociations = !!selectedSlug && NO_ASSOCIATIONS_SLUGS.has(selectedSlug)

  useEffect(() => {
    void get<Category[]>('/api/categories').then(d => { if (Array.isArray(d)) setCategories(d) })
    void get<{ data?: { id: string; name: string }[] }>('/api/circles').then(d => setCircles((d?.data ?? []).map(c => ({ id: c.id, name: c.name }))))
  }, [])

  useEffect(() => {
    if (!focusId) return
    refs.current[focusId]?.focus()
    setFocusId(null)
  }, [focusId, ingredients, steps])

  // Brouillon local (création) : restauré au montage, gardé 2 s après la dernière saisie.
  const snapshot = useMemo(() => ({
    name, description, categoryId, prepTime, cookTime, servings, difficulty, visibility, circleId, ingredients, steps, sideItems, drinkItems,
  }), [name, description, categoryId, prepTime, cookTime, servings, difficulty, visibility, circleId, ingredients, steps, sideItems, drinkItems])

  useEffect(() => {
    if (!draftKey) return
    void (async () => {
      try {
        const raw = defaultValues?.name ? null : await AsyncStorage.getItem(draftKey)
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
          if (d.steps?.length) setSteps(d.steps)
          if (d.sideItems) setSideItems(d.sideItems)
          if (d.drinkItems) setDrinkItems(d.drinkItems)
          setDraftRestored(true)
        }
      } catch { /* brouillon illisible : ignoré */ }
      draftReady.current = true
    })()
  }, [draftKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!draftKey || !draftReady.current || !isMeaningful(snapshot)) return
    const t = setTimeout(() => { void AsyncStorage.setItem(draftKey, JSON.stringify(snapshot)).catch(() => {}) }, 2000)
    return () => clearTimeout(t)
  }, [draftKey, snapshot])

  function discardDraft() {
    if (!draftKey) return
    void clearRecipeDraft(draftKey)
    setName(''); setDescription(''); setCategoryId(''); setPrepTime(''); setCookTime('')
    setServings(4); setDifficulty('moyen'); setVisibility('private'); setCircleId('')
    setIngredients([emptyIngredient()]); setSteps([emptyStep()]); setSideItems([]); setDrinkItems([])
    setDraftRestored(false)
  }

  async function searchAssoc(scope: AssocScope, catId: string | null, query: string) {
    setAssocLoading(true)
    const params = new URLSearchParams({ scope })
    if (catId) params.set('category_id', catId)
    if (query.trim()) params.set('search', query.trim())
    const data = await get<PickerRecipe[]>(`/api/recipes?${params.toString()}`)
    setAssocResults(Array.isArray(data) ? data : [])
    setAssocLoading(false)
  }

  function openPicker(mode: 'side' | 'drink') {
    setPicker(mode); setAssocSearch(''); setAssocScope('all'); setAssocCategory(null)
    void searchAssoc('all', null, '')
  }

  function toggleAssoc(r: PickerRecipe) {
    const set = picker === 'side' ? setSideItems : setDrinkItems
    set(prev => (prev.some(i => i.id === r.id) ? prev.filter(i => i.id !== r.id) : [...prev, { id: r.id, name: r.name }]))
  }

  async function pickPhoto(source: 'library' | 'camera') {
    const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { setPhotoError('Autorise l’accès aux photos pour en ajouter une.'); return }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.8 }
    const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts)
    if (res.canceled || !res.assets[0]) return
    const a = res.assets[0]
    if (a.fileSize && a.fileSize > 5 * 1024 * 1024) { setPhotoError('Fichier trop lourd (max 5 Mo)'); return }
    const mime = a.mimeType ?? 'image/jpeg'
    setPhoto({ uri: a.uri, mime, ext: mime.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg' })
    setPhotoPreview(a.uri)
    setPhotoError(null)
  }

  async function handleSubmit() {
    setNameError(null); setCircleError(null)
    if (name.trim().length < 2) { setNameError('Minimum 2 caractères'); refs.current.name?.focus(); return }
    if (visibility === 'circle' && !circleId) { setCircleError('Sélectionne un cercle familial'); return }

    let photoUrl = defaultValues?.photo_url ?? undefined
    if (photo) {
      setUploading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Session expirée')
        const body = await (await fetch(photo.uri)).arrayBuffer()
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${photo.ext}`
        const { data: up, error } = await supabase.storage.from('recipe-photos').upload(path, body, { contentType: photo.mime, upsert: false })
        if (error || !up) throw new Error(error?.message ?? 'Erreur lors de l’envoi de la photo')
        photoUrl = supabase.storage.from('recipe-photos').getPublicUrl(up.path).data.publicUrl
      } catch (e) {
        setUploading(false)
        setPhotoError(e instanceof Error ? e.message : 'Erreur lors de l’envoi de la photo')
        return
      }
      setUploading(false)
    } else if (photoPreview === null) {
      photoUrl = undefined
    }

    await onSubmit({
      ...snapshot,
      sideItems: hideAssociations ? [] : sideItems,
      drinkItems: hideAssociations ? [] : drinkItems,
      photo_url: photoUrl, source_url: defaultValues?.source_url, raw_html_hash: defaultValues?.raw_html_hash,
    })
  }

  function addIngredientAfter(id?: string) {
    const row = emptyIngredient()
    setIngredients(p => { const i = id ? p.findIndex(x => x._id === id) : p.length - 1; return [...p.slice(0, i + 1), row, ...p.slice(i + 1)] })
    setFocusId(`ing-${row._id}`)
  }
  function addStep() { const row = emptyStep(); setSteps(p => [...p, row]); setFocusId(`step-${row._id}`) }
  const updIng = (id: string, f: keyof Omit<IngredientRow, '_id'>, v: string) => setIngredients(p => p.map(i => (i._id === id ? { ...i, [f]: v } : i)))

  const busy = loading || uploading
  const assocCount = sideItems.length + drinkItems.length
  const cell = { height: 40, borderRadius: R.sm, backgroundColor: '#FFFFFF', paddingHorizontal: 10, fontFamily: F.body, fontSize: 14, color: C.profond } as const

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 8, paddingBottom: 120 + insets.bottom, gap: 16 }} keyboardShouldPersistTaps="handled">
        {header}

        {draftRestored && (
          <View style={{ borderRadius: R.lg, backgroundColor: C.sauge50, paddingHorizontal: 16, paddingVertical: 12, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <History size={16} color={C.foret500} />
              <Txt style={{ flex: 1, fontSize: 14 }}>Brouillon retrouvé : tu reprends là où tu t’étais arrêté(e).</Txt>
            </View>
            <Pressable onPress={discardDraft} hitSlop={6}><Txt variant="smallBold" color={C.foret} style={{ textDecorationLine: 'underline' }}>Repartir de zéro</Txt></Pressable>
          </View>
        )}

        {/* La fiche */}
        <Card style={{ gap: 16 }}>
          <CardTitle icon={BookHeart} title="La fiche" />
          {photoPreview ? (
            <View style={{ borderRadius: R.lg, overflow: 'hidden' }}>
              <Image source={{ uri: photoPreview }} style={{ width: '100%', aspectRatio: 4 / 3 }} resizeMode="cover" accessibilityLabel="Aperçu de la photo" />
              <Pressable onPress={() => { setPhoto(null); setPhotoPreview(null) }} accessibilityLabel="Retirer la photo"
                style={{ position: 'absolute', right: 12, top: 12, width: 36, height: 36, borderRadius: R.pill, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color={C.foret} />
              </Pressable>
              <Pressable onPress={() => void pickPhoto('library')} accessibilityRole="button"
                style={{ position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: R.pill, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 16, paddingVertical: 8 }}>
                <Camera size={16} color={C.foret} /><Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.foret }}>Changer la photo</Txt>
              </Pressable>
            </View>
          ) : (
            <View style={{ aspectRatio: 16 / 9, borderRadius: R.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.foret300, backgroundColor: C.foret50, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 }}>
              <View style={{ width: 56, height: 56, borderRadius: R.pill, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                <ImagePlus size={24} color={C.foret} />
              </View>
              <Txt variant="smallBold" color={C.foret} style={{ fontSize: 14 }}>Ajoute une photo gourmande</Txt>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button label="Galerie" icon={ImagePlus} tone="ghost" size="sm" onPress={() => void pickPhoto('library')} />
                <Button label="Appareil photo" icon={Camera} tone="ghost" size="sm" onPress={() => void pickPhoto('camera')} />
              </View>
              <Txt variant="meta">5 Mo maximum</Txt>
            </View>
          )}
          {!!photoError && <Txt variant="meta" color={C.danger}>{photoError}</Txt>}

          <View>
            <FieldLabel>Nom de la recette *</FieldLabel>
            <Field ref={el => { refs.current.name = el }} value={name} onChangeText={v => { setName(v); setNameError(null) }} big invalid={!!nameError}
              placeholder="Ex. Alloco croustillant et poisson braisé" accessibilityLabel="Nom de la recette" />
            {!!nameError && <Txt variant="meta" color={C.danger} style={{ marginTop: 4 }}>{nameError}</Txt>}
          </View>
          <View>
            <FieldLabel>Catégorie</FieldLabel>
            <Select label="Catégorie" value={categoryId} onChange={setCategoryId} placeholder="Choisir une catégorie"
              options={[...(categoryId ? [{ value: '', label: 'Aucune catégorie' }] : []), ...categories.map(c => ({ value: c.id, label: c.name }))]} />
          </View>
          <View>
            <FieldLabel>Le mot de la cuisine</FieldLabel>
            <Field value={description} onChangeText={setDescription} multiline style={{ minHeight: 90 }}
              placeholder="Le secret de famille : tremper les tranches de plantain dans une eau légèrement salée…" accessibilityLabel="Le mot de la cuisine" />
          </View>
        </Card>

        {/* Ingrédients */}
        <Card style={{ gap: 12 }}>
          <CardTitle icon={ShoppingBasket} title="Ingrédients" />
          {ingredients.map((ing, idx) => (
            <View key={ing._id} style={{ borderRadius: R.lg, backgroundColor: C.creme, padding: 6, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TextInput ref={el => { refs.current[`ing-${ing._id}`] = el }} value={ing.name} onChangeText={v => updIng(ing._id, 'name', v)}
                  placeholder={idx === 0 ? 'Ex. Bananes plantains mûres' : `Ingrédient ${idx + 1}`} placeholderTextColor={C.texte2}
                  returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => addIngredientAfter(ing._id)}
                  accessibilityLabel={`Nom de l’ingrédient ${idx + 1}`} style={[cell, { flex: 1 }]} />
                <Pressable onPress={() => setIngredients(p => (p.length > 1 ? p.filter(i => i._id !== ing._id) : p))} disabled={ingredients.length === 1}
                  accessibilityLabel={`Supprimer l’ingrédient ${idx + 1}`} style={{ width: 36, height: 36, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center', opacity: ingredients.length === 1 ? 0.3 : 1 }}>
                  <Trash2 size={16} color={C.texte2} />
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TextInput value={ing.quantity} onChangeText={v => updIng(ing._id, 'quantity', v)} placeholder="Qté" placeholderTextColor={C.texte2} keyboardType="decimal-pad"
                  accessibilityLabel={`Quantité de l’ingrédient ${idx + 1}`} style={[cell, { flex: 1, textAlign: 'center', fontFamily: F.title, color: C.foret }]} />
                <TextInput value={ing.unit} onChangeText={v => updIng(ing._id, 'unit', v)} placeholder="Unité" placeholderTextColor={C.texte2}
                  accessibilityLabel={`Unité de l’ingrédient ${idx + 1}`} style={[cell, { flex: 2 }]} />
              </View>
            </View>
          ))}
          <AddRowButton label="Ajouter un ingrédient" onPress={() => addIngredientAfter()} />
        </Card>

        {/* Préparation */}
        <Card style={{ gap: 12 }}>
          <CardTitle icon={ListOrdered} title="Préparation" right={(
            <View style={{ borderRadius: R.pill, backgroundColor: C.foret50, paddingHorizontal: 10, paddingVertical: 2 }}>
              <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.foret }}>{steps.length} étape{steps.length > 1 ? 's' : ''}</Txt>
            </View>
          )} />
          {steps.map((step, idx) => (
            <View key={step._id} style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ marginTop: 6, width: 36, height: 36, borderRadius: R.pill, backgroundColor: C.foret, alignItems: 'center', justifyContent: 'center' }}>
                <Txt style={{ fontFamily: F.title, fontSize: 14, color: C.creme }}>{idx + 1}</Txt>
              </View>
              <Field ref={el => { refs.current[`step-${step._id}`] = el }} value={step.description} multiline
                onChangeText={v => setSteps(p => p.map(s => (s._id === step._id ? { ...s, description: v } : s)))}
                placeholder={idx === 0 ? 'Éplucher les bananes plantains, les couper en rondelles obliques…' : `Étape ${idx + 1}…`}
                accessibilityLabel={`Description de l’étape ${idx + 1}`} style={{ flex: 1, minHeight: 70 }} />
              <Pressable onPress={() => setSteps(p => (p.length > 1 ? p.filter(s => s._id !== step._id) : p))} disabled={steps.length === 1}
                accessibilityLabel={`Supprimer l’étape ${idx + 1}`} style={{ marginTop: 6, width: 36, height: 36, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center', opacity: steps.length === 1 ? 0.3 : 1 }}>
                <Trash2 size={16} color={C.texte2} />
              </Pressable>
            </View>
          ))}
          <AddRowButton label="Ajouter une étape" onPress={addStep} />
        </Card>

        {/* En cuisine */}
        <Card style={{ gap: 12 }}>
          <CardTitle icon={ChefHat} title="En cuisine" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Stepper label="Préparation" icon={Clock} value={prepTime} onChange={setPrepTime} />
            <Stepper label="Cuisson" icon={Flame} value={cookTime} onChange={setCookTime} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: R.lg, backgroundColor: C.creme, padding: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Users size={16} color={C.foret500} /><Txt variant="smallBold" style={{ fontSize: 14 }}>Portions</Txt></View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable onPress={() => setServings(s => Math.max(1, s - 1))} disabled={servings <= 1} accessibilityLabel="Moins de portions"
                style={{ width: 36, height: 36, borderRadius: R.pill, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', opacity: servings <= 1 ? 0.4 : 1 }}>
                <Minus size={16} color={C.foret} />
              </Pressable>
              <Txt style={{ minWidth: 24, textAlign: 'center', fontFamily: F.title, fontSize: 20, color: C.foret }}>{servings}</Txt>
              <Pressable onPress={() => setServings(s => s + 1)} accessibilityLabel="Plus de portions"
                style={{ width: 36, height: 36, borderRadius: R.pill, backgroundColor: C.foret, alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={16} color={C.creme} />
              </Pressable>
            </View>
          </View>
          <FieldLabel>Niveau</FieldLabel>
          <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="radiogroup">
            {DIFFICULTY_OPTIONS.map((o, i) => {
              const sel = difficulty === o.value
              return (
                <Pressable key={o.value} onPress={() => setDifficulty(o.value)} accessibilityRole="radio" accessibilityState={{ checked: sel }}
                  style={{ flex: 1, alignItems: 'center', gap: 4, borderRadius: R.lg, borderWidth: 1.5, borderColor: sel ? C.foret : C.filet, backgroundColor: sel ? C.foret : '#FFFFFF', paddingVertical: 10 }}>
                  <View style={{ flexDirection: 'row' }}>
                    {[0, 1, 2].map(h => <ChefHat key={h} size={14} color={h <= i ? (sel ? C.sauge : C.foret500) : (sel ? C.white25 : C.filet)} />)}
                  </View>
                  <Txt style={{ fontFamily: F.bodyBold, fontSize: 14, color: sel ? C.creme : C.texte2 }}>{o.label}</Txt>
                </Pressable>
              )
            })}
          </View>
        </Card>

        {/* Pour l'accompagner */}
        {!hideAssociations && (
          <Card style={{ gap: 12 }}>
            <Pressable onPress={() => setAssocOpen(o => !o)} accessibilityRole="button" accessibilityState={{ expanded: assocOpen }}>
              <CardTitle icon={UtensilsCrossed} title="Pour l’accompagner" right={(
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Txt variant="meta">{assocCount > 0 ? `${assocCount} choisi${assocCount > 1 ? 's' : ''}` : 'Facultatif'}</Txt>
                  <ChevronDown size={16} color={C.texte2} style={{ transform: [{ rotate: assocOpen ? '180deg' : '0deg' }] }} />
                </View>
              )} />
            </Pressable>
            {assocOpen && (
              <View style={{ gap: 14 }}>
                <Txt variant="small" style={{ fontSize: 14 }}>Qu’est-ce qui va bien avec ce plat ? Ces idées seront proposées sur la fiche.</Txt>
                {(['side', 'drink'] as const).map(mode => {
                  const list = mode === 'side' ? sideItems : drinkItems
                  return (
                    <View key={mode} style={{ gap: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {mode === 'side' ? <Salad size={16} color={C.jauneText} /> : <CupSoda size={16} color={C.foret500} />}
                        <Txt variant="smallBold" style={{ fontSize: 14 }}>{mode === 'side' ? 'Accompagnements' : 'Boissons'}</Txt>
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {list.map(item => (
                          <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: R.pill, paddingVertical: 4, paddingLeft: 12, paddingRight: 6, backgroundColor: mode === 'side' ? C.jaune50 : C.sauge50 }}>
                            <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: mode === 'side' ? C.jauneText : C.foret500 }}>{item.name}</Txt>
                            <Pressable onPress={() => (mode === 'side' ? setSideItems : setDrinkItems)(p => p.filter(i => i.id !== item.id))} hitSlop={8} accessibilityLabel={`Retirer ${item.name}`}>
                              <X size={12} color={mode === 'side' ? C.jauneText : C.foret500} />
                            </Pressable>
                          </View>
                        ))}
                        <Pressable onPress={() => openPicker(mode)} accessibilityRole="button"
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: R.pill, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.foret300, paddingHorizontal: 12, paddingVertical: 4 }}>
                          <Plus size={12} color={C.foret} /><Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.foret }}>Ajouter</Txt>
                        </Pressable>
                      </View>
                    </View>
                  )
                })}
              </View>
            )}
          </Card>
        )}

        {/* Qui la voit ? */}
        {!hideVisibility && (
          <Card style={{ gap: 10 }}>
            <CardTitle icon={Eye} title="Qui la voit ?" />
            {VISIBILITY_OPTIONS.map(o => {
              const sel = visibility === o.value
              return (
                <Pressable key={o.value} onPress={() => setVisibility(o.value)} accessibilityRole="radio" accessibilityState={{ checked: sel }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: R.lg, borderWidth: 1.5, borderColor: sel ? C.foret : C.filet, backgroundColor: sel ? C.foret50 : '#FFFFFF', padding: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: R.pill, backgroundColor: sel ? C.foret : C.creme, alignItems: 'center', justifyContent: 'center' }}>
                    <o.Icon size={18} color={sel ? C.creme : C.foret} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt variant="smallBold" style={{ fontSize: 14 }}>{o.label}</Txt>
                    <Txt variant="meta">{o.sub}</Txt>
                  </View>
                  <View style={{ width: 20, height: 20, borderRadius: R.pill, borderWidth: 2, borderColor: sel ? C.foret : C.filet, alignItems: 'center', justifyContent: 'center' }}>
                    {sel && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.foret }} />}
                  </View>
                </Pressable>
              )
            })}
            {visibility === 'circle' && (circles.length === 0 ? (
              <Txt variant="meta">Aucun cercle familial. <Txt variant="meta" color={C.foret} style={{ fontFamily: F.bodyBold, textDecorationLine: 'underline' }} onPress={() => router.push('/circle/create')}>Créer un cercle</Txt></Txt>
            ) : (
              <View>
                <Select label="Cercle familial" value={circleId} onChange={v => { setCircleId(v); setCircleError(null) }} placeholder="Choisir un cercle *"
                  options={circles.map(c => ({ value: c.id, label: c.name }))} invalid={!!circleError} />
                {!!circleError && <Txt variant="meta" color={C.danger} style={{ marginTop: 4 }}>{circleError}</Txt>}
              </View>
            ))}
          </Card>
        )}

        {!!apiError && (
          <View accessibilityRole="alert" style={{ borderRadius: R.md, backgroundColor: C.dangerLight, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Txt variant="small" color={C.danger} style={{ fontSize: 14 }}>{apiError}</Txt>
          </View>
        )}
      </ScrollView>

      {/* Enregistrer : pastille flottante */}
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 16, alignItems: 'center' }}>
        <Pressable onPress={() => void handleSubmit()} disabled={busy} accessibilityRole="button" accessibilityLabel={submitLabel}
          style={({ pressed }) => [{ height: 52, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, borderRadius: R.pill, backgroundColor: C.orange, opacity: busy ? 0.7 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }, SHADOW.fab]}>
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Check size={18} color="#FFFFFF" />}
          <Txt style={{ fontFamily: F.bodyBold, fontSize: 15, color: '#FFFFFF' }}>{uploading ? 'Envoi de la photo…' : submitLabel}</Txt>
        </Pressable>
      </View>

      {/* Sélecteur d'accompagnement / boisson */}
      <Sheet open={!!picker} onClose={() => setPicker(null)} title={picker === 'side' ? 'Choisir un accompagnement' : 'Choisir une boisson'} maxHeight="85%"
        footer={<Button label="Terminé" tone="foret" full onPress={() => setPicker(null)} />}>
        <View style={{ paddingHorizontal: 16, gap: 8, paddingBottom: 8 }}>
          <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: R.pill, backgroundColor: '#FFFFFF', paddingHorizontal: 14 }}>
            <Search size={16} color={C.texte2} />
            <TextInput value={assocSearch} placeholder="Chercher une recette…" placeholderTextColor={C.texte2} accessibilityLabel="Chercher une recette"
              onChangeText={v => {
                setAssocSearch(v)
                if (assocTimer.current) clearTimeout(assocTimer.current)
                assocTimer.current = setTimeout(() => void searchAssoc(assocScope, assocCategory, v), 300)
              }}
              style={{ flex: 1, fontFamily: F.body, fontSize: 14, color: C.profond, paddingVertical: 0 }} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} keyboardShouldPersistTaps="handled">
            {ASSOC_SCOPES.map(o => (
              <Pressable key={o.val} onPress={() => { setAssocScope(o.val); void searchAssoc(o.val, assocCategory, assocSearch) }}
                style={{ height: 36, justifyContent: 'center', paddingHorizontal: 14, borderRadius: R.pill, backgroundColor: assocScope === o.val ? C.foret : '#FFFFFF' }}>
                <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: assocScope === o.val ? C.creme : C.texte2 }}>{o.label}</Txt>
              </Pressable>
            ))}
          </ScrollView>
          {categories.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} keyboardShouldPersistTaps="handled">
              {[{ id: null as string | null, name: 'Toutes', slug: '' }, ...categories].map(c => {
                const Icon = c.id ? categoryIcon(c.slug) : null
                const active = assocCategory === c.id
                return (
                  <Pressable key={c.id ?? 'all'} onPress={() => { setAssocCategory(c.id); void searchAssoc(assocScope, c.id, assocSearch) }}
                    style={{ height: 32, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, borderRadius: R.pill, backgroundColor: active ? C.sauge : '#FFFFFF' }}>
                    {Icon && <Icon size={12} color={active ? C.profond : C.texte2} />}
                    <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: active ? C.profond : C.texte2 }}>{c.name}</Txt>
                  </Pressable>
                )
              })}
            </ScrollView>
          )}
        </View>
        <ScrollView style={{ flexShrink: 1, marginHorizontal: 12, borderRadius: R.lg, backgroundColor: '#FFFFFF' }} keyboardShouldPersistTaps="handled">
          {assocLoading ? <ActivityIndicator style={{ paddingVertical: 28 }} color={C.foret} />
            : assocResults.length === 0 ? <Txt variant="small" style={{ textAlign: 'center', paddingVertical: 28 }}>Aucune recette trouvée</Txt>
            : assocResults.slice(0, 60).map(r => {
              const sel = (picker === 'side' ? sideItems : drinkItems).some(i => i.id === r.id)
              return (
                <Pressable key={r.id} onPress={() => toggleAssoc(r)} accessibilityRole="checkbox" accessibilityState={{ checked: sel }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: C.lin }}>
                  <View style={{ width: 20, height: 20, borderRadius: R.pill, borderWidth: 1.5, borderColor: sel ? C.foret : C.filet, backgroundColor: sel ? C.foret : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                    {sel && <Check size={12} color={C.creme} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt numberOfLines={1} variant="smallBold" style={{ fontSize: 14 }}>{r.name}</Txt>
                    {!!r.description && <Txt numberOfLines={1} variant="meta">{r.description}</Txt>}
                  </View>
                </Pressable>
              )
            })}
        </ScrollView>
      </Sheet>
    </View>
  )
}
