'use client'

import { CalendarPlus, Clock, Globe, Heart, PenLine, Users, type LucideIcon } from 'lucide-react'
import { categoryColor, categoryIcon, categoryInk } from '@/lib/constants/category-icon'
import { DifficultyMeter } from './difficulty'
import { formatDuration, type RecipeListItem } from './types'

interface RecipeCardProps {
  recipe:           RecipeListItem
  variant:          'mobile' | 'grid' | 'list'
  onOpen:           () => void
  onPlan?:          () => void
  onToggleFavorite: () => void
}

const ORIGIN_TAG: Record<RecipeListItem['origin'], { label: string; icon: LucideIcon }> = {
  mes:        { label: 'Ma recette', icon: PenLine },
  famille:    { label: 'Famille',    icon: Users },
  communaute: { label: 'Communauté', icon: Globe },
}

// Photo, ou à défaut un aplat teinté de la couleur de la catégorie avec son
// pictogramme : la grille reste colorée même sans photos.
export function RecipeVisual({ recipe, className, iconClassName = 'h-10 w-10' }: {
  recipe: Pick<RecipeListItem, 'name' | 'photo_url' | 'categories'>; className: string; iconClassName?: string
}) {
  const Icon  = categoryIcon(recipe.categories?.slug)
  const color = categoryColor(recipe.categories?.color)
  return (
    <div className={`relative overflow-hidden ${className}`} style={recipe.photo_url ? undefined : { backgroundColor: `${color}1A` }}>
      {recipe.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={recipe.photo_url} alt={recipe.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className={iconClassName} style={{ color, opacity: 0.55 }} aria-hidden="true" />
        </div>
      )}
    </div>
  )
}

function FavoriteButton({ recipe, onToggle }: { recipe: RecipeListItem; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onToggle() }}
      aria-label={recipe.is_favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      aria-pressed={recipe.is_favorited}
      className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm transition-transform active:scale-90"
    >
      <Heart className={`h-4 w-4 ${recipe.is_favorited ? 'fill-[var(--kkb-orange)] text-[var(--kkb-orange)]' : 'text-[var(--kkb-foret)]'}`} />
    </button>
  )
}

// Remplace une note étoilée (aucun système d'avis) : nombre de membres de la
// table qui ont mis la recette en favori.
function FoyerFavorites({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-quicksand font-bold text-[var(--kkb-foret)] backdrop-blur-sm">
      <Heart className="h-3 w-3 fill-[var(--kkb-orange)] text-[var(--kkb-orange)]" /> <span className="tabular-nums">{count}</span>
      <span className="sr-only">favori(s) à la table</span>
    </span>
  )
}

function OriginTag({ origin }: { origin: RecipeListItem['origin'] }) {
  const { label, icon: Icon } = ORIGIN_TAG[origin]
  return (
    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 font-quicksand text-[11px] font-bold text-[var(--kkb-foret)] backdrop-blur-sm">
      <Icon className="h-3 w-3" /> {label}
    </span>
  )
}

// Puces : catégorie (teinte de la catégorie) et durée.
function Chips({ recipe }: { recipe: RecipeListItem }) {
  const time  = formatDuration(recipe.total_time_min)
  const color = categoryColor(recipe.categories?.color)
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      {recipe.categories && (
        <span className="max-w-full truncate rounded-full px-2 py-0.5 font-quicksand text-[11px] font-bold" style={{ backgroundColor: `${color}1A`, color: categoryInk(recipe.categories.color) }}>
          {recipe.categories.name}
        </span>
      )}
      {time && (
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--kkb-creme)] px-2 py-0.5 font-quicksand text-[11px] font-semibold tabular-nums text-[var(--kkb-texte-2)]">
          <Clock className="h-3 w-3" /> {time}
        </span>
      )}
    </div>
  )
}

function PlanButton({ onPlan }: { onPlan: () => void }) {
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onPlan() }}
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[var(--kkb-foret-50)] px-3 font-quicksand text-xs font-bold text-[var(--kkb-foret)] transition-colors hover:bg-[var(--kkb-foret)] hover:text-[var(--kkb-creme)]"
    >
      <CalendarPlus className="h-3.5 w-3.5" /> Planifier
    </button>
  )
}

export function RecipeCard({ recipe, variant, onOpen, onPlan, onToggleFavorite }: RecipeCardProps) {
  const open = {
    role: 'link' as const,
    tabIndex: 0,
    onClick: onOpen,
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter') onOpen() },
    'aria-label': recipe.name,
  }

  if (variant === 'list') {
    return (
      <article {...open} className="group flex cursor-pointer items-center gap-4 rounded-[var(--kkb-r-xl)] bg-white p-2.5 pr-4 outline-none transition-shadow hover:shadow-[0_10px_24px_rgba(31,58,46,0.08)] focus-visible:ring-2 focus-visible:ring-[var(--kkb-foret-300)]">
        <div className="relative shrink-0">
          <RecipeVisual recipe={recipe} className="h-[96px] w-[128px] rounded-[var(--kkb-r-lg)]" iconClassName="h-8 w-8" />
          <FoyerFavorites count={recipe.foyer_favorites} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="line-clamp-1 text-h3 text-[var(--kkb-profond)]">{recipe.name}</p>
          {recipe.description && <p className="line-clamp-1 font-quicksand text-[13px] text-[var(--kkb-texte-2)]">{recipe.description}</p>}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Chips recipe={recipe} />
            <DifficultyMeter value={recipe.difficulty} />
          </div>
        </div>
        <div className="relative h-9 w-9 shrink-0">
          <FavoriteButton recipe={recipe} onToggle={onToggleFavorite} />
        </div>
        {onPlan && <PlanButton onPlan={onPlan} />}
      </article>
    )
  }

  const mobile = variant === 'mobile'

  return (
    <article {...open} className="group flex cursor-pointer flex-col rounded-[var(--kkb-r-xl)] bg-white p-1.5 outline-none transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(31,58,46,0.10)] focus-visible:ring-2 focus-visible:ring-[var(--kkb-foret-300)] active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className="relative">
        <RecipeVisual recipe={recipe} className={`w-full rounded-[var(--kkb-r-lg)] ${mobile ? 'aspect-square' : 'aspect-[4/3]'}`} />
        {!mobile && <OriginTag origin={recipe.origin} />}
        <FavoriteButton recipe={recipe} onToggle={onToggleFavorite} />
        <FoyerFavorites count={recipe.foyer_favorites} />
      </div>
      <div className={`flex flex-1 flex-col gap-2 ${mobile ? 'px-1.5 pb-1.5 pt-2' : 'p-3'}`}>
        <p className={`line-clamp-2 font-dosis font-bold leading-tight text-[var(--kkb-profond)] ${mobile ? 'min-h-[40px] text-[15px]' : 'text-[17px]'}`}>{recipe.name}</p>
        {!mobile && (
          <p className="line-clamp-2 min-h-[2.6em] font-quicksand text-[13px] leading-[1.3] text-[var(--kkb-texte-2)]">{recipe.description ?? ''}</p>
        )}
        <Chips recipe={recipe} />
        {!mobile && (
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-dashed border-[var(--kkb-filet)] pt-2.5">
            {recipe.difficulty ? <DifficultyMeter value={recipe.difficulty} /> : <span />}
            {onPlan && <PlanButton onPlan={onPlan} />}
          </div>
        )}
      </div>
    </article>
  )
}
