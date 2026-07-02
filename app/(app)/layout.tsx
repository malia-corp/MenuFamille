import { AppHeader } from '@/components/layout/app-header'
import { BottomNav } from '@/components/layout/bottom-nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      <main className="pt-14 pb-20 min-h-screen bg-[#FDF6EE]">
        {children}
      </main>
      <BottomNav />
    </>
  )
}
