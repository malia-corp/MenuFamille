import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveActiveCircleId } from '@/lib/utils/active-circle'

// La planification (/plan et ses sous-pages) est réservée à la
// planificatrice : un membre de son cercle actif retrouve le menu de la
// famille, en lecture seule, sur l'accueil. Sans cela, une génération
// créerait un menu à son nom.
export default async function PlanLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const circleId = await resolveActiveCircleId(supabase, user.id)
    if (circleId) {
      const { data: membership } = await supabase
        .from('family_circle_members')
        .select('role')
        .eq('circle_id', circleId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (membership?.role === 'membre') redirect('/')
    }
  }
  return <>{children}</>
}
