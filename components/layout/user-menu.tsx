'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserCircle, Settings, LogOut } from 'lucide-react'

interface UserMenuProps {
  trigger: React.ReactNode
  align?: 'below' | 'above' // 'above' : pour un trigger en bas d'ecran (pied de la Sidebar)
  side?: 'left' | 'right'
}

export function UserMenu({ trigger, align = 'below', side = 'right' }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  function go(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <div ref={containerRef} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full text-left">
        {trigger}
      </button>

      {open && (
        <div
          className={`absolute w-44 rounded-xl bg-white shadow-lg border border-[var(--kkb-border)]/60 py-1.5 z-50 ${
            align === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'
          } ${side === 'right' ? 'right-0' : 'left-0'}`}
        >
          <button
            type="button"
            onClick={() => go('/profile')}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-quicksand text-[var(--kkb-text-secondary)] hover:bg-[var(--kkb-teal-light)] hover:text-[var(--kkb-teal)]"
          >
            <UserCircle className="h-4 w-4" />
            Profil
          </button>
          <button
            type="button"
            onClick={() => go('/plan/configure')}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-quicksand text-[var(--kkb-text-secondary)] hover:bg-[var(--kkb-teal-light)] hover:text-[var(--kkb-teal)]"
          >
            <Settings className="h-4 w-4" />
            Paramètres
          </button>
          <div className="my-1 border-t border-[var(--kkb-border-light)]" />
          <button
            type="button"
            onClick={() => { setOpen(false); void handleLogout() }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-quicksand text-[var(--kkb-danger)] hover:bg-[var(--kkb-danger-light)]"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      )}
    </div>
  )
}
