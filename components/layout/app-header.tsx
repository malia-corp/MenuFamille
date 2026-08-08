'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Bell,
  BookOpen,
  CalendarDays,
  Home,
  LogOut,
  Menu,
  UtensilsCrossed,
  UserCircle,
  X,
} from 'lucide-react'

interface AppHeaderProps {
  title?: string
  showBack?: boolean
}

export function AppHeader({ title = 'MenuFamille', showBack = false }: AppHeaderProps) {
  const router = useRouter()
  const [drawerOpen,   setDrawerOpen]   = useState(false)
  const [surveyBadge,  setSurveyBadge]  = useState(0)

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

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#FDF6EE] border-b border-[#E8C99A] h-14 flex items-center px-4">
        <div className="flex items-center justify-between w-full max-w-sm mx-auto">
          {showBack ? (
            <button
              type="button"
              onClick={() => router.back()}
              className="p-1 -ml-1 text-[#5A4A43] hover:text-terracotta"
              aria-label="Retour"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="p-1 -ml-1 text-[#5A4A43] hover:text-terracotta"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <div className="flex items-center gap-1.5">
            <UtensilsCrossed className="h-4 w-4 text-terracotta" />
            <span className="font-dosis font-bold text-[#2C1810]">{title}</span>
          </div>

          {/* Badge sondage */}
          <button
            type="button"
            onClick={() => router.push('/plan')}
            className="relative p-1 -mr-1 text-[#5A4A43]"
            aria-label="Avis sondage"
          >
            <Bell className="h-5 w-5" />
            {surveyBadge > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-[#E87D3E] text-white text-[9px] font-dosis font-bold flex items-center justify-center">
                {surveyBadge > 9 ? '9+' : surveyBadge}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Drawer overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative w-64 h-full bg-[#FDF6EE] shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[#E8C99A]">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5 text-terracotta" />
                <span className="font-dosis font-bold text-[#2C1810]">MenuFamille</span>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="text-[#8c7169] hover:text-[#2C1810]"
                aria-label="Fermer le menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-1">
              {[
                { href: '/', icon: Home, label: 'Accueil' },
                { href: '/plan', icon: CalendarDays, label: 'Menu de la semaine' },
                { href: '/recipes', icon: BookOpen, label: 'Recettes' },
                { href: '/notifications', icon: Bell, label: 'Notifications' },
                { href: '/profile', icon: UserCircle, label: 'Mon profil' },
              ].map(({ href, icon: Icon, label }) => (
                <button
                  key={href}
                  type="button"
                  onClick={() => { router.push(href); setDrawerOpen(false) }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#5A4A43] hover:bg-[#FCEEE6] hover:text-[#2C1810] font-quicksand text-sm"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </nav>

            <div className="p-4 border-t border-[#E8C99A]">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 font-quicksand text-sm"
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
