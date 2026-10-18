'use client'

import Link from 'next/link'
import { Logo } from '@/components/brand/logo'
import { usePathname } from 'next/navigation'
import { navItemsForRole, isNavItemActive, type Role } from './nav-items'
import { UserMenu } from './user-menu'

export function Sidebar({ role, displayName }: { role: Role; displayName?: string | null }) {
  const pathname = usePathname()
  const items = navItemsForRole(role)
  const initial = (displayName ?? '?').trim().charAt(0).toUpperCase()

  return (
    <aside
      className="hidden lg:flex print:hidden fixed inset-y-0 left-0 z-30 w-60 flex-col text-white"
      style={{ background: 'var(--kkb-teal)' }}
    >
      <div className="px-5 pt-6 pb-5">
        <Logo variant="reversed" layout="horizontal" size={26} />
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {items.map(({ href, icon: Icon, label }) => {
          const isActive = isNavItemActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 pl-[13px] pr-4 py-2.5 rounded-[10px] text-sm font-quicksand font-semibold border-l-[3px] transition-colors ${
                isActive
                  ? 'bg-white/15 text-white border-[var(--kkb-coral)]'
                  : 'text-white/70 hover:text-white hover:bg-white/10 border-transparent'
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-3 border-t border-white/15">
        <UserMenu
          align="above"
          side="left"
          trigger={
            <span className="w-full flex items-center gap-2.5 px-2 py-2 rounded-[10px] hover:bg-white/10 transition-colors">
              <span className="h-8 w-8 shrink-0 rounded-full bg-[var(--kkb-coral)] text-white text-xs font-quicksand font-bold flex items-center justify-center">
                {initial}
              </span>
              <span className="font-quicksand font-semibold text-sm text-white">Mon compte</span>
            </span>
          }
        />
      </div>

      {/* Signature officielle : DynaPuff, seconde phrase en jaune sur vert. */}
      <div className="px-5 py-5 border-t border-white/15">
        <p className="text-signature origin-left text-[var(--kkb-creme)]">
          On mange quoi ?<br />
          <span className="text-[var(--kkb-jaune)]">On décide ensemble.</span>
        </p>
      </div>
    </aside>
  )
}
