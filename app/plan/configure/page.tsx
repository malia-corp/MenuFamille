'use client'

import { useEffect, useState } from 'react'
import { Lock, Clock, Settings } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface MealConfig {
  id: string
  meal_type: 'dejeuner' | 'diner' | 'petit_dejeuner' | 'gouter'
  is_active: boolean
  mode: 'daily' | 'template'
  display_order: number
  default_time: string | null
}

const MEAL_LABELS: Record<string, string> = {
  dejeuner: 'Déjeuner',
  diner: 'Dîner',
  petit_dejeuner: 'Petit-déjeuner',
  gouter: 'Goûter',
}

export default function ConfigurePage() {
  const [configs, setConfigs] = useState<MealConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/users/me/meal-config')
      .then((r) => r.json())
      .then((data) => {
        setConfigs(data)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Chargement…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-sm mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-terracotta" />
          <h1 className="text-xl font-bold text-gray-900">Types de repas</h1>
        </div>

        <p className="text-sm text-gray-500">
          Configure quels repas tu veux planifier chaque semaine.
        </p>

        <div className="space-y-3">
          {configs.map((config) => {
            const isLocked = config.meal_type === 'dejeuner'
            const isUpdating = updating === config.meal_type

            return (
              <div
                key={config.id}
                className="bg-white rounded-xl border border-gray-200 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {MEAL_LABELS[config.meal_type]}
                    </span>
                    {config.default_time && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="h-3 w-3" />
                        {config.default_time}
                      </span>
                    )}
                  </div>

                  {isLocked ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Toujours actif</span>
                      <Lock className="h-4 w-4 text-gray-300" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`active-${config.meal_type}`} className="text-xs text-gray-500 cursor-pointer">
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
                  <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                    <span className="text-xs text-gray-500 flex-1">Mode</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => update(config.meal_type, { mode: 'daily' })}
                        disabled={isUpdating}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          config.mode === 'daily'
                            ? 'bg-terracotta text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        Quotidien
                      </button>
                      <button
                        onClick={() => update(config.meal_type, { mode: 'template' })}
                        disabled={isUpdating}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          config.mode === 'template'
                            ? 'bg-african-gold text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
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

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-2 font-medium">Aperçu de ta grille</p>
          {activeCount === 0 ? (
            <p className="text-xs text-gray-400 italic">Active au moins un type de repas pour voir l&apos;aperçu.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {configs
                .filter((c) => c.is_active)
                .map((c) => (
                  <Badge key={c.id} variant="secondary" className="text-xs">
                    {MEAL_LABELS[c.meal_type]}
                    <span className="ml-1 text-gray-400">
                      {c.mode === 'template' ? '×1' : '×7'}
                    </span>
                  </Badge>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
