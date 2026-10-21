import { Image, Pressable, View, type StyleProp, type ViewStyle } from 'react-native'
import { ChefHat, Clock, Heart } from 'lucide-react-native'
import { Txt } from '@/components/ui'
import { categoryColor, categoryIcon, categoryInk, categoryTint } from '@/shared/category-icon'
import { C, F, R } from '@/theme'

export interface RecipeCategory { id: string; name: string; slug: string; icon: string | null; color: string | null }

export interface RecipeListItem {
  id: string; name: string; description: string | null
  prep_time_min: number | null; cook_time_min: number | null; servings: number
  difficulty: Difficulty | null; photo_url: string | null; visibility: string
  is_favorited: boolean; foyer_favorites: number; total_time_min: number | null
  origin: 'mes' | 'famille' | 'communaute'; categories: RecipeCategory | null
}

export type RecipeOrigin = 'all' | 'famille' | 'communaute' | 'mes' | 'favoris'
export type RecipeSort = 'recent' | 'planned' | 'fastest' | 'alpha'
export interface RecipePage { items: RecipeListItem[]; total: number; page: number; page_size: number; page_count: number; counts: Record<RecipeOrigin, number> }

export type Difficulty = 'facile' | 'moyen' | 'difficile'
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { facile: 'Facile', moyen: 'Moyen', difficile: 'Difficile' }
const LEVEL: Record<Difficulty, number> = { facile: 1, moyen: 2, difficile: 3 }

export function formatDuration(min: number | null | undefined): string | null {
  if (!min) return null
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

// Niveau en toques : une, deux ou trois toques pleines sur trois.
export function DifficultyMeter({ value, withLabel = true, color = C.foret500, off = C.filet, labelColor = C.texte2 }: {
  value: Difficulty | null; withLabel?: boolean; color?: string; off?: string; labelColor?: string
}) {
  if (!value) return null
  const level = LEVEL[value]
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} accessibilityLabel={`Difficulté : ${DIFFICULTY_LABEL[value]}`}>
      <View style={{ flexDirection: 'row' }}>
        {[1, 2, 3].map(i => <ChefHat key={i} size={14} color={i <= level ? color : off} />)}
      </View>
      {withLabel && <Txt style={{ fontFamily: F.bodySemi, fontSize: 12, color: labelColor }}>{DIFFICULTY_LABEL[value]}</Txt>}
    </View>
  )
}

// Photo, ou aplat teinté de la couleur de la catégorie avec son pictogramme.
export function RecipeVisual({ recipe, style, iconSize = 40 }: {
  recipe: { name: string; photo_url: string | null; categories: { slug?: string | null; color?: string | null } | null }
  style?: StyleProp<ViewStyle>; iconSize?: number
}) {
  const Icon = categoryIcon(recipe.categories?.slug)
  const color = categoryColor(recipe.categories?.color)
  return (
    <View style={[{ overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: recipe.photo_url ? C.lin : categoryTint(recipe.categories?.color) }, style]}>
      {recipe.photo_url
        ? <Image source={{ uri: recipe.photo_url }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} resizeMode="cover" accessibilityLabel={recipe.name} />
        : <Icon size={iconSize} color={color} style={{ opacity: 0.55 }} />}
    </View>
  )
}

export function CategoryChip({ category }: { category: { name: string; color: string | null } }) {
  return (
    <View style={{ alignSelf: 'flex-start', borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: categoryTint(category.color) }}>
      <Txt numberOfLines={1} style={{ fontFamily: F.bodyBold, fontSize: 11, color: categoryInk(category.color) }}>{category.name}</Txt>
    </View>
  )
}

// Carte de la grille mobile (cf. components/recipes/recipe-card.tsx, variante mobile).
export function RecipeCard({ recipe, onOpen, onToggleFavorite }: { recipe: RecipeListItem; onOpen: () => void; onToggleFavorite: () => void }) {
  const time = formatDuration(recipe.total_time_min)
  return (
    <Pressable onPress={onOpen} accessibilityRole="link" accessibilityLabel={recipe.name}
      style={({ pressed }) => ({ flex: 1, borderRadius: R.xl, backgroundColor: '#FFFFFF', padding: 6, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <View>
        <RecipeVisual recipe={recipe} style={{ width: '100%', aspectRatio: 1, borderRadius: R.lg }} />
        <Pressable onPress={onToggleFavorite} hitSlop={4} accessibilityRole="button" accessibilityState={{ selected: recipe.is_favorited }}
          accessibilityLabel={recipe.is_favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          style={{ position: 'absolute', right: 8, top: 8, width: 36, height: 36, borderRadius: R.pill, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' }}>
          <Heart size={16} color={recipe.is_favorited ? C.orange : C.foret} fill={recipe.is_favorited ? C.orange : 'none'} />
        </Pressable>
        {recipe.foyer_favorites > 0 && (
          <View accessibilityLabel={`${recipe.foyer_favorites} favori(s) à la table`}
            style={{ position: 'absolute', left: 8, bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: R.pill, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 8, paddingVertical: 2 }}>
            <Heart size={12} color={C.orange} fill={C.orange} />
            <Txt style={{ fontFamily: F.bodyBold, fontSize: 11, color: C.foret }}>{recipe.foyer_favorites}</Txt>
          </View>
        )}
      </View>
      <View style={{ paddingHorizontal: 6, paddingBottom: 6, paddingTop: 8, gap: 8 }}>
        <Txt numberOfLines={2} style={{ minHeight: 40, fontFamily: F.titleBold, fontSize: 15, lineHeight: 19, color: C.profond }}>{recipe.name}</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {recipe.categories && <CategoryChip category={recipe.categories} />}
          {time && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: R.pill, backgroundColor: C.creme, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Clock size={11} color={C.texte2} />
              <Txt style={{ fontFamily: F.bodySemi, fontSize: 11, color: C.texte2 }}>{time}</Txt>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  )
}
