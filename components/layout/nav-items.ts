import type { LucideIcon } from 'lucide-react'
import { Home, CalendarDays, BookOpen, Users, UserCircle, MessageSquare } from 'lucide-react'

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

const TAIL: NavItem[] = [
  { href: '/circle',  icon: Users,      label: 'Cercle' },
  { href: '/profile', icon: UserCircle, label: 'Profil' },
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
