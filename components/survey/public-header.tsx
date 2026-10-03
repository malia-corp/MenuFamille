'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { UserMenu } from '@/components/layout/user-menu'
import { NotificationBell } from '@/components/layout/notification-bell'

interface PublicHeaderProps {
  plannerName: string | null
  familyName:  string | null
  // Visiteur connecté (GET /api/surveys/[token] → viewer) : en-tête de
  // l'application (retour, cloche, menu du compte) au lieu de l'en-tête public.
  viewer?:     { display_name: string } | null
}

// Header de la page /s/[token]. Sans connexion : uniquement ce que la route
// du sondage a pu résoudre (planner_name / family_name).
export function PublicHeader({ plannerName, familyName, viewer }: PublicHeaderProps) {
  const label = familyName ? `Famille ${familyName}` : (plannerName ?? '')

  if (viewer) {
    const initial = (viewer.display_name || '?').trim().charAt(0).toUpperCase()
    return (
      <header className="sticky top-0 z-30 bg-white border-b border-[var(--kkb-border)]/50">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 xl:px-10 h-14 lg:h-16 flex items-center justify-between">
          <Link href="/" className="flex min-w-0 items-center gap-2" aria-label="Retour à l'accueil">
            <ArrowLeft className="h-5 w-5 shrink-0 text-[var(--kkb-teal)]" />
            <Image src="/logo-icon.svg" alt="" width={24} height={24} className="h-6 w-6" />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="font-dosis font-bold text-[18px] text-[var(--kkb-coral)]">KeskonBouf</span>
              {label && <span className="truncate font-quicksand text-xs text-[var(--kkb-teal)]">{label}</span>}
            </span>
          </Link>

          <div className="flex items-center gap-2 lg:gap-4">
            <NotificationBell className="p-1 lg:h-10 lg:w-10 lg:rounded-full lg:flex lg:items-center lg:justify-center lg:hover:bg-[var(--kkb-bg)]" />
            <UserMenu
              trigger={
                <span className="flex items-center gap-2">
                  <span className="hidden lg:block font-quicksand font-semibold text-sm text-[var(--kkb-text-primary)]">{viewer.display_name}</span>
                  <span
                    className="h-8 w-8 rounded-full bg-[var(--kkb-coral)] text-white text-xs font-quicksand font-bold flex items-center justify-center"
                    aria-label="Mon compte"
                  >
                    {initial}
                  </span>
                </span>
              }
            />
          </div>
        </div>
      </header>
    )
  }

  const initial = (plannerName ?? '?').trim().charAt(0).toUpperCase()
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[var(--kkb-border)]/50">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 xl:px-10 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image src="/logo-icon.svg" alt="" width={24} height={24} className="h-6 w-6" />
          <span className="font-dosis font-bold text-[18px] text-[var(--kkb-coral)]">KeskonBouf</span>
        </div>

        {label && (
          <div className="flex items-center gap-2">
            <span className="font-quicksand text-xs text-[var(--kkb-text-secondary)]">{label}</span>
            <span className="h-7 w-7 rounded-full bg-[var(--kkb-coral)] text-white text-xs font-quicksand font-bold flex items-center justify-center shrink-0">
              {initial}
            </span>
          </div>
        )}
      </div>
    </header>
  )
}
