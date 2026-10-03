'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronDown, Key, Loader2, PlusCircle, Search, Users } from 'lucide-react'

export interface SwitcherCircle {
  id:                     string
  name:                   string
  family_circle_members?: unknown[]
  my_is_active?:          boolean
}

interface CircleSwitcherProps {
  circles:    SwitcherCircle[]
  selectedId: string          // cercle consulté
  activeId:   string | null   // cercle actif (activation explicite, ailleurs)
  onSelect:   (id: string) => Promise<void>
  // Contenu du bouton (nom du cercle + méta), propre à chaque mise en page.
  children: React.ReactNode
  className?: string
}

// Sélection du cercle à consulter : liste déroulante (uniquement les cercles
// de l'utilisateur, cf. GET /api/circles) avec recherche par nom. Choisir un
// cercle l'affiche sans l'activer ; l'activation est une action à part.
export function CircleSwitcher({ circles, selectedId, activeId, onSelect, children, className = '' }: CircleSwitcherProps) {
  const [open,     setOpen]     = useState(false)
  const [query,    setQuery]    = useState('')
  const [pending,  setPending]  = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const q = query.trim().toLowerCase()
  const visible = q ? circles.filter((c) => c.name.toLowerCase().includes(q)) : circles

  async function choose(id: string) {
    if (id === selectedId) { setOpen(false); return }
    setPending(id)
    try {
      await onSelect(id)
      setOpen(false)
      setQuery('')
    } finally {
      setPending(null)
    }
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex w-full items-center gap-2 text-left"
      >
        <span className="min-w-0 flex-1">{children}</span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-[var(--kkb-text-tertiary)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white shadow-[var(--kkb-shadow-card)] lg:right-auto lg:w-80">
          <div className="border-b border-[var(--kkb-border-light)] p-2">
            <label className="flex items-center gap-2 rounded-[var(--kkb-radius-sm)] bg-[var(--kkb-bg)] px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-[var(--kkb-text-tertiary)]" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un cercle…"
                aria-label="Rechercher un cercle"
                className="w-full bg-transparent font-quicksand text-sm text-[var(--kkb-text-primary)] outline-none placeholder:text-[var(--kkb-text-tertiary)]"
              />
            </label>
          </div>

          <p className="px-4 pb-1 pt-3 font-quicksand text-[10px] font-bold uppercase tracking-wider text-[var(--kkb-text-tertiary)]">Mes cercles</p>
          <ul role="listbox" className="max-h-64 overflow-y-auto pb-1">
            {visible.map((c) => {
              const selected = c.id === selectedId
              const active   = c.id === activeId
              const disabled = c.my_is_active === false
              const count    = c.family_circle_members?.length ?? 0
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => void choose(c.id)}
                    disabled={pending !== null}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--kkb-bg)] ${selected ? 'bg-[var(--kkb-coral-light)]/50' : ''}`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--kkb-teal-light)]">
                      <Users className="h-4 w-4 text-[var(--kkb-teal)]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-quicksand text-sm font-bold text-[var(--kkb-text-primary)]">{c.name}</span>
                      <span className="block font-quicksand text-xs text-[var(--kkb-text-tertiary)]">
                        {disabled ? 'Accès désactivé' : `${count} ${count > 1 ? 'membres' : 'membre'}`}
                      </span>
                    </span>
                    {pending === c.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[var(--kkb-coral)]" />
                    ) : (
                      <span className="flex shrink-0 items-center gap-1.5">
                        {active && (
                          <span className="rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-success-light)] px-2 py-0.5 font-quicksand text-[10px] font-bold text-[var(--kkb-success)]">Actif</span>
                        )}
                        {disabled && (
                          <span className="rounded-[var(--kkb-radius-pill)] border border-[var(--kkb-border)] bg-[var(--kkb-bg)] px-2 py-0.5 font-quicksand text-[10px] font-bold text-[var(--kkb-text-tertiary)]">Désactivé</span>
                        )}
                        {selected && <Check className="h-4 w-4 text-[var(--kkb-coral)]" aria-label="Consulté" />}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
            {visible.length === 0 && (
              <li className="px-4 py-3 font-quicksand text-sm italic text-[var(--kkb-text-tertiary)]">Aucun cercle ne correspond</li>
            )}
          </ul>

          <div className="grid grid-cols-2 border-t border-[var(--kkb-border-light)]">
            <Link href="/circle/create" className="flex items-center justify-center gap-1.5 py-3 font-quicksand text-xs font-bold text-[var(--kkb-coral)] hover:bg-[var(--kkb-coral-light)]">
              <PlusCircle className="h-4 w-4" /> Créer un cercle
            </Link>
            <Link href="/circle/join" className="flex items-center justify-center gap-1.5 border-l border-[var(--kkb-border-light)] py-3 font-quicksand text-xs font-bold text-[var(--kkb-teal)] hover:bg-[var(--kkb-teal-light)]">
              <Key className="h-4 w-4" /> Rejoindre
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
