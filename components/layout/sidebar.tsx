'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, type LucideIcon } from 'lucide-react'
import { LogoMark } from '@/components/brand/logo'
import { navItemsForRole, isNavItemActive, type Role } from './nav-items'
import { UserMenu } from './user-menu'

// Rail de navigation desktop : barre verticale flottante, icônes seules,
// libellé en infobulle au survol (et en aria-label). Largeur totale occupée
// à gauche : 12 + 72 + 12 = 96 px (lg:ml-24 / lg:left-24 ailleurs).

function RailLink({ href, icon: Icon, label, active }: { href: string; icon: LucideIcon; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={`group relative flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${
        active
          ? 'bg-white/15 text-[var(--kkb-creme)]'
          : 'text-[var(--kkb-foret-100)] hover:bg-white/10 hover:text-[var(--kkb-creme)]'
      }`}
    >
      <Icon className="h-5 w-5" />
      <span
        role="tooltip"
        className="pointer-events-none absolute left-full ml-4 whitespace-nowrap rounded-[var(--kkb-r-sm)] bg-[var(--kkb-profond)] px-2.5 py-1.5 font-quicksand text-xs font-semibold text-[var(--kkb-creme)] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        {label}
      </span>
    </Link>
  )
}

export function Sidebar({ role, displayName }: { role: Role; displayName?: string | null }) {
  const pathname = usePathname()
  const items = navItemsForRole(role)
  const initial = (displayName ?? '?').trim().charAt(0).toUpperCase()

  return (
    <aside
      className="fixed inset-y-3 left-3 z-30 hidden w-[72px] flex-col items-center rounded-[28px] bg-[var(--kkb-foret)] py-3 lg:flex print:hidden"
      aria-label="Navigation principale"
    >
      <Link
        href="/"
        aria-label="KeskonBouf, accueil"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--kkb-creme)] ring-2 ring-white/20"
      >
        <LogoMark size={22} />
      </Link>

      <nav className="mt-8 flex flex-col items-center gap-2">
        {items.map(({ href, icon, label }) => (
          <RailLink key={href} href={href} icon={icon} label={label} active={isNavItemActive(pathname, href)} />
        ))}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-2">
        <RailLink href="/settings" icon={Settings} label="Paramètres" active={pathname.startsWith('/settings')} />
        <div className="mt-2">
          <UserMenu
            align="above"
            side="left"
            trigger={
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--kkb-coral)] font-dosis text-base font-extrabold text-white ring-2 ring-white/20"
                aria-label="Mon compte"
              >
                {initial}
              </span>
            }
          />
        </div>
      </div>
    </aside>
  )
}
