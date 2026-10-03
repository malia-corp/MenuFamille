import { categoryColor, categoryIcon } from '@/lib/constants/category-icon'
import type { RecipeCategory } from './types'

// Pastille de catégorie : pleine (sur photo) ou légère (dans les métas).
export function CategoryBadge({ category, solid = false }: { category: RecipeCategory; solid?: boolean }) {
  const Icon  = categoryIcon(category.slug)
  const color = categoryColor(category.color)
  return (
    <span
      className="inline-flex max-w-full items-center gap-1 truncate rounded-[var(--kkb-radius-pill)] px-2 py-0.5 text-[10px] font-quicksand font-bold uppercase tracking-wide"
      style={solid ? { backgroundColor: color, color: '#fff', boxShadow: '0 0 0 1.5px rgba(255,255,255,0.85)' } : { backgroundColor: `${color}1F`, color }}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">{category.name}</span>
    </span>
  )
}
