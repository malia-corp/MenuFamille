'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LogoMark } from '@/components/brand/logo'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { UserMenu } from './user-menu'
import { NotificationBell } from './notification-bell'

interface MobileHeaderProps {
  displayName?: string | null
  circleName?: string | null
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
]

// Écrans de premier niveau avec un sous-titre sous le logo.
function subtitleFor(pathname: string, circleName?: string | null): { text: string; caps: boolean } | null {
  if (pathname === '/profile') return { text: 'Profil', caps: true }
  if (pathname === '/circle' && circleName) return { text: `Famille ${circleName}`, caps: false }
  return null
}

export function MobileHeader({ displayName, circleName, title: titleProp, showBack: showBackProp = false }: MobileHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const initial = (displayName ?? '?').trim().charAt(0).toUpperCase()

  const backRoute = BACK_ROUTES.find(r => r.re.test(pathname))
  const showBack  = showBackProp || !!backRoute
  const title     = titleProp ?? backRoute?.title
  const subtitle  = showBack ? null : subtitleFor(pathname, circleName)

  // Transparent en haut de page ; fond flouté et filet une fois la page
  // défilée, pour détacher l'en-tête du contenu qui passe dessous.
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`lg:hidden print:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center px-4 transition-[background-color,box-shadow] duration-200 ${
        scrolled
          ? 'bg-[color-mix(in_srgb,var(--kkb-creme)_85%,transparent)] backdrop-blur-md shadow-[0_1px_0_var(--kkb-filet)]'
          : 'bg-transparent'
      }`}
    >
      <div className="flex items-center justify-between w-full max-w-sm mx-auto">
        <div className="flex min-w-0 items-center gap-2.5">
          {showBack && (
            <button
              type="button"
              onClick={() => router.back()}
              className="h-10 w-10 shrink-0 rounded-full bg-white flex items-center justify-center text-[var(--kkb-foret)] active:scale-95 transition-transform"
              aria-label="Retour"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          {title ? (
            <LogoMark size={22} />
          ) : (
            <Link href="/" aria-label="KeskonBouf, accueil" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white">
              <LogoMark size={30} />
            </Link>
          )}
          <span className="flex min-w-0 flex-col leading-tight">
            {title && <span className="truncate font-dosis font-extrabold text-[17px] text-[var(--kkb-foret)]">{title}</span>}
            {!title && !subtitle && (
              <>
                <span className="font-quicksand text-[11px] font-semibold text-[var(--kkb-texte-2)]">Foyer</span>
                <span className="max-w-[180px] truncate font-dosis text-[15px] font-extrabold text-[var(--kkb-foret)]">
                  {circleName ?? 'KeskonBouf'}
                </span>
              </>
            )}
            {subtitle && (
              <span className={subtitle.caps
                ? 'font-quicksand text-[10px] font-bold uppercase tracking-wider text-[var(--kkb-text-tertiary)]'
                : 'max-w-[180px] truncate font-quicksand text-xs text-[var(--kkb-teal)]'}
              >
                {subtitle.text}
              </span>
            )}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <NotificationBell className="h-10 w-10 rounded-full bg-white flex items-center justify-center active:scale-95 transition-transform" />
          <UserMenu
            trigger={
              <span
                className="h-10 w-10 rounded-full bg-[var(--kkb-foret)] text-[var(--kkb-creme)] text-sm font-dosis font-extrabold flex items-center justify-center"
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
