import type { LucideIcon } from 'lucide-react'
import { Home, CalendarDays, BookOpen, Users, MessageSquare } from 'lucide-react'

export type Role = 'planificatrice' | 'membre' | null

export interface NavItem {
  href: string
  icon: LucideIcon
  label: string
}

const HEAD: NavItem[] = [
  { href: '/',     icon: Home,         label: 'Accueil' },
  { href: '/plan', icon: CalendarDays, label: 'Menu'    },
]

// "Profil" n'est plus un item de nav : accessible via le menu deroulant de
// l'avatar (UserMenu). Cet emplacement (fin de liste) est reserve a
// Garde-manger, qui remplacera "Profil" ici plus tard.
const TAIL: NavItem[] = [
  { href: '/circle', icon: Users, label: 'Cercle' },
]

// Planificatrice : Recettes. Membre : Avis (retours post-repas).
export function navItemsForRole(role: Role): NavItem[] {
  const middle: NavItem = role === 'membre'
    ? { href: '/feedback', icon: MessageSquare, label: 'Avis' }
    : { href: '/recipes',  icon: BookOpen,      label: 'Recettes' }
  return [...HEAD, middle, ...TAIL]
}

export function isNavItemActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}
