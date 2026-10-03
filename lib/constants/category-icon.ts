import { CakeSlice, ChefHat, Cookie, CupSoda, Salad, Soup, UtensilsCrossed, Wheat, type LucideIcon } from 'lucide-react'

// Icône lucide par catégorie de recette (slug), à la place de l'emoji stocké
// en base dans categories.icon (non affichable, cf. CLAUDE.md "Icônes").
const CATEGORY_ICON: Record<string, LucideIcon> = {
  'plat-principal':    UtensilsCrossed,
  'entree':            Salad,
  'dessert':           CakeSlice,
  'sauce':             Soup,
  'boisson':           CupSoda,
  'bouillie-cereales': Wheat,
  'beignets-snacks':   Cookie,
  'soupe':             Soup,
}

export function categoryIcon(slug: string | null | undefined): LucideIcon {
  return (slug && CATEGORY_ICON[slug]) || ChefHat
}

// Couleur de la catégorie (categories.color, hex) avec repli corail.
export function categoryColor(color: string | null | undefined): string {
  return color && /^#[0-9a-f]{6}$/i.test(color) ? color : '#D4572A'
}
