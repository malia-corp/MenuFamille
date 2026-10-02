import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileHeader } from '@/components/layout/mobile-header'
import { DesktopHeader } from '@/components/layout/desktop-header'
import { BottomNav } from '@/components/layout/bottom-nav'
import { FAB } from '@/components/layout/fab'
import type { Role } from '@/components/layout/nav-items'

interface Viewer {
  role: Role
  displayName: string | null
  circleName: string | null
}

async function getViewer(): Promise<Viewer> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { role: null, displayName: null, circleName: null }

  const [{ data: membership }, { data: profile }] = await Promise.all([
    supabase
      .from('family_circle_members')
      .select('role, family_circles ( name )')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle(),
    supabase.from('users').select('display_name').eq('id', user.id).maybeSingle(),
  ])

  return {
    role: (membership?.role as Role) ?? null,
    displayName: profile?.display_name ?? null,
    circleName: (membership?.family_circles as { name: string } | null)?.name ?? null,
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { role, displayName, circleName } = await getViewer()

  return (
    <>
      <Sidebar role={role} displayName={displayName} />
      <MobileHeader displayName={displayName} />
      <DesktopHeader role={role} displayName={displayName} circleName={circleName} />
      <main className="lg:ml-60 pt-14 pb-24 lg:pt-24 lg:pb-8 print:ml-0 print:pt-0 min-h-screen bg-[var(--kkb-bg)]">
        {children}
      </main>
      <BottomNav role={role} />
      <FAB />
    </>
  )
}
