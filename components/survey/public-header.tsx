'use client'

import { Logo } from '@/components/brand/logo'
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
      <header className="sticky top-0 z-30 bg-[color-mix(in_srgb,var(--kkb-creme)_88%,transparent)] backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 xl:px-10 h-14 lg:h-16 flex items-center justify-between">
          <Link href="/" className="flex min-w-0 items-center gap-2" aria-label="Retour à l'accueil">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[var(--kkb-foret)]">
              <ArrowLeft className="h-5 w-5" />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5 leading-tight">
              <Logo layout="horizontal" size={22} />
              {label && <span className="truncate font-quicksand text-xs font-semibold text-[var(--kkb-texte-2)]">{label}</span>}
            </span>
          </Link>

          <div className="flex items-center gap-2 lg:gap-4">
            <NotificationBell className="h-10 w-10 rounded-full bg-white flex items-center justify-center" />
            <UserMenu
              trigger={
                <span className="flex items-center gap-2">
                  <span className="hidden lg:block font-quicksand font-semibold text-sm text-[var(--kkb-text-primary)]">{viewer.display_name}</span>
                  <span
                    className="h-10 w-10 rounded-full bg-[var(--kkb-foret)] text-[var(--kkb-creme)] text-sm font-dosis font-extrabold flex items-center justify-center"
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
    <header className="sticky top-0 z-30 bg-[color-mix(in_srgb,var(--kkb-creme)_88%,transparent)] backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 xl:px-10 h-14 flex items-center justify-between">
        <Logo layout="horizontal" size={26} />

        {label && (
          <div className="flex items-center gap-2">
            <span className="font-quicksand text-xs font-semibold text-[var(--kkb-texte-2)]">{label}</span>
            <span className="h-9 w-9 rounded-full bg-[var(--kkb-foret)] text-[var(--kkb-creme)] text-sm font-dosis font-extrabold flex items-center justify-center shrink-0">
              {initial}
            </span>
          </div>
        )}
      </div>
    </header>
  )
}
