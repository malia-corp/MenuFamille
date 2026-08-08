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
        <p className="text-sm text-[#8c7169] font-quicksand">Bonjour{firstName ? `, ${firstName}` : ''} 👋</p>
        <h1 className="font-dosis font-bold text-2xl text-[#2C1810]">Que planifions-nous ?</h1>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => router.push('/plan/configure')}
          className="w-full flex items-center gap-4 bg-[#FCEEE6] border border-[#E8C99A] rounded-xl p-4 hover:bg-[#FBEEE9] transition-colors text-left"
        >
          <div className="h-10 w-10 rounded-full bg-terracotta/10 flex items-center justify-center flex-shrink-0">
            <Settings className="h-5 w-5 text-terracotta" />
          </div>
          <div>
            <p className="font-dosis font-semibold text-[#2C1810]">Configurer les repas</p>
            <p className="text-xs text-[#8c7169] font-quicksand">Types de repas et modes de planification</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => router.push('/circle')}
          className="w-full flex items-center gap-4 bg-[#EAF5EE] border border-[#c3e6d0] rounded-xl p-4 hover:bg-[#d9eedf] transition-colors text-left"
        >
          <div className="h-10 w-10 rounded-full bg-market-green/10 flex items-center justify-center flex-shrink-0">
            <Users className="h-5 w-5 text-market-green" />
          </div>
          <div>
            <p className="font-dosis font-semibold text-[#2C1810]">Mon cercle familial</p>
            <p className="text-xs text-[#8c7169] font-quicksand">Membres et code d&apos;invitation</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => router.push('/plan')}
          className="w-full flex items-center gap-4 bg-[#FFF8F6] border border-[#E8C99A] rounded-xl p-4 hover:bg-[#FDF6EE] transition-colors text-left"
        >
          <div className="h-10 w-10 rounded-full bg-[#F5A623]/10 flex items-center justify-center flex-shrink-0">
            <CalendarDays className="h-5 w-5 text-[#F5A623]" />
          </div>
          <div>
            <p className="font-dosis font-semibold text-[#2C1810]">Menu de la semaine</p>
            <p className="text-xs text-[#8c7169] font-quicksand">Planifier les repas de la semaine</p>
          </div>
        </button>
      </div>
    </div>
  )
}
