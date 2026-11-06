import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useFocusEffect } from 'expo-router'
import { BookOpen, Check, Globe, Heart, Link2, PenLine, Plus, Search, SlidersHorizontal, Timer, Users, WifiOff, type LucideIcon } from 'lucide-react-native'
import { Bone, Button, EmptyState, Screen, TAB_BAR_SPACE, Txt } from '@/components/ui'
import { RecipeCard, type RecipeCategory, type RecipeListItem, type RecipeOrigin, type RecipePage, type RecipeSort } from '@/components/recipes/RecipeBits'
import { get, request } from '@/lib/api'
import { toast } from '@/lib/toast'
import { categoryIcon } from '@/shared/category-icon'
import { C, F, R, SHADOW } from '@/theme'

const ORIGINS: { value: RecipeOrigin; label: string; icon: LucideIcon }[] = [
  { value: 'all', label: 'Tous', icon: BookOpen },
  { value: 'communaute', label: 'Communauté', icon: Globe },
  { value: 'famille', label: 'Famille', icon: Users },
  { value: 'mes', label: 'Mes créations', icon: PenLine },
  { value: 'favoris', label: 'Favoris', icon: Heart },
]

const SORTS: { value: RecipeSort; label: string }[] = [
  { value: 'recent', label: 'Plus récentes' },
  { value: 'planned', label: 'Plus planifiées' },
  { value: 'fastest', label: 'Plus rapides' },
  { value: 'alpha', label: 'Ordre alphabétique' },
]

const PAGE_SIZE = 10

function OptionChip({ label, active, onPress, icon: Icon }: { label: string; active: boolean; onPress: () => void; icon?: LucideIcon }) {
  const fg = active ? C.creme : C.texte2
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }}
      style={{ height: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, borderRadius: R.pill, backgroundColor: active ? C.foret : C.creme }}>
      {active && !Icon && <Check size={14} color={fg} />}
      {Icon && <Icon size={14} color={fg} />}
      <Txt style={{ fontFamily: F.bodyBold, fontSize: 13, color: fg }}>{label}</Txt>
    </Pressable>
  )
}

// Carnet de recettes (cf. app/(app)/recipes/page.tsx, vue mobile).
export default function RecipesScreen() {
  const insets = useSafeAreaInsets()
  const [categories, setCategories] = useState<RecipeCategory[]>([])
  const [origin, setOrigin] = useState<RecipeOrigin>('all')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [under30, setUnder30] = useState(false)
  const [sort, setSort] = useState<RecipeSort>('recent')
  const [showOptions, setShowOptions] = useState(false)
  const [data, setData] = useState<RecipePage | null>(null)
  const [items, setItems] = useState<RecipeListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  useEffect(() => { void get<RecipeCategory[]>('/api/categories').then(d => { if (Array.isArray(d)) setCategories(d) }) }, [])
  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 300); return () => clearTimeout(t) }, [search])

  const load = useCallback(async (page: number, append: boolean) => {
    const id = ++requestId.current
    if (append) setLoadingMore(true); else setLoading(true)
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE), scope: origin, sort })
    if (debounced) params.set('search', debounced)
    if (categoryIds.length) params.set('category_ids', categoryIds.join(','))
    if (under30) params.set('under30', '1')
    try {
      const res = await request<RecipePage & { error?: string }>(`/api/recipes?${params.toString()}`)
      if (id !== requestId.current) return
      if (!res.ok || !res.data) { setError(res.data?.error ?? 'Erreur de chargement'); return }
      const page_ = res.data
      setError(null)
      setData(page_)
      setItems(prev => (append ? [...prev, ...page_.items] : page_.items))
    } catch {
      if (id === requestId.current) { setError('Impossible de charger les recettes'); toast.error('Erreur de connexion') }
    } finally {
      if (id === requestId.current) { setLoading(false); setLoadingMore(false) }
    }
  }, [origin, sort, debounced, categoryIds, under30])

  useEffect(() => { void load(1, false) }, [load])
  // Retour d'une fiche (favori, suppression…) : la liste se met à jour.
  const loadRef = useRef(load)
  loadRef.current = load
  const seen = useRef(false)
  useFocusEffect(useCallback(() => {
    if (seen.current) void loadRef.current(1, false)
    seen.current = true
  }, []))

  async function toggleFavorite(recipe: RecipeListItem) {
    const res = await request<{ is_favorited: boolean }>(`/api/recipes/${recipe.id}/favorite`, { method: 'POST' }).catch(() => null)
    if (!res?.ok || !res.data) { toast.error('Erreur de connexion'); return }
    const fav = res.data.is_favorited
    if (fav) toast.success('Recette ajoutée aux favoris'); else toast.info('Recette retirée des favoris')
    setItems(prev => prev.map(r => (r.id === recipe.id ? { ...r, is_favorited: fav, foyer_favorites: Math.max(0, r.foyer_favorites + (fav ? 1 : -1)) } : r)))
  }

  const counts = data?.counts
  const totalAll = counts?.all ?? 0
  const filtersActive = origin !== 'all' || !!search.trim() || categoryIds.length > 0 || under30
  const resetFilters = () => { setOrigin('all'); setSearch(''); setCategoryIds([]); setUnder30(false) }
  const rows: RecipeListItem[][] = []
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2))

  return (
    <View style={{ flex: 1 }}>
      <Screen onRefresh={() => load(1, false)}>
        {/* Bandeau : recherche, filtres, origines */}
        <View style={{ backgroundColor: C.foret, borderRadius: R.xl, padding: 20 }}>
          <Txt style={{ fontFamily: F.bodySemi, fontSize: 14, color: C.foret100 }}>Carnet de recettes</Txt>
          <Txt variant="h1" color={C.creme} style={{ marginTop: 2 }}>Qu’est-ce qu’on cuisine ?</Txt>
          <Txt variant="small" color={C.foret100} style={{ marginTop: 4, fontSize: 14 }}>
            {counts
              ? <><Txt style={{ fontFamily: F.bodyBold, fontSize: 14, color: C.creme }}>{totalAll}</Txt> recette{totalAll > 1 ? 's' : ''} : les tiennes, celles de la famille et de la communauté.</>
              : 'Les tiennes, celles de la famille et de la communauté.'}
          </Txt>
          <View style={{ marginTop: 16, flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: R.pill, backgroundColor: '#FFFFFF', paddingHorizontal: 16 }}>
              <Search size={18} color={C.texte2} />
              <TextInput value={search} onChangeText={setSearch} placeholder="Un plat, un ingrédient…" placeholderTextColor={C.texte2}
                accessibilityLabel="Rechercher une recette" returnKeyType="search"
                style={{ flex: 1, fontFamily: F.body, fontSize: 15, color: C.profond, paddingVertical: 0 }} />
            </View>
            <Pressable onPress={() => setShowOptions(o => !o)} accessibilityRole="button" accessibilityLabel="Tri et filtres" accessibilityState={{ expanded: showOptions }}
              style={{ width: 48, height: 48, borderRadius: R.pill, backgroundColor: showOptions ? C.creme : C.white10, alignItems: 'center', justifyContent: 'center' }}>
              <SlidersHorizontal size={20} color={showOptions ? C.foret : C.creme} />
              {(under30 || sort !== 'recent') && <View style={{ position: 'absolute', right: 10, top: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: C.orange, borderWidth: 2, borderColor: C.foret }} />}
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16, marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            {ORIGINS.map(o => {
              const active = origin === o.value
              return (
                <Pressable key={o.value} onPress={() => setOrigin(o.value)} accessibilityRole="tab" accessibilityState={{ selected: active }}
                  style={{ height: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, borderRadius: R.pill, backgroundColor: active ? C.creme : C.white10 }}>
                  <o.icon size={16} color={active ? C.foret : C.creme} />
                  <Txt style={{ fontFamily: F.bodyBold, fontSize: 13, color: active ? C.foret : C.creme }}>{o.label}</Txt>
                  {counts && <Txt style={{ fontFamily: F.bodyBold, fontSize: 13, color: active ? C.foret500 : C.foret100 }}>{counts[o.value] ?? 0}</Txt>}
                </Pressable>
              )
            })}
          </ScrollView>
        </View>

        {showOptions && (
          <View style={{ borderRadius: R.xl, backgroundColor: '#FFFFFF', padding: 16, gap: 10 }}>
            <Txt variant="label">Trier par</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {SORTS.map(s => <OptionChip key={s.value} label={s.label} active={sort === s.value} onPress={() => setSort(s.value)} />)}
            </View>
            <Txt variant="label" style={{ paddingTop: 4 }}>Temps</Txt>
            <View style={{ flexDirection: 'row' }}>
              <OptionChip label="Moins de 30 min" icon={Timer} active={under30} onPress={() => setUnder30(v => !v)} />
            </View>
          </View>
        )}

        {categories.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {[{ id: '', name: 'Tout', slug: null as string | null }, ...categories].map(c => {
              const Icon = c.id ? categoryIcon(c.slug) : BookOpen
              const active = c.id ? categoryIds.length === 1 && categoryIds[0] === c.id : categoryIds.length === 0
              return (
                <Pressable key={c.id || 'tout'} onPress={() => setCategoryIds(!c.id || active ? [] : [c.id])} accessibilityRole="button" accessibilityState={{ selected: active }}
                  style={{ width: 76, alignItems: 'center', gap: 6, borderRadius: R.lg, paddingHorizontal: 4, paddingVertical: 12, backgroundColor: active ? C.sauge50 : '#FFFFFF' }}>
                  <View style={{ width: 40, height: 40, borderRadius: R.pill, backgroundColor: active ? C.foret : C.creme, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={20} color={active ? C.creme : C.foret} />
                  </View>
                  <Txt numberOfLines={2} style={{ textAlign: 'center', fontFamily: active ? F.bodyBold : F.bodySemi, fontSize: 11, lineHeight: 13, color: active ? C.foret : C.texte2 }}>{c.name}</Txt>
                </Pressable>
              )
            })}
          </ScrollView>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', opacity: loading ? 0 : 1 }}>
          <Txt variant="small" style={{ fontSize: 14 }}>
            <Txt variant="smallBold" style={{ fontSize: 14 }}>{data?.total ?? 0}</Txt> recette{(data?.total ?? 0) > 1 ? 's' : ''}
          </Txt>
          {filtersActive && (
            <Pressable onPress={resetFilters} hitSlop={8}>
              <Txt variant="small" style={{ fontSize: 14 }}> · <Txt variant="smallBold" color={C.foret} style={{ fontSize: 14 }}>Tout effacer</Txt></Txt>
            </Pressable>
          )}
        </View>

        {loading ? (
          <View style={{ gap: 12 }}>
            {[0, 1].map(i => (
              <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                <Bone style={{ flex: 1, height: 230, borderRadius: R.xl }} />
                <Bone style={{ flex: 1, height: 230, borderRadius: R.xl }} />
              </View>
            ))}
          </View>
        ) : error || items.length === 0 ? (
          <View style={{ borderRadius: R.xl, backgroundColor: '#FFFFFF' }}>
            {error ? (
              <EmptyState icon={WifiOff} title="Impossible de charger les recettes" description="Vérifie ta connexion puis réessaie."
                action={<Button label="Réessayer" tone="foret" onPress={() => void load(1, false)} />} />
            ) : filtersActive ? (
              <EmptyState icon={Search} title="Aucune recette trouvée" description="Essaie un autre mot-clé ou explore d’autres catégories."
                action={<Button label="Réinitialiser les filtres" tone="link" onPress={resetFilters} />} />
            ) : (
              <EmptyState icon={BookOpen} title="Ton carnet est vide pour l’instant" description="Ajoute ta première recette ou explore les plats de la communauté."
                action={<Button label="Ajouter une recette" icon={Plus} tone="foret" onPress={() => router.push('/recipes/add')} />} />
            )}
          </View>
        ) : (
          <>
            <View style={{ gap: 12 }}>
              {rows.map((row, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                  {row.map(r => (
                    <RecipeCard key={r.id} recipe={r} onOpen={() => router.push(`/recipes/${r.id}`)} onToggleFavorite={() => void toggleFavorite(r)} />
                  ))}
                  {row.length === 1 && <View style={{ flex: 1 }} />}
                </View>
              ))}
            </View>
            {data && data.page < data.page_count && (
              <Pressable disabled={loadingMore} onPress={() => void load(data.page + 1, true)} accessibilityRole="button"
                style={{ alignSelf: 'center', height: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, borderRadius: R.pill, backgroundColor: '#FFFFFF', opacity: loadingMore ? 0.6 : 1 }}>
                {loadingMore && <ActivityIndicator size="small" color={C.foret} />}
                <Txt variant="smallBold" color={C.foret} style={{ fontSize: 14 }}>Voir plus</Txt>
              </Pressable>
            )}
            <Pressable onPress={() => router.push({ pathname: '/recipes/add', params: { import: '1' } })} accessibilityRole="button"
              style={{ alignSelf: 'center', height: 44, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Link2 size={16} color={C.foret} />
              <Txt variant="smallBold" color={C.foret} style={{ fontSize: 14 }}>Importer depuis un lien</Txt>
            </Pressable>
          </>
        )}
      </Screen>

      {/* Ajout : la seule action orange de l'écran */}
      <Pressable onPress={() => router.push('/recipes/add')} accessibilityRole="button" accessibilityLabel="Ajouter une recette"
        style={({ pressed }) => [{ position: 'absolute', right: 20, bottom: TAB_BAR_SPACE + insets.bottom - 16, width: 56, height: 56, borderRadius: R.pill, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.95 : 1 }] }, SHADOW.fab]}>
        <Plus size={24} color="#FFFFFF" />
      </Pressable>
    </View>
  )
}
