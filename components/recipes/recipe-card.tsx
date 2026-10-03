'use client'

import { CalendarPlus, Clock, Eye, Heart, Users } from 'lucide-react'
import { categoryIcon } from '@/lib/constants/category-icon'
import { CategoryBadge } from './category-badge'
import { formatDuration, type RecipeListItem } from './types'

interface RecipeCardProps {
  recipe:           RecipeListItem
  variant:          'mobile' | 'grid' | 'list'
  onOpen:           () => void
  onPlan?:          () => void
  onToggleFavorite: () => void
}

function RecipeVisual({ recipe, className }: { recipe: RecipeListItem; className: string }) {
  const Icon = categoryIcon(recipe.categories?.slug)
  return (
    <div className={`relative overflow-hidden bg-[linear-gradient(135deg,var(--kkb-coral),var(--kkb-coral-hover))] ${className}`}>
      {recipe.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={recipe.photo_url} alt={recipe.name} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="h-12 w-12 text-white/90" aria-hidden="true" />
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
      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm transition-transform active:scale-90"
    >
      <Heart className={`h-4 w-4 ${recipe.is_favorited ? 'fill-[var(--kkb-coral)] text-[var(--kkb-coral)]' : 'text-[var(--kkb-text-secondary)]'}`} />
    </button>
  )
}

// Remplace la note étoilée de la maquette (aucun système d'avis) : nombre de
// membres du foyer qui ont mis la recette en favori.
function FoyerFavorites({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-[var(--kkb-radius-pill)] bg-black/55 px-2 py-0.5 text-[11px] font-quicksand font-bold text-white">
      <Heart className="h-3 w-3 fill-white" /> {count}
      <span className="sr-only">favori(s) dans le foyer</span>
    </span>
  )
}

export function RecipeCard({ recipe, variant, onOpen, onPlan, onToggleFavorite }: RecipeCardProps) {
  const time = formatDuration(recipe.total_time_min)

  if (variant === 'mobile') {
    return (
      <div
        role="link"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={e => { if (e.key === 'Enter') onOpen() }}
        className="cursor-pointer overflow-hidden rounded-[var(--kkb-radius-card)] border-[0.5px] border-[var(--kkb-border)] bg-white shadow-sm transition-transform active:scale-[0.98]"
      >
        <div className="relative">
          <RecipeVisual recipe={recipe} className="aspect-[4/3] w-full" />
          {recipe.categories && (
            <span className="absolute left-2 top-2 max-w-[70%]"><CategoryBadge category={recipe.categories} solid /></span>
          )}
          <FavoriteButton recipe={recipe} onToggle={onToggleFavorite} />
          <FoyerFavorites count={recipe.foyer_favorites} />
        </div>
        <div className="space-y-1 px-3 py-2.5">
          <p className="line-clamp-2 font-dosis font-semibold text-sm leading-tight text-[var(--kkb-text-primary)]">{recipe.name}</p>
          {time && (
            <p className="flex items-center gap-1 text-[11px] font-quicksand text-[var(--kkb-text-tertiary)]">
              <Clock className="h-3 w-3" /> {time}
            </p>
          )}
        </div>
      </div>
    )
  }

  // En grille, la catégorie est déjà sur la photo
  const withCategory = variant === 'list'
  const metas = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-quicksand text-[var(--kkb-text-tertiary)]">
      {time && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {time}</span>}
      <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {recipe.servings} pers.</span>
      {withCategory && recipe.categories && <CategoryBadge category={recipe.categories} />}
    </div>
  )

  const actions = (
    <div className="flex gap-2">
      {onPlan && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onPlan() }}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-[var(--kkb-radius-sm)] border border-[var(--kkb-border)] py-2 text-xs font-quicksand font-bold text-[var(--kkb-coral)] hover:border-[var(--kkb-coral)]"
        >
          <CalendarPlus className="h-3.5 w-3.5" /> Planifier
        </button>
      )}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onOpen() }}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-[var(--kkb-radius-sm)] bg-[var(--kkb-coral)] py-2 text-xs font-quicksand font-bold text-white hover:bg-[var(--kkb-coral-hover)]"
      >
        <Eye className="h-3.5 w-3.5" /> Voir
      </button>
    </div>
  )

  if (variant === 'list') {
    return (
      <div onClick={onOpen} className="flex cursor-pointer gap-4 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-3 transition-shadow hover:shadow-md">
        <div className="relative shrink-0">
          <RecipeVisual recipe={recipe} className="h-[96px] w-[128px] rounded-[var(--kkb-radius-sm)]" />
          <FoyerFavorites count={recipe.foyer_favorites} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="line-clamp-1 font-dosis font-bold text-base text-[var(--kkb-text-primary)]">{recipe.name}</p>
          {metas}
          {recipe.description && <p className="line-clamp-1 text-[13px] font-quicksand text-[var(--kkb-text-secondary)]">{recipe.description}</p>}
        </div>
        <div className="flex w-[200px] shrink-0 flex-col justify-between gap-2">
          <div className="relative h-8">
            <FavoriteButton recipe={recipe} onToggle={onToggleFavorite} />
          </div>
          {actions}
        </div>
      </div>
    )
  }

  return (
    <div onClick={onOpen} className="flex cursor-pointer flex-col overflow-hidden rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white transition-shadow hover:shadow-md">
      <div className="relative">
        <RecipeVisual recipe={recipe} className="h-[180px] w-full" />
        {recipe.categories && (
          <span className="absolute left-2 top-2 max-w-[70%]"><CategoryBadge category={recipe.categories} solid /></span>
        )}
        <FavoriteButton recipe={recipe} onToggle={onToggleFavorite} />
        <FoyerFavorites count={recipe.foyer_favorites} />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="line-clamp-2 font-dosis font-bold text-base leading-tight text-[var(--kkb-text-primary)]">{recipe.name}</p>
        {metas}
        <p className="line-clamp-2 min-h-[2.5em] text-[13px] font-quicksand text-[var(--kkb-text-secondary)]">{recipe.description ?? ''}</p>
        <div className="mt-auto pt-1">{actions}</div>
      </div>
    </div>
  )
}
