'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, LogOut, Menu, X } from 'lucide-react'
import { navItemsForRole, type Role } from './nav-items'

interface MobileHeaderProps {
  role?: Role
  displayName?: string | null
  title?: string
  showBack?: boolean
}

export function MobileHeader({ role = null, displayName, title, showBack = false }: MobileHeaderProps) {
  const router = useRouter()
  const [drawerOpen,  setDrawerOpen]  = useState(false)
  const [surveyBadge, setSurveyBadge] = useState(0)

  useEffect(() => {
    fetch('/api/surveys/unread-count')
      .then(r => r.ok ? r.json() : { count: 0 })
      .then((d: { count: number }) => setSurveyBadge(d.count))
      .catch(() => {})
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const initial = (displayName ?? '?').trim().charAt(0).toUpperCase()

  return (
    <>
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-[var(--kkb-border)]/50 h-14 flex items-center px-4">
        <div className="flex items-center justify-between w-full max-w-sm mx-auto">
          {showBack ? (
            <button
              type="button"
              onClick={() => router.back()}
              className="p-1 -ml-1 text-[var(--kkb-teal)]"
              aria-label="Retour"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="p-1 -ml-1 text-[var(--kkb-teal)]"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <div className="flex items-center gap-1.5">
            <Image src="/logo-icon.svg" alt="" width={20} height={20} className="h-5 w-5" />
            <span className="font-dosis font-bold text-[var(--kkb-coral)]">{title ?? 'KeskonBouf'}</span>
          </div>

          <div className="flex items-center gap-2 -mr-1">
            <button
              type="button"
              onClick={() => router.push('/plan')}
              className="relative p-1 text-[var(--kkb-text-secondary)]"
              aria-label="Avis sondage"
            >
              <Bell className="h-5 w-5" />
              {surveyBadge > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-[var(--kkb-coral)] text-white text-[9px] font-dosis font-bold flex items-center justify-center">
                  {surveyBadge > 9 ? '9+' : surveyBadge}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => router.push('/profile')}
              className="h-7 w-7 rounded-full bg-[var(--kkb-coral)] text-white text-xs font-quicksand font-bold flex items-center justify-center"
              aria-label="Mon profil"
            >
              {initial}
            </button>
          </div>
        </div>
      </header>

      {/* Drawer overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative w-64 h-full bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[var(--kkb-border)]/50">
              <div className="flex items-center gap-2">
                <Image src="/logo-icon.svg" alt="" width={20} height={20} className="h-5 w-5" />
                <span className="font-dosis font-bold text-[var(--kkb-teal)]">KeskonBouf</span>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="text-[var(--kkb-text-tertiary)] hover:text-[var(--kkb-text-primary)]"
                aria-label="Fermer le menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-1">
              {navItemsForRole(role).map(({ href, icon: Icon, label }) => (
                <button
                  key={href}
                  type="button"
                  onClick={() => { router.push(href); setDrawerOpen(false) }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--kkb-text-secondary)] hover:bg-[var(--kkb-teal-light)] hover:text-[var(--kkb-teal)] font-quicksand text-sm"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => { router.push('/notifications'); setDrawerOpen(false) }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--kkb-text-secondary)] hover:bg-[var(--kkb-teal-light)] hover:text-[var(--kkb-teal)] font-quicksand text-sm"
              >
                <Bell className="h-4 w-4" />
                Notifications
              </button>
            </nav>

            <div className="p-4 border-t border-[var(--kkb-border)]/50">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--kkb-danger)] hover:bg-[var(--kkb-danger-light)] font-quicksand text-sm"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
