import { Inbox, type LucideIcon } from 'lucide-react'
import { EmptyState as BaseEmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton-card'

// Chargement des résultats : squelettes aux proportions de la page.
export function PageLoader() {
  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 pt-4 lg:max-w-[1400px] lg:px-8 lg:py-8" aria-busy="true" aria-label="Chargement des résultats">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <SkeletonCard variant="stat" />
        <SkeletonCard variant="stat" />
        <SkeletonCard variant="stat" className="hidden lg:flex" />
      </div>
      <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0">
        <SkeletonCard variant="meal" />
        <SkeletonCard variant="meal" />
      </div>
    </div>
  )
}

// État vide des pages de résultats, dans une carte centrée.
export function EmptyState({ icon = Inbox, title, message, action, children }: {
  icon?: LucideIcon
  title: string
  message: string
  action?: { label: string; onClick: () => void; icon?: LucideIcon }
  children?: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <div className="rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white">
        <BaseEmptyState
          icon={icon}
          title={title}
          description={message}
          ctaLabel={action?.label}
          ctaIcon={action?.icon}
          ctaAction={action?.onClick}
          className="py-10"
        >
          {children}
        </BaseEmptyState>
      </div>
    </div>
  )
}
