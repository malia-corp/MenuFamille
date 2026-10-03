'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { navItemsForRole, isNavItemActive, type Role } from './nav-items'

export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname()
  const items = navItemsForRole(role)

  // Pages de réglages : écran plein, action principale fixée en bas.
  if (pathname.startsWith('/settings')) return null

  return (
    <nav
      className="lg:hidden print:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-fit rounded-full px-4 py-2 backdrop-blur-md"
      style={{ background: 'var(--kkb-teal)' }}
    >
      <div className="flex items-center gap-1">
        {items.map(({ href, icon: Icon, label }) => {
          const isActive = isNavItemActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-full px-3.5 py-1.5 text-white transition-all duration-200 ${
                isActive ? 'opacity-100' : 'opacity-65'
              }`}
              style={isActive ? { background: 'var(--kkb-coral)' } : undefined}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-quicksand font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
