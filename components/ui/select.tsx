'use client'

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Search } from 'lucide-react'

export interface SelectOption<V extends string = string> {
  value: V
  label: string
}

interface SelectProps<V extends string> {
  value:        V
  onChange:     (value: V) => void
  options:      SelectOption<V>[]
  placeholder?: string // affiché quand value ne correspond à aucune option
  id?:          string
  ariaLabel?:   string
  searchable?:  boolean
  searchPlaceholder?: string
  size?:        'sm' | 'md'
  invalid?:     boolean
  className?:   string // déclencheur (largeur, fond…)
}

// Comparaison sans casse ni accents : « gouter » trouve « Goûter ».
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const PANEL_GAP = 6
const PANEL_MAX = 288

// Liste déroulante de la charte, avec recherche. Le panneau est rendu au
// niveau du document (position fixe) pour qu'aucune carte ne le rogne ; il
// s'ouvre vers le haut quand la place manque en bas.
export function Select<V extends string>({
  value, onChange, options, placeholder = 'Choisir…', id, ariaLabel,
  searchable = true, searchPlaceholder = 'Rechercher…', size = 'md', invalid = false, className = '',
}: SelectProps<V>) {
  const autoId    = useId()
  const listId    = `${autoId}-list`
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef   = useRef<HTMLDivElement>(null)
  const searchRef  = useRef<HTMLInputElement>(null)
  const listRef    = useRef<HTMLUListElement>(null)

  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const [active, setActive]   = useState(0)
  const [pos, setPos]         = useState<{ left: number; width: number; top?: number; bottom?: number; maxHeight: number } | null>(null)

  // Une option de valeur vide (« Aucune catégorie ») laisse voir le placeholder.
  const selected = options.find(o => o.value === value && o.value !== '')
  const filtered = useMemo(() => {
    const q = fold(query.trim())
    return q ? options.filter(o => fold(o.label).includes(q)) : options
  }, [options, query])

  const place = useCallback(() => {
    const t = triggerRef.current
    if (!t) return
    const r      = t.getBoundingClientRect()
    const below  = window.innerHeight - r.bottom - PANEL_GAP - 8
    const above  = r.top - PANEL_GAP - 8
    const width  = Math.max(r.width, 220)
    // Plus large que le déclencheur et trop près du bord droit : aligné sur sa droite.
    const left   = r.left + width > window.innerWidth - 8 ? Math.max(8, r.right - width) : r.left
    if (below >= Math.min(PANEL_MAX, 200) || below >= above) {
      setPos({ left, width, top: r.bottom + PANEL_GAP, maxHeight: Math.min(PANEL_MAX, below) })
    } else {
      setPos({ left, width, bottom: window.innerHeight - r.top + PANEL_GAP, maxHeight: Math.min(PANEL_MAX, above) })
    }
  }, [])

  function openPanel() {
    setQuery('')
    setActive(Math.max(0, options.findIndex(o => o.value === value)))
    place()
    setOpen(true)
  }

  function close(focusTrigger = true) {
    setOpen(false)
    if (focusTrigger) triggerRef.current?.focus()
  }

  function choose(o: SelectOption<V>) {
    onChange(o.value)
    close()
  }

  // Suit la page (défilement, redimensionnement) tant que c'est ouvert.
  useLayoutEffect(() => {
    if (!open) return
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, place])

  useEffect(() => {
    if (!open) return
    if (searchable) searchRef.current?.focus()
    else listRef.current?.focus()
    function onDown(e: PointerEvent) {
      const target = e.target as Node
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open, searchable])

  // Option active toujours visible.
  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  function onPanelKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(filtered.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0, i - 1)) }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0) }
    else if (e.key === 'End') { e.preventDefault(); setActive(filtered.length - 1) }
    else if (e.key === 'Enter') { e.preventDefault(); const o = filtered[active]; if (o) choose(o) }
    else if (e.key === 'Escape') { e.preventDefault(); close() }
    else if (e.key === 'Tab') { setOpen(false) }
  }

  function onTriggerKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openPanel() }
  }

  const sizeCls = size === 'sm' ? 'h-9 rounded-full pl-3.5 pr-8 text-xs' : 'h-11 rounded-[var(--kkb-r-md)] pl-3.5 pr-10 text-sm'
  const optionId = (i: number) => `${autoId}-opt-${i}`

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        onClick={() => (open ? close(false) : openPanel())}
        onKeyDown={onTriggerKey}
        className={`relative flex w-full items-center bg-white text-left font-quicksand font-semibold outline-none transition-[border-color,box-shadow] focus-visible:ring-2 focus-visible:ring-[var(--kkb-foret-300)] ${
          size === 'md' ? `border-[1.5px] ${invalid ? 'border-[var(--kkb-danger)]' : open ? 'border-[var(--kkb-foret-300)]' : 'border-[var(--kkb-filet)] hover:border-[var(--kkb-foret-300)]'}` : ''
        } ${sizeCls} ${className}`}
      >
        <span className={`min-w-0 flex-1 truncate ${selected ? 'text-[var(--kkb-profond)]' : 'font-normal text-[var(--kkb-texte-2)]'}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--kkb-texte-2)] transition-transform duration-200 ${open ? 'rotate-180' : ''} ${size === 'sm' ? 'right-2.5 h-3.5 w-3.5' : 'right-3 h-4 w-4'}`}
        />
      </button>

      {open && pos && createPortal(
        <div
          ref={panelRef}
          onKeyDown={onPanelKey}
          className="fixed z-[70] flex flex-col overflow-hidden rounded-[var(--kkb-r-lg)] border border-[var(--kkb-filet)] bg-white shadow-[0_12px_32px_rgba(31,58,46,0.14)] animate-in fade-in-0 zoom-in-95 motion-reduce:animate-none"
          style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight }}
        >
          {searchable && (
            <div className="relative shrink-0 border-b border-[var(--kkb-lin)] p-2">
              <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--kkb-texte-2)]" />
              <input
                ref={searchRef}
                type="text"
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={filtered[active] ? optionId(active) : undefined}
                aria-label={searchPlaceholder}
                value={query}
                onChange={e => { setQuery(e.target.value); setActive(0) }}
                placeholder={searchPlaceholder}
                className="h-10 w-full rounded-[var(--kkb-r-md)] bg-[var(--kkb-creme)] pl-9 pr-3 font-quicksand text-sm text-[var(--kkb-profond)] outline-none placeholder:text-[var(--kkb-texte-2)] focus:ring-2 focus:ring-[var(--kkb-foret-100)]"
              />
            </div>
          )}
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            tabIndex={searchable ? -1 : 0}
            aria-label={ariaLabel}
            aria-activedescendant={!searchable && filtered[active] ? optionId(active) : undefined}
            className="min-h-0 flex-1 overflow-y-auto p-1.5 outline-none"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center font-quicksand text-sm text-[var(--kkb-texte-2)]">Aucun résultat</li>
            ) : filtered.map((o, i) => {
              const isSelected = o.value === value
              return (
                <li
                  key={o.value}
                  id={optionId(i)}
                  data-index={i}
                  role="option"
                  aria-selected={isSelected}
                  onPointerMove={() => setActive(i)}
                  onClick={() => choose(o)}
                  className={`flex cursor-pointer items-center gap-2 rounded-[var(--kkb-r-sm)] px-3 py-2.5 font-quicksand text-sm transition-colors ${
                    i === active ? 'bg-[var(--kkb-foret-50)]' : ''
                  } ${isSelected ? 'font-bold text-[var(--kkb-foret)]' : 'text-[var(--kkb-profond)]'}`}
                >
                  <span className="min-w-0 flex-1">{o.label}</span>
                  {isSelected && <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--kkb-foret-500)]" />}
                </li>
              )
            })}
          </ul>
        </div>,
        document.body,
      )}
    </>
  )
}
