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

// Sans photo : aplat orange très clair et pictogramme de la catégorie.
function RecipeVisual({ recipe, className }: { recipe: RecipeListItem; className: string }) {
  const Icon = categoryIcon(recipe.categories?.slug)
  return (
    <div className={`relative overflow-hidden bg-[var(--kkb-orange-50)] ${className}`}>
      {recipe.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={recipe.photo_url} alt={recipe.name} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="h-10 w-10 text-[var(--kkb-orange-300)]" aria-hidden="true" />
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

// Remplace la note étoilée de la maquette (aucun système d'avis) : nombre de
// membres de la table qui ont mis la recette en favori.
function FoyerFavorites({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-quicksand font-bold text-[var(--kkb-foret)] backdrop-blur-sm">
      <Heart className="h-3 w-3 fill-[var(--kkb-orange)] text-[var(--kkb-orange)]" /> <span className="tabular-nums">{count}</span>
      <span className="sr-only">favori(s) à la table</span>
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
        className="cursor-pointer overflow-hidden rounded-[var(--kkb-r-xl)] bg-white p-1.5 transition-transform active:scale-[0.98]"
      >
        <div className="relative">
          <RecipeVisual recipe={recipe} className="aspect-square w-full rounded-[var(--kkb-r-lg)]" />
          <FavoriteButton recipe={recipe} onToggle={onToggleFavorite} />
          <FoyerFavorites count={recipe.foyer_favorites} />
        </div>
        <div className="space-y-1 px-1.5 pb-1.5 pt-2">
          <p className="line-clamp-2 min-h-[40px] font-dosis text-[15px] font-bold leading-5 text-[var(--kkb-profond)]">{recipe.name}</p>
          <p className="flex items-center gap-1.5 truncate text-xs font-quicksand text-[var(--kkb-texte-2)]">
            {time && <><Clock className="h-3 w-3 shrink-0" /> <span className="tabular-nums">{time}</span></>}
            {time && recipe.categories && <span aria-hidden="true">·</span>}
            {recipe.categories && <span className="truncate">{recipe.categories.name}</span>}
          </p>
        </div>
      </div>
    )
  }

  // En grille, la catégorie est déjà sur la photo
  const withCategory = variant === 'list'
  const metas = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-quicksand text-[var(--kkb-texte-2)]">
      {time && <span className="inline-flex items-center gap-1 tabular-nums"><Clock className="h-3.5 w-3.5" /> {time}</span>}
      <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {recipe.servings} pers.</span>
      {withCategory && recipe.categories && <CategoryBadge category={recipe.categories} />}
    </div>
  )

  // Pas d'orange ici : une grille en alignerait une douzaine (C-02).
  const actions = (
    <div className="flex gap-2">
      {onPlan && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onPlan() }}
          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--kkb-lin)] text-xs font-quicksand font-bold text-[var(--kkb-foret)] hover:bg-[var(--kkb-foret-50)]"
        >
          <CalendarPlus className="h-3.5 w-3.5" /> Planifier
        </button>
      )}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onOpen() }}
        className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--kkb-foret)] text-xs font-quicksand font-bold text-[var(--kkb-creme)] hover:bg-[var(--kkb-profond)]"
      >
        <Eye className="h-3.5 w-3.5" /> Voir
      </button>
    </div>
  )

  if (variant === 'list') {
    return (
      <div onClick={onOpen} className="flex cursor-pointer gap-4 rounded-[var(--kkb-r-xl)] bg-white p-2.5 transition-colors hover:bg-[var(--kkb-carte)]">
        <div className="relative shrink-0">
          <RecipeVisual recipe={recipe} className="h-[104px] w-[136px] rounded-[var(--kkb-r-lg)]" />
          <FoyerFavorites count={recipe.foyer_favorites} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
          <p className="line-clamp-1 font-dosis font-bold text-base text-[var(--kkb-profond)]">{recipe.name}</p>
          {metas}
          {recipe.description && <p className="line-clamp-1 text-[13px] font-quicksand text-[var(--kkb-texte-2)]">{recipe.description}</p>}
        </div>
        <div className="flex w-[200px] shrink-0 flex-col justify-between gap-2 py-1 pr-1">
          <div className="relative h-9">
            <FavoriteButton recipe={recipe} onToggle={onToggleFavorite} />
          </div>
          {actions}
        </div>
      </div>
    )
  }

  return (
    <div onClick={onOpen} className="flex cursor-pointer flex-col overflow-hidden rounded-[var(--kkb-r-xl)] bg-white p-1.5">
      <div className="relative">
        <RecipeVisual recipe={recipe} className="h-[180px] w-full rounded-[var(--kkb-r-lg)]" />
        {recipe.categories && (
          <span className="absolute left-2 top-2 max-w-[70%]"><CategoryBadge category={recipe.categories} solid /></span>
        )}
        <FavoriteButton recipe={recipe} onToggle={onToggleFavorite} />
        <FoyerFavorites count={recipe.foyer_favorites} />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="line-clamp-2 font-dosis font-bold text-base leading-tight text-[var(--kkb-profond)]">{recipe.name}</p>
        {metas}
        <p className="line-clamp-2 min-h-[2.5em] text-[13px] font-quicksand text-[var(--kkb-texte-2)]">{recipe.description ?? ''}</p>
        <div className="mt-auto pt-1">{actions}</div>
      </div>
    </div>
  )
}
