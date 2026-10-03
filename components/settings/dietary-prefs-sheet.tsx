'use client'

import { useState } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
import { toast } from '@/lib/stores/toast-store'
import { PREF_TYPE_OPTIONS, prefChipStyle, type Pref, type PrefType, type Severity } from '@/lib/constants/dietary-pref'

interface DietaryPrefsSheetProps {
  prefs:    Pref[]
  onChange: (prefs: Pref[]) => void
  onClose:  () => void
}

// Feuille du bas : ses propres préférences alimentaires (saisie libre +
// type), suppression d'une puce au clic.
export function DietaryPrefsSheet({ prefs, onChange, onClose }: DietaryPrefsSheetProps) {
  const [value,    setValue]    = useState('')
  const [type,     setType]     = useState<PrefType>('allergy')
  const [severity, setSeverity] = useState<Severity>('strict')
  const [saving,   setSaving]   = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  async function add() {
    if (!value.trim() || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/users/me/dietary-prefs', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ pref_type: type, value: value.trim(), severity: type === 'allergy' ? severity : undefined }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.id) { toast.error(data?.error ?? 'Erreur de connexion'); return }
      onChange([...prefs.filter(p => p.id !== data.id), data])
      setValue('')
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    setRemoving(id)
    try {
      const res = await fetch(`/api/users/me/dietary-prefs/${id}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('Impossible de supprimer'); return }
      onChange(prefs.filter(p => p.id !== id))
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setRemoving(null)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-label="Préférences alimentaires"
        className="fixed bottom-0 left-0 right-0 z-[61] max-h-[85vh] space-y-4 overflow-y-auto rounded-t-3xl bg-white p-5 lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:w-[440px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-3xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="font-dosis text-base font-bold text-[var(--kkb-text-primary)]">Préférences alimentaires</p>
            <p className="font-quicksand text-xs text-[var(--kkb-text-tertiary)]">Prises en compte lors de la génération du menu.</p>
          </div>
          <button type="button" onClick={onClose} className="-mr-1 p-1 text-[var(--kkb-text-tertiary)]" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {prefs.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {prefs.map(p => {
              const { className, Icon } = prefChipStyle(p)
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => void remove(p.id)}
                  disabled={removing === p.id}
                  aria-label={`Retirer ${p.value}`}
                  className={`inline-flex items-center gap-1 rounded-[var(--kkb-radius-pill)] border px-2.5 py-1 font-quicksand text-xs font-semibold disabled:opacity-50 ${className}`}
                >
                  {Icon && <Icon className="h-3 w-3" />}
                  {p.value}
                  <X className="h-3 w-3 opacity-60" />
                </button>
              )
            })}
          </div>
        ) : (
          <p className="font-quicksand text-sm italic text-[var(--kkb-text-tertiary)]">Aucune préférence renseignée pour l&apos;instant.</p>
        )}

        <div className="space-y-3 border-t border-[var(--kkb-border-light)] pt-4">
          <input
            type="text"
            placeholder="Ingrédient ou plat (ex : arachide, piment…)"
            aria-label="Ingrédient ou plat"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void add() }}
            className="w-full rounded-xl border border-[var(--kkb-border)] bg-[var(--kkb-bg)] px-3 py-2.5 font-quicksand text-sm text-[var(--kkb-text-primary)] outline-none placeholder:text-[var(--kkb-text-tertiary)] focus:border-[var(--kkb-coral-hover)]"
          />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PREF_TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={`rounded-xl border py-2 font-quicksand text-xs font-medium transition-colors ${
                  type === opt.value
                    ? 'border-[var(--kkb-coral)] bg-[var(--kkb-coral)] text-white'
                    : 'border-[var(--kkb-border)] bg-white text-[var(--kkb-text-secondary)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {type === 'allergy' && (
            <div className="flex gap-2">
              {([['strict', 'Sévère (exclure)'], ['light', 'Légère (éviter)']] as const).map(([s, label]) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  className={`flex-1 rounded-xl border py-2 font-quicksand text-xs font-medium transition-colors ${
                    severity === s
                      ? 'border-[var(--kkb-danger)] bg-[var(--kkb-danger-light)] text-[var(--kkb-danger)]'
                      : 'border-[var(--kkb-border)] bg-white text-[var(--kkb-text-secondary)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => void add()}
            disabled={!value.trim() || saving}
            className="flex w-full items-center justify-center gap-1.5 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral)] py-3 font-quicksand text-sm font-bold text-white transition-colors hover:bg-[var(--kkb-coral-hover)] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Ajouter
          </button>
        </div>
      </div>
    </>
  )
}
