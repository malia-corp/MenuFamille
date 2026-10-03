'use client'

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

// Bandeau discret sous l'en-tête tant que l'appareil est hors connexion.
export function OfflineBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  if (!offline) return null

  return (
    <div role="status" className="fixed inset-x-0 top-14 z-30 flex items-center justify-center gap-1.5 border-b-[0.5px] border-[var(--kkb-border)] bg-[var(--kkb-bg)] px-4 py-2 text-center text-xs font-quicksand text-[var(--kkb-text-tertiary)] lg:left-60 lg:top-16 print:hidden">
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      Mode hors connexion · Données mises en cache
    </div>
  )
}
