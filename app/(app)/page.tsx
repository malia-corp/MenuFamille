'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, Settings, Users } from 'lucide-react'

interface UserProfile {
  display_name: string
}

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)

  useEffect(() => {
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((data) => {
        if (data?.display_name) setUser(data)
      })
  }, [])

  const firstName = user?.display_name?.split(' ')[0] ?? ''

  return (
    <div className="max-w-sm mx-auto px-4 py-6 space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-[var(--kkb-text-tertiary)] font-quicksand">Bonjour{firstName ? `, ${firstName}` : ''} 👋</p>
        <h1 className="font-dosis font-bold text-2xl text-[var(--kkb-text-primary)]">Que planifions-nous ?</h1>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => router.push('/plan/configure')}
          className="w-full flex items-center gap-4 bg-[var(--kkb-coral-light)] border border-[var(--kkb-border)] rounded-xl p-4 hover:bg-[var(--kkb-coral-light)] transition-colors text-left"
        >
          <div className="h-10 w-10 rounded-full bg-[var(--kkb-coral-light)] flex items-center justify-center flex-shrink-0">
            <Settings className="h-5 w-5 text-[var(--kkb-coral)]" />
          </div>
          <div>
            <p className="font-dosis font-semibold text-[var(--kkb-text-primary)]">Configurer les repas</p>
            <p className="text-xs text-[var(--kkb-text-tertiary)] font-quicksand">Types de repas et modes de planification</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => router.push('/circle')}
          className="w-full flex items-center gap-4 bg-[var(--kkb-success-light)] border border-[var(--kkb-success-light)] rounded-xl p-4 hover:bg-[var(--kkb-success-light)] transition-colors text-left"
        >
          <div className="h-10 w-10 rounded-full bg-[var(--kkb-success-light)] flex items-center justify-center flex-shrink-0">
            <Users className="h-5 w-5 text-[var(--kkb-success)]" />
          </div>
          <div>
            <p className="font-dosis font-semibold text-[var(--kkb-text-primary)]">Mon cercle familial</p>
            <p className="text-xs text-[var(--kkb-text-tertiary)] font-quicksand">Membres et code d&apos;invitation</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => router.push('/plan')}
          className="w-full flex items-center gap-4 bg-[var(--kkb-surface)] border border-[var(--kkb-border)] rounded-xl p-4 hover:bg-[var(--kkb-bg)] transition-colors text-left"
        >
          <div className="h-10 w-10 rounded-full bg-[var(--kkb-warning)]/10 flex items-center justify-center flex-shrink-0">
            <CalendarDays className="h-5 w-5 text-[var(--kkb-warning)]" />
          </div>
          <div>
            <p className="font-dosis font-semibold text-[var(--kkb-text-primary)]">Menu de la semaine</p>
            <p className="text-xs text-[var(--kkb-text-tertiary)] font-quicksand">Planifier les repas de la semaine</p>
          </div>
        </button>
      </div>
    </div>
  )
}
