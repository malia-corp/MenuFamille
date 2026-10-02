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
    let currentEl: HTMLElement | null = null

    function attach(el: HTMLElement) {
      intersectionObserver?.disconnect()
      currentEl = el
      setSlotEl(el)
      intersectionObserver = new IntersectionObserver(
        ([entry]) => setDocked(entry.isIntersecting),
        { rootMargin: '0px 0px -88px 0px' }
      )
      intersectionObserver.observe(el)
    }

    function detach() {
      intersectionObserver?.disconnect()
      intersectionObserver = null
      currentEl = null
      setSlotEl(null)
      setDocked(false)
    }

    // Verifie en continu (pas juste au montage) que #generate-slot est
    // toujours le MEME element DOM : une page comme /plan le demonte et le
    // remonte (ex. overlay de generation, changement de semaine), ce qui
    // laissait l'IntersectionObserver attache a un noeud detache — le FAB
    // restait alors coince en mode flottant et ne se redockait plus jamais.
    function checkSlot() {
      const el = document.getElementById('generate-slot')
      if (el && el !== currentEl) attach(el)
      else if (!el && currentEl) detach()
    }

    checkSlot()
    const mutationObserver = new MutationObserver(checkSlot)
    mutationObserver.observe(document.body, { childList: true, subtree: true })

    return () => {
      intersectionObserver?.disconnect()
      mutationObserver.disconnect()
      currentEl = null
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

  // Sur /plan, le bouton d'ancrage (en haut de page) est plus discret —
  // petit et aligne a gauche plutot que pleine largeur. Sa version flottante
  // (apres defilement) reste a gauche : c'est le bouton "Passer a ..." de la
  // page qui se contracte et glisse a droite en miroir (meme bottom-[88px]),
  // les deux animes pour atterrir cote a cote plutot que de se superposer.
  const isPlan = pathname === '/plan'

  const dockedClass = isPlan
    ? 'relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-white bg-[var(--kkb-coral)] shadow-[var(--kkb-shadow-fab)] transition-transform active:scale-[0.97]'
    : 'relative w-full flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-white bg-[var(--kkb-coral)] shadow-[var(--kkb-shadow-fab)] transition-transform active:scale-[0.97]'

  // h-[40px] explicite (pas py-2) sur /plan pour matcher exactement la
  // hauteur du bouton compact "Passer a ..." (meme bottom-[88px]) — avec
  // des hauteurs fixees par le padding de part et d'autre, les deux boutons
  // n'etaient pas rendus a la meme hauteur malgre le meme `bottom`.
  const floatingClass = isPlan
    ? 'lg:hidden fixed z-[45] bottom-[88px] left-4 h-[40px] flex items-center gap-1 px-3.5 rounded-full text-white bg-[var(--kkb-coral)] shadow-[var(--kkb-shadow-fab)] transition-transform hover:scale-[1.03] active:scale-[0.97] whitespace-nowrap'
    : 'lg:hidden fixed z-[45] bottom-[88px] left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full px-4 py-2 text-white bg-[var(--kkb-coral)] shadow-[var(--kkb-shadow-fab)] transition-transform hover:scale-[1.03] active:scale-[0.97] whitespace-nowrap'

  const button = (
    <button
      type="button"
      onClick={handleClick}
      className={docked ? dockedClass : floatingClass}
    >
      <Zap className={isPlan ? 'h-3.5 w-3.5 shrink-0' : 'h-4 w-4 shrink-0'} />
      <span className={`font-quicksand font-semibold ${isPlan ? 'text-[12px]' : 'text-[13px]'}`}>
        Générer ma semaine
      </span>
    </button>
  )

  return docked && slotEl ? createPortal(button, slotEl) : button
}
