import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest } from 'next/server'
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

const DAY_ORDER = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
// JS getDay(): 0=dim → index 6, 1=lun → index 0 …
const JS_DAY_TO_ORDER: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 }

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const now = new Date()
  const todayDayIndex = JS_DAY_TO_ORDER[now.getDay()]
  const todayDayName  = DAY_ORDER[todayDayIndex]
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  // Prefs avec feedback activé dont l'heure calculée (reminder_time + feedback_delay_min) est dans ±5 min
  const { data: prefs } = await service
    .from('notification_prefs')
    .select('user_id, meal_type, reminder_time, feedback_delay_min')
    .eq('feedback_enabled', true)
    .not('reminder_time', 'is', null)

  const activePrefs = (prefs ?? []).filter(p => {
    if (!p.reminder_time) return false
    const [h, m] = p.reminder_time.split(':').map(Number)
    const targetMinutes = h * 60 + m + (p.feedback_delay_min ?? 120)
    return Math.abs(targetMinutes - currentMinutes) <= 5
  })

  if (activePrefs.length === 0) return Response.json({ sent: 0 })

  // Semaine courante : lundi de cette semaine
  const monday = new Date(now)
  monday.setDate(now.getDate() - todayDayIndex)
  monday.setHours(0, 0, 0, 0)
  const weekStart = monday.toISOString().split('T')[0]

  const userIds = Array.from(new Set(activePrefs.map(p => p.user_id)))

  // Plans de la semaine (finalisés)
  const { data: plans } = await service
    .from('meal_plans')
    .select('id, user_id')
    .in('user_id', userIds)
    .eq('week_start', weekStart)
    .eq('status', 'finalized')

  const { data: subs } = await service
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .in('user_id', userIds)

  let sent = 0
  for (const pref of activePrefs) {
    const plan = (plans ?? []).find(p => p.user_id === pref.user_id)
    if (!plan) continue

    // Items du repas aujourd'hui
    const { data: items } = await service
      .from('meal_plan_items')
      .select('id, meal_type, recipes ( name )')
      .eq('meal_plan_id', plan.id)
      .eq('meal_type', pref.meal_type)
      .or(`day_of_week.eq.${todayDayName},applies_all_days.eq.true`)

    if (!items || items.length === 0) continue

    for (const item of items) {
      // Ne pas envoyer si feedback déjà donné
      const { count } = await service
        .from('meal_feedback')
        .select('id', { count: 'exact', head: true })
        .eq('meal_plan_item_id', item.id)
        .eq('user_id', pref.user_id)

      if ((count ?? 0) > 0) continue

      type RawRecipe = { name: string } | null
      const recipeName = (item.recipes as unknown as RawRecipe)?.name ?? 'ce repas'
      const payload = JSON.stringify({
        title: `⭐ Comment était ${recipeName} ?`,
        body:  'Donnez votre avis sur ce repas.',
        url:   '/feedback',
      })

      const userSubs = (subs ?? []).filter(s => s.user_id === pref.user_id)
      for (const sub of userSubs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          )
          sent++
        } catch {
          await service.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      }
    }
  }

  return Response.json({ sent })
}
