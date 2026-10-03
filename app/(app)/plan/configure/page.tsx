import { redirect } from 'next/navigation'

// Ancienne route : la configuration des repas est devenue "Rythme des repas".
export default function ConfigureRedirect() {
  redirect('/settings/meal-config')
}
