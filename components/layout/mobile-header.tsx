'use client'

import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { UserMenu } from './user-menu'
import { NotificationBell } from './notification-bell'

interface MobileHeaderProps {
  displayName?: string | null
  title?: string
  showBack?: boolean
}

// Pages de détail et de saisie : flèche retour + titre de la section.
const BACK_ROUTES: { re: RegExp; title: string }[] = [
  { re: /^\/recipes\/add$/,            title: 'Recettes' },
  { re: /^\/recipes\/[^/]+\/edit$/,    title: 'Recettes' },
  { re: /^\/recipes\/(?!add$)[^/]+$/,  title: 'Recettes' },
  { re: /^\/settings$/,                title: 'Paramètres' },
  { re: /^\/settings\/meal-config$/,   title: 'Rythme des repas' },
  { re: /^\/settings\/notifications$/, title: 'Notifications' },
  { re: /^\/profile$/,                 title: 'Mon profil' },
]

export function MobileHeader({ displayName, title: titleProp, showBack: showBackProp = false }: MobileHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const initial = (displayName ?? '?').trim().charAt(0).toUpperCase()

  const backRoute = BACK_ROUTES.find(r => r.re.test(pathname))
  const showBack  = showBackProp || !!backRoute
  const title     = titleProp ?? backRoute?.title

  return (
    <header className="lg:hidden print:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-[var(--kkb-border)]/50 h-14 flex items-center px-4">
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
          <NotificationBell className="p-1" />
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
