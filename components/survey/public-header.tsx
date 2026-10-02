import Image from 'next/image'

interface PublicHeaderProps {
  plannerName: string | null
  familyName:  string | null
}

// Header de la page publique /s/[token] — aucune donnee d'auth disponible
// ici (lien sans connexion), uniquement ce que la route GET du sondage a pu
// resoudre (planner_name/family_name, voir lib/utils/survey-token.ts +
// app/api/surveys/[token]/route.ts).
export function PublicHeader({ plannerName, familyName }: PublicHeaderProps) {
  const initial = (plannerName ?? '?').trim().charAt(0).toUpperCase()
  const label   = familyName ? `Famille ${familyName}` : (plannerName ?? '')

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[var(--kkb-border)]/50">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 xl:px-10 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image src="/logo-icon.svg" alt="" width={24} height={24} className="h-6 w-6" />
          <span className="font-dosis font-bold text-[18px] text-[var(--kkb-coral)]">KeskonBouf</span>
        </div>

        {label && (
          <div className="flex items-center gap-2">
            <span className="font-quicksand text-xs text-[var(--kkb-text-secondary)]">{label}</span>
            <span className="h-7 w-7 rounded-full bg-[var(--kkb-coral)] text-white text-xs font-quicksand font-bold flex items-center justify-center shrink-0">
              {initial}
            </span>
          </div>
        )}
      </div>
    </header>
  )
}
