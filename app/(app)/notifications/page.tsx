import { redirect } from 'next/navigation'

// Ancienne route : les réglages de notifications vivent sous /settings.
export default function NotificationsRedirect() {
  redirect('/settings/notifications')
}
