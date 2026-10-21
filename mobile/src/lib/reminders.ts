import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { MEAL_FULL_LABEL, type MealType } from '@/shared/meal-type'

// Rappels de repas sur l'appareil. Le web envoie des notifications push
// (web-push / VAPID), qu'une application native ne reçoit pas : l'app planifie
// donc elle-même des notifications locales hebdomadaires à partir des mêmes
// préférences (heure, jours), enregistrées côté serveur.

export type PermissionState = 'granted' | 'default' | 'denied' | 'unsupported'

export interface ReminderPref {
  meal_type:        MealType
  reminder_enabled: boolean
  reminder_time:    string | null // "HH:MM"
  days_of_week:     number[]      // 1 = lundi … 7 = dimanche
}

const TAG = 'kkb-meal-reminder'

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false }),
  })
}

export async function readPermission(): Promise<PermissionState> {
  if (Platform.OS === 'web') return 'unsupported'
  const { status, canAskAgain } = await Notifications.getPermissionsAsync()
  if (status === 'granted') return 'granted'
  return canAskAgain ? 'default' : 'denied'
}

export async function askPermission(): Promise<PermissionState> {
  if (Platform.OS === 'web') return 'unsupported'
  const { status, canAskAgain } = await Notifications.requestPermissionsAsync()
  if (status === 'granted') {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('rappels', {
        name: 'Rappels de repas',
        importance: Notifications.AndroidImportance.DEFAULT,
      })
    }
    return 'granted'
  }
  return canAskAgain ? 'default' : 'denied'
}

export async function cancelMealReminders() {
  if (Platform.OS === 'web') return
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  await Promise.all(
    scheduled
      .filter(n => n.content.data?.tag === TAG)
      .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  )
}

// Remplace tous les rappels de l'app par ceux des préférences données.
export async function scheduleMealReminders(prefs: ReminderPref[]) {
  if (Platform.OS === 'web') return
  if ((await readPermission()) !== 'granted') return
  await cancelMealReminders()
  for (const p of prefs) {
    if (!p.reminder_enabled || !p.reminder_time) continue
    const [hour, minute] = p.reminder_time.slice(0, 5).split(':').map(Number)
    for (const day of p.days_of_week) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Bientôt l’heure du ${MEAL_FULL_LABEL[p.meal_type]}`,
          body:  'Le plat prévu t’attend dans le menu de la semaine.',
          data:  { tag: TAG, url: '/' },
        },
        // expo-notifications : 1 = dimanche … 7 = samedi
        trigger: { weekday: (day % 7) + 1, hour, minute, repeats: true, channelId: 'rappels' },
      })
    }
  }
}
