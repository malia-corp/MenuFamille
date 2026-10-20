import { useEffect, useRef, useState } from 'react'
import { Alert, Animated, Pressable, ScrollView, Share, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { ArrowLeft, CalendarPlus, Check, ChefHat, Clock, CupSoda, Flame, Heart, Minus, MoreHorizontal, Pencil, Plus, Printer, Quote, Salad, Share2, Trash2, Users } from 'lucide-react-native'
import { Bone, Button, IconButton, Segmented, Sheet, Txt } from '@/components/ui'
import { CategoryChip, DIFFICULTY_LABEL, RecipeVisual, formatDuration, type Difficulty, type RecipeCategory } from '@/components/recipes/RecipeBits'
import { AddToMenuSheet } from '@/components/recipes/AddToMenuSheet'
import { get, request } from '@/lib/api'
import { WEB_URL } from '@/lib/env'
import { toast } from '@/lib/toast'
import { printRecipe } from '@/lib/print'
import { C, F, R, SHADOW } from '@/theme'

interface Ingredient { id: string; name: string; quantity: number | null; unit: string | null; sort_order: number }
interface Step { id: string; step_number: number; description: string }
interface Recipe {
  id: string; name: string; description: string | null; prep_time_min: number | null; cook_time_min: number | null
  servings: number; difficulty: Difficulty | null; photo_url: string | null; visibility: 'private' | 'circle' | 'community'
  is_owner: boolean; is_favorited: boolean; foyer_favorites: number; foyer_size: number
  categories: RecipeCategory | null; recipe_ingredients: Ingredient[]; recipe_steps: Step[]
}
interface Suggestion { id: string; name: string; description: string | null; role: 'side' | 'drink' }

const VISIBILITY_TAG: Record<Recipe['visibility'], string> = { private: 'Ma recette', circle: 'Recette de famille', community: 'Recette de la communauté' }

// Quantité recalculée pour le nombre de portions choisi.
function scaleQuantity(qty: number | null, servings: number, base: number): string {
  if (!qty) return ''
  const rounded = Math.round(qty * (servings / Math.max(1, base)) * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace('.', ',')
}

// Fiche recette (cf. app/(app)/recipes/[id]/page.tsx, vue mobile).
export default function RecipeDetailScreen() {
  const { id, plan } = useLocalSearchParams<{ id: string; plan?: string }>()
  const insets = useSafeAreaInsets()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [servings, setServings] = useState(4)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [stepsDone, setStepsDone] = useState<Set<string>>(new Set())
  const [menuOpen, setMenuOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [tab, setTab] = useState<'ingredients' | 'steps'>('ingredients')
  const pop = useRef(new Animated.Value(1)).current

  useEffect(() => {
    void request<Recipe & { error?: string }>(`/api/recipes/${id}`).then(res => {
      if (!res.ok || !res.data) { setError(res.data?.error ?? 'Recette introuvable'); return }
      setRecipe(res.data)
      setServings(res.data.servings)
      if (plan === '1') setAddOpen(true)
    }).catch(() => setError('Impossible de charger la recette'))
    const fetchRole = (role: 'side' | 'drink') =>
      get<Omit<Suggestion, 'role'>[]>(`/api/recipes/${id}/suggestions?role=${role}&limit=3`).then(l => (Array.isArray(l) ? l.map(s => ({ ...s, role })) : []))
    void Promise.all([fetchRole('side'), fetchRole('drink')]).then(([s, d]) => setSuggestions([...s, ...d.slice(0, 1)]))
  }, [id, plan])

  async function toggleFavorite() {
    Animated.sequence([
      Animated.timing(pop, { toValue: 1.35, duration: 120, useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, bounciness: 14 }),
    ]).start()
    const res = await request<{ is_favorited: boolean }>(`/api/recipes/${id}/favorite`, { method: 'POST' }).catch(() => null)
    if (!res?.ok || !res.data) { toast.error('Erreur de connexion'); return }
    const fav = res.data.is_favorited
    if (fav) toast.success('Recette ajoutée aux favoris'); else toast.info('Recette retirée des favoris')
    setRecipe(p => p && { ...p, is_favorited: fav, foyer_favorites: Math.max(0, p.foyer_favorites + (fav === p.is_favorited ? 0 : fav ? 1 : -1)) })
  }

  function confirmDelete() {
    setMenuOpen(false)
    Alert.alert('Supprimer cette recette ?', 'Cette action est irréversible. La recette sera définitivement supprimée.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          const res = await request(`/api/recipes/${id}`, { method: 'DELETE' }).catch(() => null)
          if (res && (res.ok || res.status === 204)) { toast.success('Recette supprimée'); router.back() }
          else toast.error('Suppression impossible')
        },
      },
    ])
  }

  async function share() {
    if (!recipe) return
    setMenuOpen(false)
    const url = `${WEB_URL}/recipes/${recipe.id}`
    await Share.share({ title: `${recipe.name} — KeskonBouf`, message: `Découvre la recette « ${recipe.name} » sur KeskonBouf\n${url}`, url }).catch(() => {})
  }

  const toggle = (set: Set<string>, key: string) => { const n = new Set(set); if (n.has(key)) n.delete(key); else n.add(key); return n }

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: C.creme }}>
        <Txt variant="small" color={C.danger} style={{ textAlign: 'center' }}>{error}</Txt>
        <Button label="Retour au carnet" tone="link" onPress={() => (router.canGoBack() ? router.back() : router.navigate('/recipes'))} />
      </View>
    )
  }
  if (!recipe) {
    return (
      <View style={{ flex: 1, backgroundColor: C.creme }}>
        <Bone style={{ height: 300, borderRadius: 0 }} />
        <View style={{ padding: 20, gap: 12 }}>
          <Bone style={{ height: 32, width: '80%' }} /><Bone style={{ height: 80, borderRadius: R.xl }} /><Bone style={{ height: 220, borderRadius: R.xl }} />
        </View>
      </View>
    )
  }

  const totalTime = (recipe.prep_time_min ?? 0) + (recipe.cook_time_min ?? 0)
  const ings = recipe.recipe_ingredients
  const allChecked = ings.length > 0 && checked.size === ings.length
  const doneCount = ings.filter(i => checked.has(i.id)).length
  const qtyOf = (ing: Ingredient) => [scaleQuantity(ing.quantity, servings, recipe.servings), ing.unit].filter(Boolean).join(' ') || 'Q.S.'
  const current = recipe.recipe_steps.find(s => !stepsDone.has(s.id))?.id
  const hasContent = ings.length > 0 || recipe.recipe_steps.length > 0

  return (
    <View style={{ flex: 1, backgroundColor: C.creme }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}>
        <View>
          <RecipeVisual recipe={recipe} style={{ height: 300 + insets.top, width: '100%' }} iconSize={64} />
          <IconButton icon={ArrowLeft} label="Retour au carnet" tone="white" size={44} onPress={() => (router.canGoBack() ? router.back() : router.navigate('/recipes'))}
            style={{ position: 'absolute', left: 16, top: insets.top + 12 }} />
          <IconButton icon={MoreHorizontal} label="Options de la recette" tone="white" size={44} onPress={() => setMenuOpen(true)}
            style={{ position: 'absolute', right: 16, top: insets.top + 12 }} />
        </View>

        {/* Feuille de la recette, posée sur la photo */}
        <View style={{ marginTop: -32, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: C.creme, paddingHorizontal: 16, paddingTop: 12, gap: 24 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.filet }} />
          <View style={{ paddingHorizontal: 4, gap: 10 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {recipe.categories && <CategoryChip category={recipe.categories} />}
              <View style={{ borderRadius: R.pill, backgroundColor: C.foret50, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.foret }}>{VISIBILITY_TAG[recipe.visibility]}</Txt>
              </View>
            </View>
            {/* Nom de la recette : l'accent Bricolage de l'écran */}
            <Txt variant="signature" style={{ fontSize: 28, lineHeight: 31 }}>{recipe.name}</Txt>
            {!!recipe.description && (
              <View style={{ flexDirection: 'row', gap: 8, paddingTop: 2 }}>
                <Quote size={16} color={C.jaune700} style={{ marginTop: 3 }} />
                <Txt style={{ flex: 1, fontSize: 15, lineHeight: 23, color: C.texte2 }}>{recipe.description}</Txt>
              </View>
            )}
            {recipe.foyer_favorites > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Heart size={16} color={C.orange} fill={C.orange} />
                <Txt variant="small" style={{ fontSize: 14 }}>
                  <Txt variant="smallBold" style={{ fontSize: 14 }}>{recipe.foyer_favorites}</Txt>
                  {recipe.foyer_size > 0 ? ` sur ${recipe.foyer_size}` : ''} à la table l’adore{recipe.foyer_favorites > 1 ? 'nt' : ''}
                </Txt>
              </View>
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: 8, borderRadius: R.xl, backgroundColor: '#FFFFFF', padding: 8 }}>
            {[
              { icon: Clock, label: 'Préparation', value: formatDuration(recipe.prep_time_min) ?? '—' },
              { icon: Flame, label: 'Cuisson', value: formatDuration(recipe.cook_time_min) ?? '—' },
              { icon: Users, label: 'Portions', value: String(recipe.servings) },
              { icon: ChefHat, label: 'Niveau', value: recipe.difficulty ? DIFFICULTY_LABEL[recipe.difficulty] : '—' },
            ].map(m => (
              <View key={m.label} style={{ flex: 1, alignItems: 'center', gap: 4, borderRadius: R.lg, backgroundColor: C.creme, paddingHorizontal: 2, paddingVertical: 12 }}>
                <m.icon size={16} color={C.foret500} />
                <Txt numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: F.title, fontSize: 14, color: C.profond }}>{m.value}</Txt>
                <Txt style={{ fontSize: 11, color: C.texte2 }}>{m.label}</Txt>
              </View>
            ))}
          </View>

          {hasContent && (
            <View style={{ gap: 16 }}>
              <Segmented<'ingredients' | 'steps'> value={tab} onChange={setTab}
                options={[{ value: 'ingredients', label: `Ingrédients ${ings.length}` }, { value: 'steps', label: `Préparation ${recipe.recipe_steps.length}` }]} />
              <View style={{ borderRadius: R.xl, backgroundColor: '#FFFFFF', padding: 16, gap: 12 }}>
                {tab === 'ingredients' ? (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <Txt variant="small" style={{ flex: 1, fontSize: 14 }}>
                        {allChecked ? 'Tout est prêt, au fourneau !' : <><Txt variant="smallBold" style={{ fontSize: 14 }}>{doneCount}</Txt> sur {ings.length} sous la main</>}
                      </Txt>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: R.pill, backgroundColor: C.creme, padding: 4 }}>
                        <Pressable onPress={() => setServings(v => Math.max(1, v - 1))} disabled={servings <= 1} accessibilityLabel="Moins de portions"
                          style={{ width: 36, height: 36, borderRadius: R.pill, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', opacity: servings <= 1 ? 0.4 : 1 }}>
                          <Minus size={14} color={C.foret} />
                        </Pressable>
                        <Txt style={{ fontFamily: F.title, fontSize: 17, color: C.foret }}>{servings}<Txt style={{ fontFamily: F.title, fontSize: 13, color: C.foret }}> pers.</Txt></Txt>
                        <Pressable onPress={() => setServings(v => v + 1)} accessibilityLabel="Plus de portions"
                          style={{ width: 36, height: 36, borderRadius: R.pill, backgroundColor: C.foret, alignItems: 'center', justifyContent: 'center' }}>
                          <Plus size={14} color={C.creme} />
                        </Pressable>
                      </View>
                    </View>
                    <View style={{ height: 6, borderRadius: R.pill, backgroundColor: C.lin, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${(doneCount / Math.max(1, ings.length)) * 100}%`, backgroundColor: C.sauge, borderRadius: R.pill }} />
                    </View>
                    <View style={{ gap: 8 }}>
                      {ings.map(ing => {
                        const done = checked.has(ing.id)
                        return (
                          <Pressable key={ing.id} onPress={() => setChecked(s => toggle(s, ing.id))} accessibilityRole="checkbox" accessibilityState={{ checked: done }}
                            style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: R.md, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: done ? C.sauge50 : C.creme }}>
                            <View style={{ width: 24, height: 24, borderRadius: R.pill, borderWidth: 2, borderColor: done ? C.foret500 : C.filet, backgroundColor: done ? C.foret500 : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                              {done && <Check size={14} color="#FFFFFF" />}
                            </View>
                            <Txt style={{ flex: 1, fontSize: 15, color: done ? C.texte2 : C.profond, textDecorationLine: done ? 'line-through' : 'none' }}>{ing.name}</Txt>
                            <Txt style={{ fontFamily: F.title, fontSize: 15, color: C.foret }}>{qtyOf(ing)}</Txt>
                          </Pressable>
                        )
                      })}
                    </View>
                    {ings.length > 1 && (
                      <Pressable onPress={() => setChecked(allChecked ? new Set() : new Set(ings.map(i => i.id)))} hitSlop={8}>
                        <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.foret }}>{allChecked ? 'Tout décocher' : 'Tout cocher'}</Txt>
                      </Pressable>
                    )}
                  </>
                ) : (
                  <View>
                    <Txt variant="small" style={{ marginBottom: 12 }}>
                      {recipe.recipe_steps.length} étape{recipe.recipe_steps.length > 1 ? 's' : ''}{totalTime ? ` · ${formatDuration(totalTime)}` : ''}
                    </Txt>
                    {recipe.recipe_steps.map((step, i) => {
                      const done = stepsDone.has(step.id)
                      const now = step.id === current
                      const last = i === recipe.recipe_steps.length - 1
                      return (
                        <View key={step.id} style={{ flexDirection: 'row', gap: 12, paddingBottom: last ? 0 : 12 }}>
                          <View style={{ alignItems: 'center' }}>
                            <Pressable onPress={() => setStepsDone(s => toggle(s, step.id))} accessibilityRole="checkbox" accessibilityState={{ checked: done }}
                              accessibilityLabel={`Étape ${step.step_number}${done ? ' faite' : ''}`}
                              style={{ width: 40, height: 40, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? C.sauge : now ? C.foret : C.creme }}>
                              {done ? <Check size={20} color={C.profond} /> : <Txt style={{ fontFamily: F.title, fontSize: 16, color: now ? C.creme : C.foret }}>{step.step_number}</Txt>}
                            </Pressable>
                            {!last && <View style={{ flex: 1, width: 1, marginTop: 4, backgroundColor: done ? C.sauge : C.filet }} />}
                          </View>
                          <View style={{ flex: 1, borderRadius: R.lg, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: now ? C.foret50 : 'transparent' }}>
                            {now && <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.foret500 }}>En cours</Txt>}
                            <Txt style={{ fontSize: 15, lineHeight: 23, color: done ? C.texte2 : C.profond }}>{step.description}</Txt>
                          </View>
                        </View>
                      )
                    })}
                  </View>
                )}
              </View>
            </View>
          )}

          {suggestions.length > 0 && (
            <View style={{ gap: 12 }}>
              <Txt variant="h3">Pour l’accompagner</Txt>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
                {suggestions.map(s => {
                  const Icon = s.role === 'drink' ? CupSoda : Salad
                  return (
                    <Pressable key={`${s.role}-${s.id}`} onPress={() => router.push(`/recipes/${s.id}`)} accessibilityRole="link"
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: R.lg, backgroundColor: '#FFFFFF', padding: 8, paddingRight: 16, maxWidth: 260 }}>
                      <View style={{ width: 44, height: 44, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', backgroundColor: s.role === 'drink' ? C.sauge50 : C.jaune50 }}>
                        <Icon size={20} color={s.role === 'drink' ? C.foret500 : C.jauneText} />
                      </View>
                      <View style={{ flexShrink: 1 }}>
                        <Txt numberOfLines={1} variant="smallBold" style={{ fontSize: 14 }}>{s.name}</Txt>
                        <Txt variant="meta">{s.role === 'drink' ? 'Boisson' : 'Accompagnement'}</Txt>
                      </View>
                    </Pressable>
                  )
                })}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Barre d'action flottante */}
      <View style={[{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 16, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: R.pill, backgroundColor: '#FFFFFF', padding: 6 }, SHADOW.sheet]}>
        <Pressable onPress={() => void toggleFavorite()} accessibilityRole="button" accessibilityState={{ selected: recipe.is_favorited }}
          accessibilityLabel={recipe.is_favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          style={{ width: 48, height: 48, borderRadius: R.pill, backgroundColor: recipe.is_favorited ? C.orange50 : C.creme, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ transform: [{ scale: pop }] }}>
            <Heart size={20} color={recipe.is_favorited ? C.orange : C.foret} fill={recipe.is_favorited ? C.orange : 'none'} />
          </Animated.View>
        </Pressable>
        <Button label="Ajouter au menu" icon={CalendarPlus} tone="orange" size="lg" onPress={() => setAddOpen(true)} flex />
      </View>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Options de la recette">
        <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
          {recipe.is_owner && <MenuRow icon={Pencil} label="Modifier" onPress={() => { setMenuOpen(false); router.push(`/recipes/${recipe.id}/edit`) }} />}
          {recipe.visibility !== 'private' && <MenuRow icon={Share2} label="Partager" onPress={() => void share()} />}
          <MenuRow icon={Printer} label="Imprimer la fiche" onPress={() => {
            setMenuOpen(false)
            void printRecipe({
              name: recipe.name, categoryName: recipe.categories?.name ?? null, difficulty: recipe.difficulty, prepTime: recipe.prep_time_min,
              cookTime: recipe.cook_time_min, servings, photoUrl: recipe.photo_url, description: recipe.description,
              ingredients: ings.map(i => ({ id: i.id, name: i.name, qty: qtyOf(i) })), steps: recipe.recipe_steps,
              sides: suggestions.filter(x => x.role === 'side').map(x => x.name), drinks: suggestions.filter(x => x.role === 'drink').map(x => x.name),
            }).catch(() => toast.error('Impression impossible'))
          }} />
          {recipe.is_owner && <MenuRow icon={Trash2} label="Supprimer" danger onPress={confirmDelete} />}
        </View>
      </Sheet>

      <AddToMenuSheet recipeId={recipe.id} open={addOpen} onClose={() => setAddOpen(false)} />
    </View>
  )
}

function MenuRow({ icon: Icon, label, onPress, danger }: { icon: typeof Pencil; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      style={({ pressed }) => ({ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, borderRadius: R.md, backgroundColor: pressed ? (danger ? C.dangerLight : '#FFFFFF') : 'transparent' })}>
      <Icon size={18} color={danger ? C.danger : C.foret} />
      <Txt variant="bodySemi" color={danger ? C.danger : C.profond}>{label}</Txt>
    </Pressable>
  )
}
