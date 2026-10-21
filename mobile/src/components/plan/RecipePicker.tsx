import { useCallback, useRef, useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, TextInput, View } from 'react-native'
import { Check, ChefHat, ChevronDown, Clock, CupSoda, PenLine, Salad, Search, UtensilsCrossed, X, type LucideIcon } from 'lucide-react-native'
import { Button, MealTile, Sheet, Txt } from '@/components/ui'
import { get } from '@/lib/api'
import { SCOPE_OPTIONS, type RecipeScope } from '@/shared/recipe-scope'
import { categoryIcon } from '@/shared/category-icon'
import type { MealType } from '@/shared/meal-type'
import { C, F, R } from '@/theme'
import type { CompositionChip } from './PlanBlocks'

export interface PickerRecipe { id: string; name: string; visibility: string; photo_url: string | null; prep_time_min: number | null }
export interface PickerCategory { id: string; name: string; slug?: string }
interface Constraint { forceCategoryId?: string | null; excludeCategoryId?: string | null }

// État d'une liste de recettes (plat principal, accompagnement, boisson) :
// recherche, origine, catégorie — chaque instance est indépendante.
export function useRecipePicker() {
  const [scope, setScopeState] = useState<RecipeScope>('all')
  const [categoryId, setCategoryState] = useState<string | null>(null)
  const [search, setSearchState] = useState('')
  const [recipes, setRecipes] = useState<PickerRecipe[]>([])
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const constraint = useRef<Constraint>({})

  const load = useCallback(async (q: string, sc: RecipeScope, cat: string | null) => {
    setLoading(true)
    const params = new URLSearchParams({ scope: sc })
    const catId = constraint.current.forceCategoryId ?? cat
    if (catId) params.set('category_id', catId)
    else if (constraint.current.excludeCategoryId) params.set('exclude_category_id', constraint.current.excludeCategoryId)
    if (q.trim()) params.set('search', q.trim())
    const data = await get<PickerRecipe[]>(`/api/recipes?${params.toString()}`)
    setRecipes(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  return {
    scope, categoryId, search, recipes, loading,
    setScope: (v: RecipeScope) => { setScopeState(v); void load(search, v, categoryId) },
    setCategoryId: (v: string | null) => { setCategoryState(v); void load(search, scope, v) },
    setSearch: (v: string) => {
      setSearchState(v)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void load(v, scope, categoryId), 300)
    },
    reset: (c: Constraint = {}) => {
      constraint.current = c
      setScopeState('all'); setCategoryState(null); setSearchState('')
      void load('', 'all', null)
    },
  }
}
export type RecipePickerState = ReturnType<typeof useRecipePicker>

const VISIBILITY_TAG: Record<string, string> = { circle: 'Famille', community: 'Communauté' }

function PillRow<T extends string | null>({ items, value, onChange }: { items: { val: T; label: string; icon?: LucideIcon }[]; value: T; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} keyboardShouldPersistTaps="handled">
      {items.map(it => {
        const active = it.val === value
        const fg = active ? C.creme : C.texte2
        return (
          <Pressable key={String(it.val)} onPress={() => onChange(it.val)} accessibilityRole="button" accessibilityState={{ selected: active }}
            style={{ height: 32, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, borderRadius: R.pill, backgroundColor: active ? C.foret : '#FFFFFF' }}>
            {it.icon && <it.icon size={14} color={fg} />}
            <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: fg }}>{it.label}</Txt>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <View style={{ height: 40, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: R.pill, backgroundColor: '#FFFFFF', paddingHorizontal: 14 }}>
      <Search size={16} color={C.texte2} />
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={C.texte2} accessibilityLabel={placeholder}
        style={{ flex: 1, fontFamily: F.body, fontSize: 14, color: C.profond, paddingVertical: 0 }} />
    </View>
  )
}

function Filters({ picker, categories }: { picker: RecipePickerState; categories: PickerCategory[] }) {
  return (
    <>
      <PillRow items={SCOPE_OPTIONS} value={picker.scope} onChange={picker.setScope} />
      {categories.length > 0 && (
        <PillRow<string | null>
          items={[{ val: null, label: 'Toutes' }, ...categories.map(c => ({ val: c.id as string | null, label: c.name, icon: categoryIcon(c.slug) }))]}
          value={picker.categoryId} onChange={picker.setCategoryId} />
      )}
    </>
  )
}

function Thumb({ uri, size }: { uri: string | null; size: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size > 36 ? R.md : R.sm, overflow: 'hidden', backgroundColor: C.creme, alignItems: 'center', justifyContent: 'center' }}>
      {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} /> : <UtensilsCrossed size={size * 0.42} color={C.foret500} />}
    </View>
  )
}

function Section({ icon: Icon, title, summary, done, disabled, open, onToggle, children }: {
  icon: LucideIcon; title: string; summary: string; done?: boolean; disabled?: boolean; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <View style={{ borderRadius: R.lg, backgroundColor: open ? 'rgba(245,234,219,0.5)' : 'transparent' }}>
      <Pressable onPress={onToggle} disabled={disabled} accessibilityRole="button" accessibilityState={{ expanded: open, disabled }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, opacity: disabled ? 0.5 : 1 }}>
        <View style={{ width: 36, height: 36, borderRadius: R.pill, backgroundColor: done ? C.sauge : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
          {done ? <Check size={16} color={C.profond} /> : <Icon size={16} color={C.foret} />}
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="smallBold" style={{ fontSize: 14 }}>{title}</Txt>
          <Txt variant="meta" numberOfLines={1}>{summary}</Txt>
        </View>
        {!disabled && <ChevronDown size={16} color={C.texte2} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />}
      </Pressable>
      {open && !disabled && <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 10 }}>{children}</View>}
    </View>
  )
}

function CompositionList({ picker, categories, chips, removingId, togglingId, onRemove, onToggle }: {
  picker: RecipePickerState; categories: PickerCategory[]; chips: CompositionChip[]; removingId: string | null; togglingId: string | null
  onRemove: (compId: string) => void; onToggle: (r: PickerRecipe) => void
}) {
  const selected = chips.map(c => c.recipeId)
  return (
    <>
      {chips.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {chips.map(chip => (
            <View key={chip.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: R.pill, backgroundColor: C.foret50, paddingVertical: 4, paddingLeft: 12, paddingRight: 6 }}>
              <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.foret }}>{chip.name}</Txt>
              <Pressable onPress={() => onRemove(chip.id)} disabled={removingId === chip.id} accessibilityLabel={`Retirer ${chip.name}`} hitSlop={8}
                style={{ width: 22, height: 22, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center' }}>
                {removingId === chip.id ? <ActivityIndicator size="small" color={C.foret} /> : <X size={12} color={C.foret} />}
              </Pressable>
            </View>
          ))}
        </View>
      )}
      <SearchBox value={picker.search} onChange={picker.setSearch} placeholder="Rechercher…" />
      <Filters picker={picker} categories={categories} />
      <View style={{ borderRadius: R.lg, backgroundColor: '#FFFFFF', padding: 6 }}>
        {picker.loading ? <ActivityIndicator style={{ paddingVertical: 16 }} color={C.foret} />
          : picker.recipes.length === 0 ? <Txt variant="meta" style={{ textAlign: 'center', paddingVertical: 12 }}>Aucune recette</Txt>
          : picker.recipes.slice(0, 40).map(r => {
            const checked = selected.includes(r.id)
            return (
              <Pressable key={r.id} onPress={() => onToggle(r)} disabled={togglingId === r.id} accessibilityRole="checkbox" accessibilityState={{ checked }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingVertical: 6, borderRadius: R.md, backgroundColor: checked ? C.foret50 : 'transparent' }}>
                <View style={{ width: 20, height: 20, borderRadius: R.pill, borderWidth: 1.5, borderColor: checked ? C.foret : C.filet, backgroundColor: checked ? C.foret : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                  {checked && <Check size={12} color={C.creme} />}
                </View>
                <Thumb uri={r.photo_url} size={32} />
                <Txt numberOfLines={1} style={{ flex: 1, fontFamily: F.bodySemi, fontSize: 14, color: C.profond }}>{r.name}</Txt>
                {togglingId === r.id && <ActivityIndicator size="small" color={C.foret} />}
              </Pressable>
            )
          })}
      </View>
    </>
  )
}

type SectionKey = 'main' | 'side' | 'drink'

export interface CompositionBundle {
  chips: CompositionChip[]; picker: RecipePickerState; categories: PickerCategory[]
  onToggle: (r: PickerRecipe) => void
}

// Feuille « Choisir une recette » (cf. components/plan/recipe-picker-panel.tsx) :
// plat principal, puis accompagnements et boissons ; chaque choix est enregistré aussitôt.
export function RecipePickerSheet({
  open, onClose, title, subtitle, mealType, currentRecipeName, main, categories, picking, onPick,
  side, drink, removingId, togglingId, onRemove, onCreateCustom,
}: {
  open: boolean; onClose: () => void; title: string; subtitle: string; mealType: MealType
  currentRecipeName: string | null; main: RecipePickerState; categories: PickerCategory[]; picking: boolean; onPick: (r: PickerRecipe) => void
  side?: CompositionBundle; drink?: CompositionBundle; removingId: string | null; togglingId: string | null
  onRemove: (compId: string) => void; onCreateCustom: () => void
}) {
  const [section, setSection] = useState<SectionKey | null>('main')
  const toggle = (k: SectionKey) => setSection(s => (s === k ? null : k))
  const needMain = 'Choisis d’abord le plat principal'
  const summary = (b: CompositionBundle | undefined, none: string) => (b ? (b.chips.length ? b.chips.map(c => c.name).join(', ') : none) : needMain)

  return (
    <Sheet open={open} onClose={onClose} maxHeight="92%"
      footer={(
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Txt variant="meta" style={{ flex: 1 }}>Tes choix sont enregistrés au fur et à mesure.</Txt>
          <Button label="Terminé" tone="foret" onPress={onClose} />
        </View>
      )}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <MealTile type={mealType} size={44} />
        <View style={{ flex: 1 }}>
          <Txt variant="h3">{title}</Txt>
          <Txt variant="small" style={{ marginTop: 2, fontSize: 14 }}>{subtitle}</Txt>
        </View>
        <Pressable onPress={onClose} accessibilityLabel="Fermer le panneau" hitSlop={6}
          style={{ width: 36, height: 36, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center' }}>
          <X size={20} color={C.texte2} />
        </Pressable>
      </View>
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 8, gap: 4 }} keyboardShouldPersistTaps="handled">
        <Section icon={ChefHat} title="Plat principal" summary={currentRecipeName ?? 'À choisir'} done={!!currentRecipeName}
          open={section === 'main'} onToggle={() => toggle('main')}>
          <SearchBox value={main.search} onChange={main.setSearch} placeholder="Rechercher une recette…" />
          <Filters picker={main} categories={categories} />
          <View style={{ borderRadius: R.lg, backgroundColor: '#FFFFFF', padding: 6 }}>
            {main.loading ? <ActivityIndicator style={{ paddingVertical: 28 }} color={C.foret} />
              : main.recipes.length === 0 ? <Txt variant="small" style={{ textAlign: 'center', paddingVertical: 28 }}>{main.search ? 'Aucune recette trouvée' : 'Aucune recette disponible'}</Txt>
              : main.recipes.slice(0, 60).map(r => {
                const current = r.name === currentRecipeName
                return (
                  <Pressable key={r.id} disabled={picking} onPress={() => { onPick(r); setSection('side') }} accessibilityRole="button" accessibilityState={{ selected: current }}
                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, paddingVertical: 8, borderRadius: R.md, backgroundColor: current ? C.foret50 : pressed ? C.creme : 'transparent', opacity: picking ? 0.5 : 1 })}>
                    <Thumb uri={r.photo_url} size={44} />
                    <View style={{ flex: 1 }}>
                      <Txt numberOfLines={1} variant="smallBold" style={{ fontSize: 14 }}>{r.name}</Txt>
                      <View style={{ marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {!!r.prep_time_min && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <Clock size={11} color={C.texte2} /><Txt variant="meta">{r.prep_time_min} min</Txt>
                          </View>
                        )}
                        {!!VISIBILITY_TAG[r.visibility] && <Txt variant="meta">{VISIBILITY_TAG[r.visibility]}</Txt>}
                      </View>
                    </View>
                    {current && <Check size={16} color={C.foret500} />}
                  </Pressable>
                )
              })}
          </View>
        </Section>

        <Section icon={Salad} title="Accompagnements" summary={summary(side, 'Aucun pour l’instant')} done={!!side?.chips.length}
          disabled={!side} open={section === 'side'} onToggle={() => toggle('side')}>
          {side && <CompositionList picker={side.picker} categories={side.categories} chips={side.chips} removingId={removingId} togglingId={togglingId} onRemove={onRemove} onToggle={side.onToggle} />}
        </Section>

        <Section icon={CupSoda} title="Boissons maison" summary={summary(drink, 'Aucune pour l’instant')} done={!!drink?.chips.length}
          disabled={!drink} open={section === 'drink'} onToggle={() => toggle('drink')}>
          {drink && <CompositionList picker={drink.picker} categories={drink.categories} chips={drink.chips} removingId={removingId} togglingId={togglingId} onRemove={onRemove} onToggle={drink.onToggle} />}
        </Section>

        <Pressable onPress={onCreateCustom} accessibilityRole="button"
          style={{ marginHorizontal: 4, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: R.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.foret300 }}>
          <View style={{ width: 36, height: 36, borderRadius: R.pill, backgroundColor: C.foret50, alignItems: 'center', justifyContent: 'center' }}>
            <PenLine size={16} color={C.foret} />
          </View>
          <View>
            <Txt variant="smallBold" color={C.foret} style={{ fontSize: 14 }}>Créer une nouvelle recette</Txt>
            <Txt variant="meta">Elle prendra directement sa place ici</Txt>
          </View>
        </Pressable>
      </ScrollView>
    </Sheet>
  )
}
