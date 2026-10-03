'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, Check, Info, Loader2 } from 'lucide-react'
import { MEAL_LABEL, type MealType } from '@/lib/constants/meal-type'
import { MealTypeIcon } from '@/components/ui/meal-type-icon'
import { Switch } from '@/components/ui/switch'
import { SkeletonCard } from '@/components/ui/skeleton-card'
import { toast } from '@/lib/stores/toast-store'
import { registerServiceWorker } from '@/lib/utils/service-worker'

// ─── Types ────────────────────────────────────────────────────────────────────

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

const SECTION_LABEL = 'font-quicksand text-[11px] font-bold uppercase tracking-wider text-[var(--kkb-text-tertiary)]'
const FIELD_LABEL   = 'mb-1.5 font-quicksand text-[10px] font-bold uppercase tracking-wider text-[var(--kkb-text-tertiary)]'
const SWITCH        = 'data-[state=checked]:bg-[var(--kkb-coral)] data-[state=unchecked]:bg-[var(--kkb-border)]'

// ─── Push helpers ─────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

async function subscribePush(): Promise<PushSubscription | null> {
  const reg = await registerServiceWorker()?.catch(() => null)
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

  // Permission push demandée au premier passage sur ON (jamais au chargement) ;
  // si elle est déjà accordée, on s'abonne sans redemander.
  async function handleReminderToggle(mealType: MealType, on: boolean) {
    if (on) {
      if (typeof Notification === 'undefined') {
        toast.warning('Notifications non prises en charge sur cet appareil')
        return
      }
      const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
      if (permission !== 'granted') {
        toast.warning('Autorise les notifications dans les paramètres de ton navigateur.')
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
      if (res.ok) {
        setSaved(true)
        toast.success('Préférences enregistrées')
      } else {
        toast.error('Impossible d\'enregistrer')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-lg space-y-3 px-4 py-6" aria-busy="true">
        <SkeletonCard variant="list" />
        <SkeletonCard variant="list" />
        <SkeletonCard variant="list" />
      </div>
    )
  }

  return (
    <div className="pb-28">
      <div className="mx-auto max-w-lg space-y-6 px-4 py-5 lg:pt-2">
        {/* En-tête desktop (le MobileHeader porte le titre sur mobile) */}
        <div className="hidden items-center gap-2 lg:flex">
          <button type="button" onClick={() => router.back()} className="-ml-1 p-1 text-[var(--kkb-teal)]" aria-label="Retour">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Bell className="h-5 w-5 text-[var(--kkb-coral)]" />
          <h1 className="font-dosis text-xl font-bold text-[var(--kkb-text-primary)]">Notifications</h1>
        </div>

        {/* Rappels de repas */}
        <section className="space-y-2">
          <p className={SECTION_LABEL}>Rappels de repas</p>
          {configs.map(cfg => {
            const pref = prefs[cfg.meal_type]
            if (!pref) return null
            return (
              <div key={cfg.meal_type} className="rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5">
                    <MealTypeIcon type={cfg.meal_type} className="h-5 w-5 text-[var(--kkb-coral)]" />
                    <span className="font-quicksand text-sm font-bold text-[var(--kkb-text-primary)]">{MEAL_LABEL[cfg.meal_type]}</span>
                  </span>
                  <Switch
                    checked={pref.reminder_enabled}
                    onCheckedChange={on => void handleReminderToggle(cfg.meal_type, on)}
                    aria-label={`Rappel ${MEAL_LABEL[cfg.meal_type]}`}
                    className={SWITCH}
                  />
                </div>

                <Expand open={pref.reminder_enabled}>
                  <div className="mt-3 space-y-3 border-t border-[var(--kkb-border-light)] pt-3">
                    <div>
                      <p className={FIELD_LABEL}>Heure du rappel</p>
                      <input
                        type="time"
                        value={pref.reminder_time ?? cfg.default_time}
                        onChange={e => updatePref(cfg.meal_type, { reminder_time: e.target.value })}
                        className="rounded-[var(--kkb-radius-sm)] border border-[var(--kkb-border)] bg-[var(--kkb-bg)] px-3 py-2 font-quicksand text-sm text-[var(--kkb-text-primary)] outline-none focus:border-[var(--kkb-coral)]"
                      />
                    </div>
                    <div>
                      <p className={FIELD_LABEL}>Jours</p>
                      <div className="flex gap-1.5">
                        {DAYS.map((d, i) => {
                          const active = pref.days_of_week.includes(d.value)
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => toggleDay(cfg.meal_type, d.value)}
                              aria-pressed={active}
                              className={`h-9 w-9 rounded-full border font-quicksand text-xs font-bold transition-colors ${
                                active
                                  ? 'border-[var(--kkb-coral)] bg-[var(--kkb-coral)] text-white'
                                  : 'border-[var(--kkb-border)] bg-white text-[var(--kkb-text-secondary)]'
                              }`}
                            >
                              {d.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </Expand>
              </div>
            )
          })}
        </section>

        {/* Feedback post-repas */}
        <section className="space-y-2">
          <p className={SECTION_LABEL}>Feedback post-repas</p>
          <div className="divide-y divide-[var(--kkb-border-light)] rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white">
            <p className="px-4 pb-1 pt-4 font-quicksand text-sm font-bold text-[var(--kkb-text-primary)]">Demande d&apos;avis après le repas</p>
            {configs.map(cfg => {
              const pref = prefs[cfg.meal_type]
              if (!pref) return null
              return (
                <div key={cfg.meal_type} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2.5">
                      <MealTypeIcon type={cfg.meal_type} className="h-4 w-4 text-[var(--kkb-coral)]" />
                      <span className="font-quicksand text-sm font-semibold text-[var(--kkb-text-secondary)]">{MEAL_LABEL[cfg.meal_type]}</span>
                    </span>
                    <Switch
                      checked={pref.feedback_enabled}
                      onCheckedChange={on => updatePref(cfg.meal_type, { feedback_enabled: on })}
                      aria-label={`Avis après le ${MEAL_LABEL[cfg.meal_type]}`}
                      className={SWITCH}
                    />
                  </div>
                  <Expand open={pref.feedback_enabled}>
                    <div className="pt-3">
                      <p className={FIELD_LABEL}>Délai après le repas</p>
                      <div className="flex flex-wrap gap-2">
                        {DELAYS.map(d => {
                          const active = pref.feedback_delay_min === d.value
                          return (
                            <button
                              key={d.value}
                              type="button"
                              onClick={() => updatePref(cfg.meal_type, { feedback_delay_min: d.value })}
                              aria-pressed={active}
                              className={`rounded-[var(--kkb-radius-pill)] border px-3.5 py-1.5 font-quicksand text-xs font-bold transition-colors ${
                                active
                                  ? 'border-[var(--kkb-coral)] bg-[var(--kkb-coral)] text-white'
                                  : 'border-[var(--kkb-border)] bg-white text-[var(--kkb-text-secondary)]'
                              }`}
                            >
                              {d.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </Expand>
                </div>
              )
            })}
          </div>
        </section>

        {/* Note iOS */}
        <div className="flex items-start gap-2.5 rounded-[var(--kkb-radius-sm)] border border-[var(--kkb-teal)] bg-[var(--kkb-teal-light)] p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--kkb-teal)]" />
          <p className="font-quicksand text-xs text-[var(--kkb-teal)]">
            Sur iOS, l&apos;application doit être ajoutée à l&apos;écran d&apos;accueil (Partager → Sur l&apos;écran d&apos;accueil) pour recevoir les notifications push.
          </p>
        </div>
      </div>

      {/* Enregistrer : fixe en bas (pas de bottom nav sur les pages réglages) */}
      <div className="fixed bottom-5 left-4 right-4 z-40 mx-auto max-w-lg lg:left-60 lg:px-4">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral)] py-3.5 font-quicksand text-[15px] font-bold text-white shadow-[var(--kkb-shadow-fab)] transition-all hover:bg-[var(--kkb-coral-hover)] active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {saving ? 'Enregistrement…' : saved ? 'Préférences enregistrées' : 'Enregistrer mes préférences'}
        </button>
      </div>
    </div>
  )
}

// Dépliage animé en hauteur (grid 0fr → 1fr).
function Expand({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      aria-hidden={!open}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}
