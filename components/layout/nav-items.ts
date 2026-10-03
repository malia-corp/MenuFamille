import type { LucideIcon } from 'lucide-react'
import { Home, CalendarDays, BookOpen, Users, MessageSquare, Vote } from 'lucide-react'

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

// Planificatrice : Menu + Recettes. Membre : Votes + Avis — il ne planifie
// pas : son menu de la semaine est sur l'accueil (lecture seule).
export function navItemsForRole(role: Role): NavItem[] {
  if (role === 'membre') {
    return [
      HEAD[0],
      { href: '/votes/results/member', icon: Vote,          label: 'Votes' },
      { href: '/feedback',             icon: MessageSquare, label: 'Avis' },
      ...TAIL,
    ]
  }
  return [...HEAD, { href: '/recipes', icon: BookOpen, label: 'Recettes' }, ...TAIL]
}

export function isNavItemActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}
