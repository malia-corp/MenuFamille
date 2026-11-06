'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { navItemsForRole, isNavItemActive, type Role } from './nav-items'

// Barre basse flottante (guide I-10) : pilule vert profond détachée du bord,
// zone sûre iOS respectée. Les entrées inactives ne montrent que leur icône ;
// l'entrée active s'élargit en bulle crème avec son libellé (largeur et
// libellé animés au changement de page). Pas d'orange ici, il est réservé à
// l'action principale de l'écran (C-02).
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
      className="lg:hidden print:hidden fixed inset-x-4 z-50 mx-auto max-w-sm rounded-full bg-[var(--kkb-profond)] p-1.5 shadow-[0_12px_32px_rgba(31,58,46,0.32)] ring-1 ring-white/10"
      style={{ bottom: 'calc(16px + env(safe-area-inset-bottom))' }}
    >
      <ul className="flex h-[52px] items-stretch gap-1">
        {items.map(({ href, icon: Icon, label }) => {
          const isActive = isNavItemActive(pathname, href)
          return (
            <li
              key={href}
              className={`flex min-w-0 transition-[flex-grow] duration-300 ease-[cubic-bezier(0.34,1.2,0.64,1)] motion-reduce:transition-none ${
                isActive ? 'grow-[2.4]' : 'grow'
              }`}
              style={{ flexBasis: 0 }}
            >
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                aria-label={isActive ? undefined : label}
                className={`flex h-full w-full items-center justify-center overflow-hidden rounded-full transition-colors duration-300 motion-reduce:transition-none ${
                  isActive
                    ? 'bg-[var(--kkb-creme)] px-3 text-[var(--kkb-foret)]'
                    : 'text-[color-mix(in_srgb,var(--kkb-creme)_70%,transparent)] active:bg-white/10'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={isActive ? 2.4 : 2} />
                <span
                  className={`overflow-hidden whitespace-nowrap font-quicksand text-[13px] font-bold transition-[max-width,opacity,margin] duration-300 motion-reduce:transition-none ${
                    isActive ? 'ml-2 max-w-[96px] opacity-100' : 'ml-0 max-w-0 opacity-0'
                  }`}
                  aria-hidden={!isActive}
                >
                  {label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
