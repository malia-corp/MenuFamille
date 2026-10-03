type SkeletonVariant = 'recipe' | 'meal' | 'stat' | 'list'

const BLOCK = 'animate-kkb-skeleton bg-[var(--kkb-border)]'

// Squelette de chargement aux proportions des cartes réelles.
export function SkeletonCard({ variant, className = '' }: { variant: SkeletonVariant; className?: string }) {
  if (variant === 'recipe') {
    return (
      <div className={`overflow-hidden rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white ${className}`} aria-hidden="true">
        <div className={`aspect-[4/3] w-full ${BLOCK}`} />
        <div className="space-y-2 p-3">
          <div className={`h-3.5 w-4/5 rounded ${BLOCK}`} />
          <div className={`h-3 w-2/5 rounded ${BLOCK}`} />
        </div>
      </div>
    )
  }
  if (variant === 'meal') {
    return (
      <div className={`space-y-3 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-4 ${className}`} aria-hidden="true">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 shrink-0 rounded-full ${BLOCK}`} />
          <div className="flex-1 space-y-2">
            <div className={`h-3.5 w-3/5 rounded ${BLOCK}`} />
            <div className={`h-3 w-2/5 rounded ${BLOCK}`} />
          </div>
        </div>
        <div className="flex gap-2">
          <div className={`h-6 w-20 rounded-full ${BLOCK}`} />
          <div className={`h-6 w-16 rounded-full ${BLOCK}`} />
        </div>
      </div>
    )
  }
  if (variant === 'stat') {
    return (
      <div className={`flex flex-col items-center gap-2 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-4 ${className}`} aria-hidden="true">
        <div className={`h-20 w-20 rounded-[var(--kkb-radius-card)] ${BLOCK}`} />
        <div className={`h-3 w-3/5 rounded ${BLOCK}`} />
      </div>
    )
  }
  return (
    <div className={`space-y-2.5 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-4 ${className}`} aria-hidden="true">
      <div className={`h-3.5 w-full rounded ${BLOCK}`} />
      <div className={`h-3.5 w-11/12 rounded ${BLOCK}`} />
      <div className={`h-3.5 w-3/4 rounded ${BLOCK}`} />
    </div>
  )
}
