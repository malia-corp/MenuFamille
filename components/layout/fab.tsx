'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'

// Visible seulement la ou "generer ma semaine" a un sens (accueil + menu),
// et uniquement sur mobile — le desktop a son propre bouton statique dans le
// bandeau d'actions (pas de FAB flottant la ou l'espace ne manque pas).
// Sur /plan, delegue a generateMenu() (state local a la page) via un evenement
// plutot qu'un contexte partage — la page ecoute 'kkb:generate-week'.
//
// Bouton flottant sticky : reste fixe par-dessus le contenu jusqu'a ce que son
// emplacement d'ancrage (<div id="generate-slot">, pose par la page elle-meme
// — present sur "/" et "/plan") defile a l'ecran, puis s'emboite a cet endroit
// (position: relative, dans le flux). Si une page n'a pas de #generate-slot,
// le FAB reste fixe en permanence.
export function FAB() {
  const pathname = usePathname()
  const router = useRouter()
  const [slotEl, setSlotEl] = useState<HTMLElement | null>(null)
  const [docked, setDocked] = useState(false)

  const show = pathname === '/' || pathname === '/plan'

  useEffect(() => {
    if (!show) return

    let intersectionObserver: IntersectionObserver | null = null
    let mutationObserver: MutationObserver | null = null

    function attach(el: HTMLElement) {
      setSlotEl(el)
      intersectionObserver = new IntersectionObserver(
        ([entry]) => setDocked(entry.isIntersecting),
        { rootMargin: '0px 0px -88px 0px' }
      )
      intersectionObserver.observe(el)
    }

    const existing = document.getElementById('generate-slot')
    if (existing) {
      attach(existing)
    } else {
      // La page peut etre en etat "chargement" au montage du FAB (global,
      // dans le layout) et ne poser le slot qu'une fois les donnees arrivees.
      mutationObserver = new MutationObserver(() => {
        const el = document.getElementById('generate-slot')
        if (el) {
          mutationObserver?.disconnect()
          attach(el)
        }
      })
      mutationObserver.observe(document.body, { childList: true, subtree: true })
    }

    return () => {
      intersectionObserver?.disconnect()
      mutationObserver?.disconnect()
      setSlotEl(null)
      setDocked(false)
    }
  }, [show, pathname])

  if (!show) return null

  function handleClick() {
    if (pathname === '/plan') {
      window.dispatchEvent(new CustomEvent('kkb:generate-week'))
    } else {
      router.push('/plan?generate=1')
    }
  }

  const button = (
    <button
      type="button"
      onClick={handleClick}
      className={
        docked
          ? 'relative w-full flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-white bg-[var(--kkb-coral)] shadow-[var(--kkb-shadow-fab)] transition-transform active:scale-[0.97]'
          : 'lg:hidden fixed z-[45] bottom-[88px] left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full px-4 py-2 text-white bg-[var(--kkb-coral)] shadow-[var(--kkb-shadow-fab)] transition-transform hover:scale-[1.03] active:scale-[0.97] whitespace-nowrap'
      }
    >
      <Zap className="h-4 w-4 shrink-0" />
      <span className="font-quicksand font-semibold text-[13px]">Générer ma semaine</span>
    </button>
  )

  return docked && slotEl ? createPortal(button, slotEl) : button
}
