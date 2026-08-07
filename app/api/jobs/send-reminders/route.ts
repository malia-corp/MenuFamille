import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest } from 'next/server'
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

// Correspondance JS getDay() (0=dim) → DB days_of_week (1=lun…7=dim)
const JS_DAY_TO_DB: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 0: 7 }

const MEAL_LABEL: Record<string, string> = {
  petit_dejeuner: 'Petit-déjeuner',
  dejeuner:       'Déjeuner',
  gouter:         'Goûter',
  diner:          'Dîner',
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const now = new Date()
  const todayDbDay = JS_DAY_TO_DB[now.getDay()]
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  // Récupère les prefs actives dont l'heure de rappel est dans ±5 min
  const { data: prefs } = await service
    .from('notification_prefs')
    .select('user_id, meal_type, reminder_time, days_of_week')
    .eq('reminder_enabled', true)
    .not('reminder_time', 'is', null)

  const activePrefs = (prefs ?? []).filter(p => {
    if (!p.days_of_week?.includes(todayDbDay)) return false
    if (!p.reminder_time) return false
    const [h, m] = p.reminder_time.split(':').map(Number)
    const prefMinutes = h * 60 + m
    return Math.abs(prefMinutes - currentMinutes) <= 5
  })

  if (activePrefs.length === 0) return Response.json({ sent: 0 })

  const userIds = Array.from(new Set(activePrefs.map(p => p.user_id)))

  // Récupère les abonnements push des utilisateurs concernés
  const { data: subs } = await service
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .in('user_id', userIds)

  let sent = 0
  for (const pref of activePrefs) {
    const userSubs = (subs ?? []).filter(s => s.user_id === pref.user_id)
    if (userSubs.length === 0) continue

    const title = `🍽 Rappel ${MEAL_LABEL[pref.meal_type] ?? pref.meal_type}`
    const body  = 'Votre repas approche. Bonne dégustation !'
    const payload = JSON.stringify({ title, body, url: '/plan' })

    for (const sub of userSubs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
        sent++
      } catch {
        // Abonnement expiré — on le supprime
        await service.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      }
    }
  }

  return Response.json({ sent })
}
