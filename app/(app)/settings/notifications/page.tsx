'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Bell, BellOff, BellRing, Check, CheckCircle2, Info, Loader2, MessageSquare, Smartphone } from 'lucide-react'
import { MEAL_COLOR, MEAL_LABEL, type MealType } from '@/lib/constants/meal-type'
import { MealTypeIcon } from '@/components/ui/meal-type-icon'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/lib/stores/toast-store'
import { registerServiceWorker } from '@/lib/utils/service-worker'
import { NotificationsSkeleton } from '@/components/skeletons/page-skeletons'

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
  { label: 'L', full: 'Lundi',    value: 1 },
  { label: 'M', full: 'Mardi',    value: 2 },
  { label: 'M', full: 'Mercredi', value: 3 },
  { label: 'J', full: 'Jeudi',    value: 4 },
  { label: 'V', full: 'Vendredi', value: 5 },
  { label: 'S', full: 'Samedi',   value: 6 },
  { label: 'D', full: 'Dimanche', value: 7 },
]

type PermissionState = 'granted' | 'default' | 'denied' | 'unsupported'

function readPermission(): PermissionState {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
}

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

const SWITCH = 'data-[state=checked]:bg-[var(--kkb-foret-500)] data-[state=unchecked]:bg-[var(--kkb-filet)]'

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
  const [savedPrefs, setSavedPrefs] = useState<Record<MealType, NotifPref>>({} as Record<MealType, NotifPref>)
  const [permission, setPermission] = useState<PermissionState>('default')

  useEffect(() => { setPermission(readPermission()) }, [])

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
      setSavedPrefs(prefMap)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  function updatePref(mealType: MealType, patch: Partial<NotifPref>) {
    setPrefs(prev => ({ ...prev, [mealType]: { ...prev[mealType], ...patch } }))
  }

  function toggleDay(mealType: MealType, day: number) {
    const current = prefs[mealType]?.days_of_week ?? [1, 2, 3, 4, 5, 6, 7]
    const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day]
    updatePref(mealType, { days_of_week: next.length > 0 ? next : current })
  }

  // Permission push demandée au premier passage sur ON ou via « Autoriser »
  // (jamais au chargement) ; si elle est déjà accordée, on s'abonne sans redemander.
  async function askPermission(): Promise<boolean> {
    if (typeof Notification === 'undefined') {
      setPermission('unsupported')
      toast.warning('Notifications non prises en charge sur cet appareil')
      return false
    }
    const result = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
    setPermission(result)
    if (result !== 'granted') {
      toast.warning('Autorise les notifications dans les paramètres de ton navigateur.')
      return false
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
    return true
  }

  async function handleReminderToggle(mealType: MealType, on: boolean) {
    if (on && !(await askPermission())) return
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
        setSavedPrefs(prefs)
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

  if (loading) return <NotificationsSkeleton />

  const list         = configs.filter(c => prefs[c.meal_type])
  const reminders    = list.filter(c => prefs[c.meal_type].reminder_enabled).length
  const feedbacks    = list.filter(c => prefs[c.meal_type].feedback_enabled).length
  const dirty        = JSON.stringify(prefs) !== JSON.stringify(savedPrefs)
  const blocked      = permission === 'denied' || permission === 'unsupported'
  const PERMISSION_LABEL: Record<PermissionState, string> = {
    granted: 'Autorisées', default: 'À autoriser', denied: 'Bloquées', unsupported: 'Non prises en charge',
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-32 pt-2 lg:max-w-none lg:px-0 lg:pt-0">
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-5">
        {/* ── Bandeau ─────────────────────────────────────────────────── */}
        <section className="rounded-[var(--kkb-r-xl)] bg-[var(--kkb-foret)] p-5 lg:col-span-8 lg:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="font-quicksand text-sm font-semibold text-[var(--kkb-foret-100)]">Réglages</p>
            <button type="button" onClick={() => router.back()} aria-label="Retour"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[var(--kkb-creme)] transition-colors hover:bg-white/20">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </div>
          <h1 className="mt-1 text-h1 text-[var(--kkb-creme)]">Notifications</h1>
          <p className="mt-1 max-w-xl font-quicksand text-sm text-[var(--kkb-foret-100)]">
            Un petit rappel avant de passer en cuisine, et une demande d’avis après le repas pour que le menu s’améliore chaque semaine.
          </p>
          <dl className="mt-5 grid grid-cols-3 gap-2">
            {[
              { icon: BellRing,      label: 'Rappels',        value: <>{reminders}<span className="text-sm font-bold text-[var(--kkb-foret-100)]">/{list.length}</span></> },
              { icon: MessageSquare, label: 'Avis demandés', value: <>{feedbacks}<span className="text-sm font-bold text-[var(--kkb-foret-100)]">/{list.length}</span></> },
              { icon: Smartphone,    label: 'Cet appareil',   value: <span className="font-quicksand text-sm font-bold">{PERMISSION_LABEL[permission]}</span> },
            ].map(s => (
              <div key={s.label} className="rounded-[var(--kkb-r-md)] bg-white/10 px-3 py-2.5">
                <dt className="flex items-center gap-1.5 font-quicksand text-xs text-[var(--kkb-foret-100)]">
                  <s.icon className="hidden h-3.5 w-3.5 shrink-0 text-[var(--kkb-sauge)] sm:block" /> <span className="truncate">{s.label}</span>
                </dt>
                <dd className="mt-0.5 font-dosis text-[20px] font-extrabold leading-tight tabular-nums text-[var(--kkb-creme)]">{s.value}</dd>
              </div>
            ))}
          </dl>
          {permission === 'default' && (
            <button type="button" onClick={() => void askPermission()}
              className="mt-4 flex h-11 items-center gap-2 rounded-full bg-[var(--kkb-creme)] px-5 font-quicksand text-sm font-bold text-[var(--kkb-foret)] transition-colors hover:bg-white">
              <BellRing className="h-4 w-4" /> Autoriser les notifications
            </button>
          )}
          {blocked && (
            <p className="mt-4 flex items-start gap-2 rounded-[var(--kkb-r-md)] bg-white/10 px-3 py-2.5 font-quicksand text-sm text-[var(--kkb-creme)]">
              <BellOff className="mt-0.5 h-4 w-4 shrink-0 text-[var(--kkb-jaune)]" />
              {permission === 'denied'
                ? 'Les notifications sont bloquées pour KeskonBouf : réactive-les dans les réglages de ton navigateur.'
                : 'Ce navigateur ne reçoit pas les notifications. Sur iPhone, ajoute d’abord l’app à l’écran d’accueil.'}
            </p>
          )}
        </section>

        {/* ── Bon à savoir ────────────────────────────────────────────── */}
        <aside className="order-last rounded-[var(--kkb-r-xl)] bg-white p-5 lg:order-none lg:sticky lg:top-24 lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-1" aria-labelledby="tips-title">
          <h2 id="tips-title" className="flex items-center gap-2.5 text-h3 text-[var(--kkb-profond)]">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--kkb-foret-50)] text-[var(--kkb-foret)]"><Info className="h-4 w-4" /></span>
            Bon à savoir
          </h2>
          <ul className="mt-3 space-y-3 font-quicksand text-sm text-[var(--kkb-texte-2)]">
            <li className="flex gap-2.5">
              <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-[var(--kkb-foret-500)]" />
              <span><span className="font-bold text-[var(--kkb-profond)]">Le rappel</span> arrive à l’heure choisie, les jours cochés, avec le plat prévu au menu.</span>
            </li>
            <li className="flex gap-2.5">
              <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-[var(--kkb-foret-500)]" />
              <span><span className="font-bold text-[var(--kkb-profond)]">La demande d’avis</span> part après le repas : la famille répond d’un geste, et les plats aimés reviennent plus souvent.</span>
            </li>
            <li className="flex gap-2.5">
              <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-[var(--kkb-foret-500)]" />
              <span><span className="font-bold text-[var(--kkb-profond)]">Sur iPhone</span>, ajoute d’abord l’app à l’écran d’accueil (Partager, puis « Sur l’écran d’accueil »).</span>
            </li>
          </ul>
        </aside>

        {/* ── Un repas, un rappel, une demande d’avis ─────────────────── */}
        <div className="lg:col-span-8">
          {list.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-[var(--kkb-r-xl)] bg-white px-6 py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--kkb-foret-50)] text-[var(--kkb-foret)]"><Bell className="h-6 w-6" /></span>
              <p className="text-h3 text-[var(--kkb-profond)]">Aucun repas actif</p>
              <p className="font-quicksand text-sm text-[var(--kkb-texte-2)]">Choisis d’abord les repas que tu prépares : leurs rappels apparaîtront ici.</p>
              <Link href="/settings/meal-config" className="mt-1 flex h-11 items-center rounded-full bg-[var(--kkb-foret)] px-5 font-quicksand text-sm font-bold text-[var(--kkb-creme)]">
                Régler le rythme des repas
              </Link>
            </div>
          ) : (
            <div className="grid items-start gap-3 sm:grid-cols-2 lg:gap-4">
              {list.map(cfg => {
                const pref  = prefs[cfg.meal_type]
                const color = MEAL_COLOR[cfg.meal_type]
                return (
                  <article key={cfg.meal_type} className="rounded-[var(--kkb-r-xl)] bg-white p-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: color.bg, color: color.text }}>
                        <MealTypeIcon type={cfg.meal_type} className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-h3 text-[var(--kkb-profond)]">{MEAL_LABEL[cfg.meal_type]}</h2>
                        {cfg.default_time && <p className="font-quicksand text-xs tabular-nums text-[var(--kkb-texte-2)]">Repas à {cfg.default_time.slice(0, 5).replace(':', 'h')}</p>}
                      </div>
                    </div>

                    {/* Rappel */}
                    <div className="mt-4 rounded-[var(--kkb-r-lg)] bg-[var(--kkb-creme)] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 font-quicksand text-sm font-bold text-[var(--kkb-profond)]">
                          <BellRing className="h-4 w-4 text-[var(--kkb-foret-500)]" /> Rappel
                        </span>
                        <Switch checked={pref.reminder_enabled} onCheckedChange={on => void handleReminderToggle(cfg.meal_type, on)}
                          aria-label={`Rappel du ${MEAL_LABEL[cfg.meal_type].toLowerCase()}`} className={SWITCH} />
                      </div>
                      <Expand open={pref.reminder_enabled}>
                        <div className="space-y-3 pt-3">
                          <label className="flex items-center justify-between gap-3">
                            <span className="font-quicksand text-sm text-[var(--kkb-texte-2)]">À</span>
                            <input type="time" value={(pref.reminder_time ?? cfg.default_time ?? '').slice(0, 5)}
                              onChange={e => updatePref(cfg.meal_type, { reminder_time: e.target.value })}
                              aria-label={`Heure du rappel du ${MEAL_LABEL[cfg.meal_type].toLowerCase()}`}
                              className="h-9 rounded-full bg-white px-3 font-dosis text-base font-extrabold tabular-nums text-[var(--kkb-foret)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--kkb-foret-300)]" />
                          </label>
                          <div className="flex justify-between gap-1" role="group" aria-label="Jours du rappel">
                            {DAYS.map(d => {
                              const on = pref.days_of_week.includes(d.value)
                              return (
                                <button key={d.value} type="button" onClick={() => toggleDay(cfg.meal_type, d.value)} aria-pressed={on} aria-label={d.full} title={d.full}
                                  className={`flex h-9 w-9 items-center justify-center rounded-full font-quicksand text-xs font-bold transition-colors ${
                                    on ? 'bg-[var(--kkb-foret)] text-[var(--kkb-creme)]' : 'bg-white text-[var(--kkb-texte-2)] hover:text-[var(--kkb-foret)]'
                                  }`}>
                                  {d.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </Expand>
                    </div>

                    {/* Demande d’avis */}
                    <div className="mt-2 rounded-[var(--kkb-r-lg)] bg-[var(--kkb-creme)] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 font-quicksand text-sm font-bold text-[var(--kkb-profond)]">
                          <MessageSquare className="h-4 w-4 text-[var(--kkb-foret-500)]" /> Demande d’avis
                        </span>
                        <Switch checked={pref.feedback_enabled} onCheckedChange={on => updatePref(cfg.meal_type, { feedback_enabled: on })}
                          aria-label={`Avis après le ${MEAL_LABEL[cfg.meal_type].toLowerCase()}`} className={SWITCH} />
                      </div>
                      <Expand open={pref.feedback_enabled}>
                        <div className="pt-3">
                          <p className="mb-2 font-quicksand text-sm text-[var(--kkb-texte-2)]">Après le repas</p>
                          <div className="grid grid-cols-4 gap-1 rounded-full bg-white p-1" role="radiogroup" aria-label="Délai après le repas">
                            {DELAYS.map(d => {
                              const on = pref.feedback_delay_min === d.value
                              return (
                                <button key={d.value} type="button" role="radio" aria-checked={on} onClick={() => updatePref(cfg.meal_type, { feedback_delay_min: d.value })}
                                  className={`h-8 rounded-full font-quicksand text-xs font-bold transition-colors ${on ? 'bg-[var(--kkb-foret)] text-[var(--kkb-creme)]' : 'text-[var(--kkb-texte-2)] hover:text-[var(--kkb-foret)]'}`}>
                                  {d.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </Expand>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Enregistrer : barre flottante (pas de barre basse sur les réglages) */}
      {list.length > 0 && (
        <div className="fixed bottom-5 left-4 right-4 z-40 mx-auto max-w-lg lg:left-[calc(var(--kkb-rail-offset)+var(--kkb-gutter))] lg:right-[var(--kkb-gutter)] lg:mx-0 lg:max-w-none">
          <div className="flex items-center gap-3 rounded-full bg-white p-2 pl-5 shadow-[0_12px_32px_rgba(31,58,46,0.16)]">
            <p className="min-w-0 flex-1 truncate font-quicksand text-sm" aria-live="polite">
              {dirty
                ? <span className="font-bold text-[var(--kkb-profond)]">Modifications à enregistrer</span>
                : <span className="flex items-center gap-1.5 text-[var(--kkb-foret-500)]"><CheckCircle2 className="h-4 w-4 shrink-0" /> Préférences à jour</span>}
            </p>
            {dirty && !saving && (
              <button type="button" onClick={() => setPrefs(savedPrefs)}
                className="hidden h-11 shrink-0 rounded-full px-4 font-quicksand text-sm font-semibold text-[var(--kkb-texte-2)] transition-colors hover:bg-[var(--kkb-creme)] hover:text-[var(--kkb-profond)] sm:block">
                Annuler
              </button>
            )}
            <button type="button" onClick={() => void handleSave()} disabled={!dirty || saving}
              className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--kkb-orange)] px-5 font-quicksand text-[15px] font-bold text-white transition-colors hover:bg-[var(--kkb-orange-700)] disabled:opacity-50 lg:px-7">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Enregistrer
            </button>
          </div>
        </div>
      )}
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
