'use client'

import { useState } from 'react'
import { Copy, Eye, GitBranch, Loader2, Plus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { SimilarRecipe } from '@/lib/utils/recipe-similarity'

interface DuplicateDialogProps {
  duplicate:  SimilarRecipe
  busy:       boolean
  error:      string | null
  onUseExisting: () => void
  onVariant:  (label: string) => void
  onCreateAnyway: () => void
  onClose:    () => void
}

// Décision de cadrage n°1 : utiliser l'existante / créer une variante / créer quand même.
export function DuplicateDialog({ duplicate, busy, error, onUseExisting, onVariant, onCreateAnyway, onClose }: DuplicateDialogProps) {
  const [variantOpen, setVariantOpen] = useState(false)
  const [label, setLabel] = useState('')

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 lg:items-center lg:px-4" onClick={e => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="dup-title"
        className="w-full space-y-4 rounded-t-[var(--kkb-radius-card)] bg-white p-6 pb-8 shadow-xl lg:max-w-[480px] lg:rounded-[var(--kkb-radius-card)] lg:pb-6">
        <div className="space-y-1 text-center">
          <Copy className="mx-auto h-8 w-8 text-[var(--kkb-coral)]" />
          <h2 id="dup-title" className="font-dosis font-bold text-xl text-[var(--kkb-text-primary)]">Recette déjà connue ?</h2>
          <p className="text-sm font-quicksand text-[var(--kkb-text-secondary)]">Une recette semblable existe déjà dans le carnet.</p>
        </div>

        <div className="flex items-center gap-3 rounded-[var(--kkb-radius-sm)] border border-[var(--kkb-border)] p-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--kkb-radius-sm)] bg-[linear-gradient(135deg,var(--kkb-coral),var(--kkb-coral-hover))]">
            {duplicate.photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={duplicate.photo_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate font-dosis font-bold text-base text-[var(--kkb-text-primary)]">{duplicate.name}</p>
            <p className="text-xs font-quicksand text-[var(--kkb-text-tertiary)]">
              Ajoutée{duplicate.author_name ? ` par ${duplicate.author_name}` : ''} · {formatDistanceToNow(new Date(duplicate.created_at), { addSuffix: true, locale: fr })}
            </p>
            <span className="inline-block rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-warning-light)] px-2 py-0.5 text-[11px] font-quicksand font-bold text-[#B07A12]">
              {duplicate.similarity}% de similarité
            </span>
          </div>
        </div>

        {error && <p className="text-sm font-quicksand text-[var(--kkb-danger)]">{error}</p>}

        <div className="space-y-2">
          <button type="button" onClick={onUseExisting} disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral)] py-3 text-sm font-quicksand font-bold text-white disabled:opacity-60">
            <Eye className="h-4 w-4" /> Voir la recette existante
          </button>
          <p className="text-center text-[11px] font-quicksand text-[var(--kkb-text-tertiary)]">Elle sera ajoutée à tes favoris.</p>

          <button type="button" onClick={() => setVariantOpen(o => !o)} disabled={busy} aria-expanded={variantOpen}
            className="flex w-full items-center justify-center gap-2 rounded-[var(--kkb-radius-pill)] border-[1.5px] border-[var(--kkb-coral)] py-3 text-sm font-quicksand font-bold text-[var(--kkb-coral)] disabled:opacity-60">
            <GitBranch className="h-4 w-4" /> Créer comme variante…
          </button>
          {variantOpen && (
            <div className="flex gap-2">
              <input autoFocus value={label} onChange={e => setLabel(e.target.value)} placeholder="Libellé distinctif (ex. sans piment)" aria-label="Libellé de la variante"
                className="min-w-0 flex-1 rounded-[var(--kkb-radius-sm)] border border-[var(--kkb-border)] px-3 py-2.5 text-sm font-quicksand outline-none focus:border-[var(--kkb-coral)]" />
              <button type="button" onClick={() => onVariant(label.trim())} disabled={busy || !label.trim()}
                className="shrink-0 rounded-[var(--kkb-radius-sm)] bg-[var(--kkb-coral)] px-4 text-sm font-quicksand font-bold text-white disabled:opacity-50">
                Créer
              </button>
            </div>
          )}

          <button type="button" onClick={onCreateAnyway} disabled={busy}
            className="flex w-full items-center justify-center gap-2 py-2.5 text-sm font-quicksand font-bold text-[var(--kkb-text-secondary)] hover:text-[var(--kkb-coral)] disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Créer quand même
          </button>
        </div>
      </div>
    </div>
  )
}
