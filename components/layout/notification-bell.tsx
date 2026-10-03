'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'

// Badge = avis reçus sur mes menus ces 7 derniers jours (pas de suivi "lu"
// côté base) ; s'il y en a, la cloche mène aux résultats des votes.
export function NotificationBell({ className }: { className: string }) {
  const router = useRouter()
  const [count, setCount] = useState(0)

  useEffect(() => {
    fetch('/api/surveys/unread-count')
      .then(r => (r.ok ? r.json() : { count: 0 }))
      .then((d: { count?: number }) => setCount(d.count ?? 0))
      .catch(() => {})
  }, [])

  const hasNew = count > 0

  return (
    <button
      type="button"
      onClick={() => router.push(hasNew ? '/votes/results' : '/settings/notifications')}
      aria-label={hasNew ? `${count} nouveaux avis` : 'Notifications'}
      className={`relative ${className} ${hasNew ? 'text-[var(--kkb-coral)]' : 'text-[var(--kkb-text-secondary)]'}`}
    >
      <Bell className="h-5 w-5" />
      {hasNew && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--kkb-coral)] text-white text-[10px] font-quicksand font-bold leading-4 text-center">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  )
}
