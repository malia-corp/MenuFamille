'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

// Numéros affichés : 1 … (p-1) p (p+1) … N
function pageNumbers(page: number, count: number): (number | 'gap')[] {
  const set = new Set([1, count, page - 1, page, page + 1].filter(n => n >= 1 && n <= count))
  const sorted = Array.from(set).sort((a, b) => a - b)
  const out: (number | 'gap')[] = []
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push('gap')
    out.push(n)
  })
  return out
}

export function Pagination({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (p: number) => void }) {
  if (pageCount <= 1) return null
  const btn = 'flex h-9 min-w-[36px] items-center justify-center rounded-[var(--kkb-radius-sm)] px-2 text-sm font-quicksand font-bold transition-colors'
  return (
    <nav className="flex items-center gap-1.5" aria-label="Pagination">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Page précédente"
        className={`${btn} border border-[var(--kkb-border)] bg-white text-[var(--kkb-text-secondary)] disabled:opacity-40`}>
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pageNumbers(page, pageCount).map((n, i) => n === 'gap' ? (
        <span key={`gap-${i}`} className="px-1 text-[var(--kkb-text-tertiary)]">…</span>
      ) : (
        <button key={n} type="button" onClick={() => onChange(n)} aria-current={n === page ? 'page' : undefined}
          className={`${btn} ${n === page ? 'bg-[var(--kkb-coral)] text-white' : 'border border-[var(--kkb-border)] bg-white text-[var(--kkb-text-secondary)] hover:border-[var(--kkb-coral)]'}`}>
          {n}
        </button>
      ))}
      <button type="button" disabled={page >= pageCount} onClick={() => onChange(page + 1)} aria-label="Page suivante"
        className={`${btn} border border-[var(--kkb-border)] bg-white text-[var(--kkb-text-secondary)] disabled:opacity-40`}>
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  )
}
