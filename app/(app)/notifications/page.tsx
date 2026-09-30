'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, Info, Save } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type MealType = 'petit_dejeuner' | 'dejeuner' | 'gouter' | 'diner'

interface MealConfig {
  meal_type:     MealType
  is_active:     boolean
  display_order: number
  default_time:  string
}

interface NotifPref {
  meal_type:          MealType
  reminder_enabled:   boolean
  reminder_time:      string | null
  days_of_week:       number[]
  feedback_enabled:   boolean
  feedback_delay_min: number
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const MEAL_LABEL: Record<MealType, string> = {
  petit_dejeuner: 'Petit-déjeuner',
  dejeuner:       'Déjeuner',
  gouter:         'Goûter',
  diner:          'Dîner',
}

const MEAL_EMOJI: Record<MealType, string> = {
  petit_dejeuner: '🌅',
  dejeuner:       '🍽',
  gouter:         '🧁',
  diner:          '🌙',
}

const DAYS = [
  { label: 'L', value: 1 },
  { label: 'M', value: 2 },
  { label: 'M', value: 3 },
  { label: 'J', value: 4 },
  { label: 'V', value: 5 },
  { label: 'S', value: 6 },
  { label: 'D', value: 7 },
]

const DELAYS = [
  { label: '30 min', value: 30 },
  { label: '1 h',   value: 60 },
  { label: '2 h',   value: 120 },
  { label: '3 h',   value: 180 },
]

const DEFAULT_PREF = (mealType: MealType, defaultTime: string): NotifPref => ({
  meal_type:          mealType,
  reminder_enabled:   false,
  reminder_time:      defaultTime,
  days_of_week:       [1, 2, 3, 4, 5, 6, 7],
  feedback_enabled:   false,
  feedback_delay_min: 120,
})

// ─── Push helpers ─────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw.js')
    return reg
  } catch {
    return null
  }
}

async function subscribePush(): Promise<PushSubscription | null> {
  const reg = await registerServiceWorker()
  if (!reg) return null
  try {
    const existing = await reg.pushManager.getSubscription()
    if (existing) return existing
    return await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    })
  } catch {
    return null
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const router = useRouter()

  const [configs, setConfigs] = useState<MealConfig[]>([])
  const [prefs,   setPrefs]   = useState<Record<MealType, NotifPref>>({} as Record<MealType, NotifPref>)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [configRes, prefRes] = await Promise.all([
        fetch('/api/users/me/meal-config'),
        fetch('/api/users/me/notification-prefs'),
      ])

      const configData: MealConfig[] = configRes.ok ? await configRes.json() : []
      const prefData:   NotifPref[]  = prefRes.ok   ? await prefRes.json()   : []

      setConfigs(configData.filter(c => c.is_active))

      const prefMap = {} as Record<MealType, NotifPref>
      for (const c of configData.filter(c => c.is_active)) {
        const existing = prefData.find(p => p.meal_type === c.meal_type)
        prefMap[c.meal_type] = existing ?? DEFAULT_PREF(c.meal_type, c.default_time)
      }
      setPrefs(prefMap)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  function updatePref(mealType: MealType, patch: Partial<NotifPref>) {
    setPrefs(prev => ({ ...prev, [mealType]: { ...prev[mealType], ...patch } }))
    setSaved(false)
  }

  function toggleDay(mealType: MealType, day: number) {
    const current = prefs[mealType]?.days_of_week ?? [1, 2, 3, 4, 5, 6, 7]
    const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day]
    updatePref(mealType, { days_of_week: next.length > 0 ? next : current })
  }

  async function handleReminderToggle(mealType: MealType, on: boolean) {
    if (on) {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        alert('Autorisez les notifications dans les paramètres de votre navigateur.')
        return
      }
      const sub = await subscribePush()
      if (sub) {
        const p256dh = btoa(String.fromCharCode(...Array.from(new Uint8Array(sub.getKey('p256dh')!))))
        const auth   = btoa(String.fromCharCode(...Array.from(new Uint8Array(sub.getKey('auth')!))))
        await fetch('/api/push/subscribe', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ endpoint: sub.endpoint, keys: { p256dh, auth } }),
        })
      }
    }
    updatePref(mealType, { reminder_enabled: on })
  }

  async function handleSave() {
    setSaving(true)
    try {
      const rows = Object.values(prefs)
      const res = await fetch('/api/users/me/notification-prefs', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(rows),
      })
      if (res.ok) setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-5 w-5 border-2 border-[var(--mf-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDF6EE] pb-28">
      {/* Header */}
      <div className="sticky top-14 z-30 bg-[#FDF6EE] border-b border-[#E8C99A] px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={() => router.back()} className="p-1 -ml-1 text-[#5A4A43]">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-terracotta" />
          <h1 className="font-dosis font-bold text-base text-[#2C1810]">Notifications</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-6">

        {/* Section rappels */}
        <div>
          <p className="text-[11px] font-quicksand font-bold uppercase tracking-wider text-[var(--mf-text-tertiary)] mb-3">
            Rappels de repas
          </p>
          <div className="space-y-3">
            {configs.map(cfg => {
              const pref = prefs[cfg.meal_type]
              if (!pref) return null

              return (
                <div key={cfg.meal_type} className="bg-white border border-[#EDE4D6] rounded-2xl p-4 space-y-3">
                  {/* Ligne titre + toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{MEAL_EMOJI[cfg.meal_type]}</span>
                      <span className="font-dosis font-semibold text-sm text-[#2C1810]">
                        {MEAL_LABEL[cfg.meal_type]}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleReminderToggle(cfg.meal_type, !pref.reminder_enabled)}
                      className={[
                        'relative w-10 h-6 rounded-full transition-colors',
                        pref.reminder_enabled ? 'bg-[var(--mf-primary)]' : 'bg-[#D9CFC5]',
                      ].join(' ')}
                      aria-label={pref.reminder_enabled ? 'Désactiver' : 'Activer'}
                    >
                      <span className={[
                        'absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform',
                        pref.reminder_enabled ? 'translate-x-4' : 'translate-x-0',
                      ].join(' ')} />
                    </button>
                  </div>

                  {/* Détails — visibles si actif */}
                  {pref.reminder_enabled && (
                    <div className="space-y-3 pt-1 border-t border-[#EDE4D6]">
                      {/* Heure */}
                      <div>
                        <p className="text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--mf-text-tertiary)] mb-1">
                          Heure du rappel
                        </p>
                        <input
                          type="time"
                          value={pref.reminder_time ?? cfg.default_time}
                          onChange={e => updatePref(cfg.meal_type, { reminder_time: e.target.value })}
                          className="font-quicksand text-sm text-[#3D2C20] bg-[#FDF6EE] border border-[#EDE4D6] rounded-lg px-3 py-1.5 outline-none"
                        />
                      </div>

                      {/* Jours */}
                      <div>
                        <p className="text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--mf-text-tertiary)] mb-1.5">
                          Jours
                        </p>
                        <div className="flex gap-1.5">
                          {DAYS.map((d, i) => {
                            const active = pref.days_of_week.includes(d.value)
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => toggleDay(cfg.meal_type, d.value)}
                                className={[
                                  'w-8 h-8 rounded-full text-xs font-quicksand font-semibold transition-all',
                                  active
                                    ? 'bg-[var(--mf-primary)] text-white'
                                    : 'bg-[#FDF6EE] text-[var(--mf-text-tertiary)] border border-[#EDE4D6]',
                                ].join(' ')}
                              >
                                {d.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Section feedback */}
        <div>
          <p className="text-[11px] font-quicksand font-bold uppercase tracking-wider text-[var(--mf-text-tertiary)] mb-3">
            Demandes d&apos;avis post-repas
          </p>
          <div className="space-y-3">
            {configs.map(cfg => {
              const pref = prefs[cfg.meal_type]
              if (!pref) return null

              return (
                <div key={cfg.meal_type} className="bg-white border border-[#EDE4D6] rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{MEAL_EMOJI[cfg.meal_type]}</span>
                      <span className="font-dosis font-semibold text-sm text-[#2C1810]">
                        {MEAL_LABEL[cfg.meal_type]}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => updatePref(cfg.meal_type, { feedback_enabled: !pref.feedback_enabled })}
                      className={[
                        'relative w-10 h-6 rounded-full transition-colors',
                        pref.feedback_enabled ? 'bg-[var(--mf-primary)]' : 'bg-[#D9CFC5]',
                      ].join(' ')}
                      aria-label={pref.feedback_enabled ? 'Désactiver' : 'Activer'}
                    >
                      <span className={[
                        'absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform',
                        pref.feedback_enabled ? 'translate-x-4' : 'translate-x-0',
                      ].join(' ')} />
                    </button>
                  </div>

                  {pref.feedback_enabled && (
                    <div className="space-y-2 pt-1 border-t border-[#EDE4D6]">
                      <p className="text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--mf-text-tertiary)]">
                        Délai après le repas
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {DELAYS.map(d => (
                          <button
                            key={d.value}
                            type="button"
                            onClick={() => updatePref(cfg.meal_type, { feedback_delay_min: d.value })}
                            className={[
                              'px-3 py-1.5 rounded-full text-xs font-quicksand font-medium border transition-all',
                              pref.feedback_delay_min === d.value
                                ? 'bg-[var(--mf-primary)] text-white border-[var(--mf-primary)]'
                                : 'bg-white text-[#5A4A43] border-[#EDE4D6]',
                            ].join(' ')}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Note iOS */}
        <div className="flex items-start gap-2.5 bg-[#FDF0DC] border border-[#F5C97A] rounded-xl p-3">
          <Info className="h-4 w-4 text-[var(--mf-gold-text)] flex-shrink-0 mt-0.5" />
          <p className="text-xs font-quicksand text-[#7A5C00]">
            Sur iPhone, ajoutez MenuFamille à votre écran d&apos;accueil (Partager → Sur l&apos;écran d&apos;accueil) pour recevoir les notifications push.
          </p>
        </div>
      </div>

      {/* Bouton Save sticky */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#FDF6EE] border-t border-[#E8C99A] z-20">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={[
            'w-full max-w-lg mx-auto flex items-center justify-center gap-2 py-3 rounded-2xl font-dosis font-bold text-sm transition-all',
            saved
              ? 'bg-[#2A7D4F] text-white'
              : 'bg-[var(--mf-primary)] text-white',
            saving ? 'opacity-60' : '',
          ].join(' ')}
        >
          <Save className="h-4 w-4" />
          {saving ? 'Enregistrement…' : saved ? 'Préférences sauvegardées ✓' : 'Enregistrer mes préférences'}
        </button>
      </div>
    </div>
  )
}
