import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon:         LucideIcon
  title:        string
  description:  string
  ctaLabel?:    string
  ctaIcon?:     LucideIcon
  ctaHref?:     string
  ctaAction?:   () => void
  ctaDisabled?: boolean
  // Contenu libre sous la description (lien secondaire, boutons de partage…)
  children?:    React.ReactNode
  className?:   string
}

export function EmptyState({
  icon: Icon, title, description, ctaLabel, ctaIcon: CtaIcon, ctaHref, ctaAction, ctaDisabled, children, className = 'py-12',
}: EmptyStateProps) {
  const ctaClass = 'mt-5 inline-flex items-center gap-2 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral)] px-5 py-2.5 text-sm font-quicksand font-bold text-white hover:bg-[var(--kkb-coral-hover)] disabled:opacity-60'
  const ctaContent = <>{CtaIcon && <CtaIcon className="h-4 w-4" />}{ctaLabel}</>

  return (
    <div className={`flex flex-col items-center justify-center px-4 text-center ${className}`}>
      <Icon className="h-12 w-12 text-[var(--kkb-text-tertiary)] opacity-50" aria-hidden="true" />
      <h2 className="mt-3 font-dosis font-bold text-lg text-[var(--kkb-text-primary)]">{title}</h2>
      <p className="mt-1 max-w-[280px] text-sm font-quicksand text-[var(--kkb-text-secondary)]">{description}</p>
      {ctaLabel && ctaHref && <Link href={ctaHref} className={ctaClass}>{ctaContent}</Link>}
      {ctaLabel && !ctaHref && ctaAction && (
        <button type="button" onClick={ctaAction} disabled={ctaDisabled} className={ctaClass}>{ctaContent}</button>
      )}
      {children && <div className="mt-4 w-full max-w-xs">{children}</div>}
    </div>
  )
}
