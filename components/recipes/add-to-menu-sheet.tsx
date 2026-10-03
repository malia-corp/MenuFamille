'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { MEAL_LABEL, type MealType } from '@/lib/constants/meal-type'
import { DAY_OPTIONS, getMondayISO, shiftWeek, type DayOfWeek } from '@/lib/utils/week'

interface MealConfigItem { meal_type: MealType; label: string }

// Ajoute une recette à un créneau (semaine, jour, repas) du menu de l'utilisateur.
export function AddToMenuSheet({ recipeId, open, onClose }: { recipeId: string; open: boolean; onClose: () => void }) {
  const [week,       setWeek]       = useState<'current' | 'next'>('current')
  const [day,        setDay]        = useState<DayOfWeek | ''>('')
  const [meal,       setMeal]       = useState<MealType | ''>('')
  const [mealConfig, setMealConfig] = useState<MealConfigItem[] | null>(null)
  const [saving,     setSaving]     = useState(false)
  const [done,       setDone]       = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setDone(false)
    setError(null)
    if (mealConfig) return
    fetch('/api/users/me/meal-config')
      .then(r => r.json())
      .then((data: unknown) => {
        const active = (Array.isArray(data) ? data : [])
          .filter((c: { is_active?: boolean }) => c.is_active !== false)
          .map((c: { meal_type: MealType }) => ({ meal_type: c.meal_type, label: MEAL_LABEL[c.meal_type] ?? c.meal_type }))
        setMealConfig(active)
        if (active.length > 0) setMeal(m => m || active[0].meal_type)
      })
      .catch(() => setMealConfig([]))
  }, [open, mealConfig])

  async function confirm() {
    if (!day || !meal) return
    setSaving(true)
    setError(null)
    try {
      const weekStart = week === 'current' ? getMondayISO() : shiftWeek(getMondayISO(), 1)
      const planRes = await fetch(`/api/meal-plans?week=${weekStart}`)
      const plan = await planRes.json()
      if (!planRes.ok || !plan.id) throw new Error('Plan introuvable')
      const itemRes = await fetch(`/api/meal-plans/${plan.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day_of_week: day, meal_type: meal, recipe_id: recipeId }),
      })
      if (!itemRes.ok) throw new Error((await itemRes.json()).error ?? 'Erreur')
      setDone(true)
      setTimeout(onClose, 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const choice = (active: boolean) =>
    `rounded-[var(--kkb-radius-pill)] border px-3 py-1.5 text-xs font-quicksand font-bold transition-colors ${
      active ? 'border-[var(--kkb-coral)] bg-[var(--kkb-coral)] text-white' : 'border-[var(--kkb-border)] text-[var(--kkb-text-secondary)]'
    }`

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6 lg:items-center print:hidden" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div role="dialog" aria-modal="true" aria-label="Ajouter à mon menu" className="w-full max-w-sm space-y-4 rounded-[var(--kkb-radius-card)] bg-white p-5 shadow-xl">
        <p className="font-dosis font-bold text-lg text-[var(--kkb-text-primary)]">Ajouter à mon menu</p>

        <div className="space-y-1.5">
          <p className="text-[11px] font-quicksand font-bold uppercase tracking-wide text-[var(--kkb-text-tertiary)]">Semaine</p>
          <div className="flex gap-2">
            {([['current', 'Cette semaine'], ['next', 'Semaine prochaine']] as const).map(([v, label]) => (
              <button key={v} type="button" onClick={() => setWeek(v)} className={`flex-1 ${choice(week === v)}`}>{label}</button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] font-quicksand font-bold uppercase tracking-wide text-[var(--kkb-text-tertiary)]">Jour</p>
          <div className="flex flex-wrap gap-1.5">
            {DAY_OPTIONS.map(d => <button key={d.val} type="button" onClick={() => setDay(d.val)} className={choice(day === d.val)}>{d.label}</button>)}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] font-quicksand font-bold uppercase tracking-wide text-[var(--kkb-text-tertiary)]">Repas</p>
          <div className="flex flex-wrap gap-1.5">
            {(mealConfig ?? []).map(m => <button key={m.meal_type} type="button" onClick={() => setMeal(m.meal_type)} className={choice(meal === m.meal_type)}>{m.label}</button>)}
          </div>
        </div>

        {error && <p className="text-xs font-quicksand text-[var(--kkb-danger)]">{error}</p>}

        {done ? (
          <p className="flex items-center justify-center gap-1.5 text-sm font-quicksand font-bold text-[var(--kkb-success)]">
            <Check className="h-4 w-4" /> Recette ajoutée au menu !
          </p>
        ) : (
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-[var(--kkb-radius-pill)] border border-[var(--kkb-border)] py-3 text-sm font-quicksand font-bold text-[var(--kkb-text-secondary)]">Annuler</button>
            <button type="button" onClick={() => void confirm()} disabled={!day || !meal || saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral)] py-3 text-sm font-quicksand font-bold text-white disabled:opacity-60">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Confirmer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
