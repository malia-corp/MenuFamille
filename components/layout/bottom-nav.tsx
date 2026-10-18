'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { navItemsForRole, isNavItemActive, type Role } from './nav-items'

// Barre basse flottante (guide I-10) : pilule vert forêt détachée du bord,
// zone sûre iOS respectée. L'entrée active passe sur une bulle crème — pas
// d'orange ici, il est réservé à l'action principale de l'écran (C-02).
// Hauteur 64 px posée à 16 px du bas : les éléments flottants des pages se
// calent au-dessus via --kkb-nav-offset (globals.css).
export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname()
  const items = navItemsForRole(role)

  // Pages de réglages : écran plein, action principale fixée en bas.
  if (pathname.startsWith('/settings')) return null

  return (
    <nav
      aria-label="Navigation principale"
      className="lg:hidden print:hidden fixed inset-x-4 z-50 mx-auto max-w-sm rounded-full bg-[var(--kkb-foret)] p-1.5 shadow-[0_12px_32px_rgba(31,58,46,0.28)]"
      style={{ bottom: 'calc(16px + env(safe-area-inset-bottom))' }}
    >
      <ul className="flex h-[52px] items-stretch">
        {items.map(({ href, icon: Icon, label }) => {
          const isActive = isNavItemActive(pathname, href)
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex h-full flex-col items-center justify-center gap-0.5 rounded-full transition-colors duration-200 ${
                  isActive
                    ? 'bg-[var(--kkb-creme)] text-[var(--kkb-foret)]'
                    : 'text-[color-mix(in_srgb,var(--kkb-creme)_75%,transparent)] active:bg-white/10'
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 2} />
                <span className="font-quicksand text-[11px] font-bold leading-none">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
