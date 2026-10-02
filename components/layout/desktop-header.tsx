'use client'

import { UserMenu } from './user-menu'
import { NotificationBell } from './notification-bell'
import type { Role } from './nav-items'

const ROLE_LABEL: Record<string, string> = {
  planificatrice: 'Organisatrice',
  membre: 'Membre',
}

interface DesktopHeaderProps {
  circleName?: string | null
  role: Role
  displayName?: string | null
}

export function DesktopHeader({ circleName, role, displayName }: DesktopHeaderProps) {
  const initial = (displayName ?? '?').trim().charAt(0).toUpperCase()

  return (
    <header className="hidden lg:flex print:hidden fixed top-0 left-60 right-0 h-16 z-30 bg-white/85 backdrop-blur-xl border-b border-[var(--kkb-border)]/50 px-8 items-center justify-between">
      <span className="font-quicksand text-sm text-[var(--kkb-text-secondary)]">
        Foyer · {circleName ?? 'Mon cercle'}
      </span>

      <div className="flex items-center gap-4">
        <NotificationBell className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-[var(--kkb-bg)] transition-colors" />

        <div className="h-6 w-px bg-[var(--kkb-border)]" />

        <UserMenu
          side="right"
          trigger={
            <span className="flex items-center gap-3 pl-1 pr-2 py-1 rounded-full hover:bg-[var(--kkb-bg)] transition-colors">
              <span className="flex flex-col text-right">
                <span className="font-quicksand font-semibold text-sm text-[var(--kkb-text-primary)] leading-tight">
                  {displayName ?? ''}
                </span>
                <span className="font-quicksand text-xs text-[var(--kkb-text-tertiary)] leading-none">
                  {role ? ROLE_LABEL[role] : ''}
                </span>
              </span>
              <span className="h-8 w-8 rounded-full bg-[var(--kkb-coral)] text-white text-xs font-quicksand font-bold flex items-center justify-center">
                {initial}
              </span>
            </span>
          }
        />
      </div>
    </header>
  )
}
