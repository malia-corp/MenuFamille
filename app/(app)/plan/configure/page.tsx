'use client'

import { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { MEAL_LABEL as MEAL_LABELS, MEAL_EMOJI, MEAL_COLOR, type MealType } from '@/lib/constants/meal-type'

interface MealConfig {
  id: string
  meal_type: MealType
  is_active: boolean
  mode: 'daily' | 'template'
  display_order: number
  default_time: string | null
}

function mealVisual(mealType: MealType) {
  return { emoji: MEAL_EMOJI[mealType], color: MEAL_COLOR[mealType].text, bg: MEAL_COLOR[mealType].bg }
}

export default function ConfigurePage() {
  const [configs, setConfigs] = useState<MealConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/users/me/meal-config')
      .then(async (r) => {
        const data = await r.json()
        if (r.ok && Array.isArray(data)) {
          setConfigs(data)
        } else {
          setError(data?.error ?? 'Erreur de chargement')
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Impossible de charger la configuration')
        setLoading(false)
      })
  }, [])

  async function update(meal_type: string, patch: { is_active?: boolean; mode?: 'daily' | 'template' }) {
    setUpdating(meal_type)
    const res = await fetch('/api/users/me/meal-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meal_type, ...patch }),
    })
    if (res.ok) {
      const updated = await res.json()
      setConfigs((prev) => prev.map((c) => (c.meal_type === meal_type ? updated : c)))
    }
    setUpdating(null)
  }

  const activeCount = configs.filter((c) => c.is_active).length

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4">
        <p className="text-sm text-red-600 font-quicksand text-center">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-xs text-[var(--kkb-coral)] underline font-quicksand"
        >
          Réessayer
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-[var(--kkb-text-tertiary)]">Chargement…</p>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-6 space-y-6">
      <div className="space-y-1">
        <h1 className="font-dosis font-bold text-xl text-[var(--kkb-text-primary)]">Types de repas</h1>
        <p className="text-sm text-[var(--kkb-text-secondary)] font-quicksand">
          Configure quels repas tu veux planifier chaque semaine.
        </p>
      </div>

      <div className="space-y-3">
        {configs.map((config) => {
          const isLocked = config.meal_type === 'dejeuner'
          const isUpdating = updating === config.meal_type
          const visual = mealVisual(config.meal_type)

          return (
            <div
              key={config.id}
              className="rounded-xl border border-[var(--kkb-border)] p-4 space-y-3"
              style={{ backgroundColor: visual.bg }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{visual.emoji}</span>
                  <div>
                    <p className="font-dosis font-semibold text-[var(--kkb-text-primary)]">
                      {MEAL_LABELS[config.meal_type]}
                    </p>
                    {config.default_time && (
                      <p className="text-xs text-[var(--kkb-text-tertiary)] font-quicksand">{config.default_time}</p>
                    )}
                  </div>
                </div>

                {isLocked ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[var(--kkb-text-tertiary)] font-quicksand">Toujours actif</span>
                    <Lock className="h-3.5 w-3.5 text-[var(--kkb-text-tertiary)]" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={`active-${config.meal_type}`}
                      className="text-xs text-[var(--kkb-text-secondary)] cursor-pointer font-quicksand"
                    >
                      {config.is_active ? 'Actif' : 'Inactif'}
                    </Label>
                    <Switch
                      id={`active-${config.meal_type}`}
                      checked={config.is_active}
                      disabled={isUpdating}
                      onCheckedChange={(checked) => update(config.meal_type, { is_active: checked })}
                    />
                  </div>
                )}
              </div>

              {config.is_active && (
                <div className="flex items-center gap-2 pt-1 border-t border-black/5">
                  <span className="text-xs text-[var(--kkb-text-tertiary)] flex-1 font-quicksand">Mode</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => update(config.meal_type, { mode: 'daily' })}
                      disabled={isUpdating}
                      className="px-3 py-1 rounded-full text-xs font-medium font-quicksand transition-colors"
                      style={
                        config.mode === 'daily'
                          ? { backgroundColor: visual.color, color: '#fff' }
                          : { backgroundColor: 'rgba(0,0,0,0.06)', color: 'var(--kkb-text-secondary)' }
                      }
                    >
                      Quotidien
                    </button>
                    <button
                      type="button"
                      onClick={() => update(config.meal_type, { mode: 'template' })}
                      disabled={isUpdating}
                      className="px-3 py-1 rounded-full text-xs font-medium font-quicksand transition-colors"
                      style={
                        config.mode === 'template'
                          ? { backgroundColor: visual.color, color: '#fff' }
                          : { backgroundColor: 'rgba(0,0,0,0.06)', color: 'var(--kkb-text-secondary)' }
                      }
                    >
                      Modèle semaine
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Aperçu grille */}
      <div className="bg-white rounded-xl border border-[var(--kkb-border)] p-4">
        <p className="text-xs text-[var(--kkb-text-tertiary)] uppercase tracking-widest font-medium mb-2">Aperçu de ta grille</p>
        {activeCount === 0 ? (
          <p className="text-xs text-[var(--kkb-text-tertiary)] italic font-quicksand">
            Active au moins un type de repas pour voir l&apos;aperçu.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {configs
              .filter((c) => c.is_active)
              .map((c) => {
                const v = mealVisual(c.meal_type)
                return (
                  <Badge
                    key={c.id}
                    variant="secondary"
                    className="text-xs font-quicksand"
                    style={{ backgroundColor: v.bg, color: v.color, border: `1px solid ${v.color}30` }}
                  >
                    {v.emoji} {MEAL_LABELS[c.meal_type]}
                    <span className="ml-1 opacity-60">
                      {c.mode === 'template' ? '×1' : '×7'}
                    </span>
                  </Badge>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}
