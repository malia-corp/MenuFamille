'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell } from 'lucide-react'
import { UserMenu } from './user-menu'

interface MobileHeaderProps {
  displayName?: string | null
  title?: string
  showBack?: boolean
}

export function MobileHeader({ displayName, title, showBack = false }: MobileHeaderProps) {
  const router = useRouter()
  const initial = (displayName ?? '?').trim().charAt(0).toUpperCase()

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-[var(--kkb-border)]/50 h-14 flex items-center px-4">
      <div className="flex items-center justify-between w-full max-w-sm mx-auto">
        <div className="flex items-center gap-1.5 -ml-1">
          {showBack && (
            <button
              type="button"
              onClick={() => router.back()}
              className="p-1 mr-0.5 text-[var(--kkb-teal)]"
              aria-label="Retour"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <Image src="/logo-icon.svg" alt="" width={20} height={20} className="h-5 w-5" />
          <span className="font-dosis font-bold text-[var(--kkb-coral)]">{title ?? 'KeskonBouf'}</span>
        </div>

        <div className="flex items-center gap-2 -mr-1">
          <button
            type="button"
            onClick={() => router.push('/notifications')}
            className="p-1 text-[var(--kkb-text-secondary)]"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>
          <UserMenu
            trigger={
              <span
                className="h-7 w-7 rounded-full bg-[var(--kkb-coral)] text-white text-xs font-quicksand font-bold flex items-center justify-center"
                aria-label="Mon compte"
              >
                {initial}
              </span>
            }
          />
        </div>
      </div>
    </header>
  )
}
