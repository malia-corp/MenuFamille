'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, CalendarDays, Home, UserCircle } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', icon: Home, label: 'Accueil' },
  { href: '/plan', icon: CalendarDays, label: 'Menu' },
  { href: '/recipes', icon: BookOpen, label: 'Recettes' },
  { href: '/profile', icon: UserCircle, label: 'Profil' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#FDF6EE] border-t border-[#E8C99A] h-16 flex items-center">
      <div className="w-full max-w-sm mx-auto flex items-center justify-around px-2">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                isActive ? 'text-terracotta' : 'text-[#8c7169] hover:text-[#5A4A43]'
              }`}
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
