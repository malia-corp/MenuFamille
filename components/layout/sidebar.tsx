'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PanelLeftClose, PanelLeftOpen, Settings, type LucideIcon } from 'lucide-react'
import { Logo, LogoMark } from '@/components/brand/logo'
import { navItemsForRole, isNavItemActive, type Role } from './nav-items'
import { UserMenu } from './user-menu'

// Rail de navigation desktop : barre verticale flottante centrée en hauteur.
// Réduit (72 px, icônes seules, libellé en infobulle) ou déplié (232 px,
// icônes + libellés). L'état est posé sur <html data-rail> — la variable CSS
// --kkb-rail-offset décale alors le contenu, l'en-tête et les barres fixes —
// et mémorisé dans le navigateur (lu avant le premier rendu, cf. app/layout).

const STORAGE_KEY = 'kkb-rail'

function useRailExpanded(): [boolean, () => void] {
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setExpanded(document.documentElement.dataset.rail === 'expanded')
  }, [])

  function toggle() {
    const next = !expanded
    setExpanded(next)
    if (next) document.documentElement.dataset.rail = 'expanded'
    else delete document.documentElement.dataset.rail
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'expanded' : 'collapsed')
    } catch {
      /* stockage indisponible : l'état vaut pour cette visite */
    }
  }

  return [expanded, toggle]
}

const itemBase = 'group relative flex h-12 items-center rounded-2xl transition-colors'

function itemShape(expanded: boolean) {
  return expanded ? 'w-full gap-3 px-3.5' : 'w-12 justify-center'
}

function Tooltip({ label, hidden }: { label: string; hidden: boolean }) {
  if (hidden) return null
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-full ml-4 whitespace-nowrap rounded-[var(--kkb-r-sm)] bg-[var(--kkb-profond)] px-2.5 py-1.5 font-quicksand text-xs font-semibold text-[var(--kkb-creme)] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {label}
    </span>
  )
}

function RailLink({ href, icon: Icon, label, active, expanded }: {
  href: string; icon: LucideIcon; label: string; active: boolean; expanded: boolean
}) {
  return (
    <Link
      href={href}
      aria-label={expanded ? undefined : label}
      aria-current={active ? 'page' : undefined}
      className={`${itemBase} ${itemShape(expanded)} ${
        active
          ? 'bg-white/15 text-[var(--kkb-creme)]'
          : 'text-[var(--kkb-foret-100)] hover:bg-white/10 hover:text-[var(--kkb-creme)]'
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {expanded && <span className="truncate font-quicksand text-sm font-semibold">{label}</span>}
      <Tooltip label={label} hidden={expanded} />
    </Link>
  )
}

export function Sidebar({ role, displayName }: { role: Role; displayName?: string | null }) {
  const pathname = usePathname()
  const items = navItemsForRole(role)
  const initial = (displayName ?? '?').trim().charAt(0).toUpperCase()
  const [expanded, toggle] = useRailExpanded()
  const toggleLabel = expanded ? 'Réduire le menu' : 'Agrandir le menu'

  return (
    <aside
      className={`fixed left-3 top-1/2 z-30 hidden max-h-[calc(100vh-24px)] -translate-y-1/2 flex-col overflow-visible rounded-[28px] bg-[var(--kkb-foret)] py-4 transition-[width] duration-200 lg:flex print:hidden ${
        expanded ? 'w-[232px] items-stretch px-3' : 'w-[72px] items-center'
      }`}
      aria-label="Navigation principale"
    >
      <Link
        href="/"
        aria-label="KeskonBouf, accueil"
        className={expanded ? 'flex h-14 items-center px-1.5' : 'flex h-14 w-14 items-center justify-center rounded-full bg-[var(--kkb-creme)]'}
      >
        {expanded ? <Logo variant="reversed" layout="horizontal" size={34} /> : <LogoMark size={32} />}
      </Link>

      <nav className={`mt-6 flex flex-col gap-2 ${expanded ? '' : 'items-center'}`}>
        {items.map(({ href, icon, label }) => (
          <RailLink key={href} href={href} icon={icon} label={label} active={isNavItemActive(pathname, href)} expanded={expanded} />
        ))}
      </nav>

      <div className={`mt-6 flex flex-col gap-2 border-t border-white/10 pt-4 ${expanded ? '' : 'items-center'}`}>
        <RailLink href="/settings" icon={Settings} label="Paramètres" active={pathname.startsWith('/settings')} expanded={expanded} />
        <button
          type="button"
          onClick={toggle}
          aria-label={toggleLabel}
          aria-expanded={expanded}
          className={`${itemBase} ${itemShape(expanded)} text-[var(--kkb-foret-100)] hover:bg-white/10 hover:text-[var(--kkb-creme)]`}
        >
          {expanded ? <PanelLeftClose className="h-5 w-5 shrink-0" /> : <PanelLeftOpen className="h-5 w-5 shrink-0" />}
          {expanded && <span className="font-quicksand text-sm font-semibold">Réduire</span>}
          <Tooltip label={toggleLabel} hidden={expanded} />
        </button>

        <div className="mt-2">
          <UserMenu
            align="above"
            side="left"
            trigger={
              <span className={`flex items-center gap-3 ${expanded ? 'rounded-2xl px-1.5 py-1 hover:bg-white/10' : ''}`}>
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--kkb-coral)] font-dosis text-base font-extrabold text-white ring-2 ring-white/20"
                  aria-label={expanded ? undefined : 'Mon compte'}
                >
                  {initial}
                </span>
                {expanded && <span className="font-quicksand text-sm font-semibold text-[var(--kkb-creme)]">Mon compte</span>}
              </span>
            }
          />
        </div>
      </div>
    </aside>
  )
}
