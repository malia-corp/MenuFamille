'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'

// Visible seulement la ou "generer ma semaine" a un sens (accueil + menu).
// Sur /plan, delegue a generateMenu() (state local a la page) via un evenement
// plutot qu'un contexte partage — la page ecoute 'kkb:generate-week'.
export function FAB() {
  const pathname = usePathname()
  const router = useRouter()

  if (pathname !== '/' && pathname !== '/plan') return null

  function handleClick() {
    if (pathname === '/plan') {
      window.dispatchEvent(new CustomEvent('kkb:generate-week'))
    } else {
      router.push('/plan?generate=1')
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="fixed z-[45] bottom-[88px] left-1/2 -translate-x-1/2 lg:left-[calc(50%+120px)] flex items-center gap-2 rounded-full px-7 py-3.5 text-white bg-[var(--kkb-coral)] shadow-[var(--kkb-shadow-fab)] transition-transform hover:scale-[1.03] active:scale-[0.97]"
    >
      <Zap className="h-[18px] w-[18px]" />
      <span className="font-quicksand font-bold text-[15px]">Générer ma semaine</span>
    </button>
  )
}
