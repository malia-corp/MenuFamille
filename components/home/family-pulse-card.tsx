'use client'

import Link from 'next/link'
import { ChevronRight, MessageCircleHeart } from 'lucide-react'
import { ShareActions, surveyLinkPayload } from '@/components/ui/share-actions'

interface FamilyPulseCardProps {
  planId: string | null
  shareToken: string | null
  onShareToken: (token: string) => void
  respondentCount: number
  memberCount: number
  agreementPct: number | null
}

const R = 15.9155
const CIRCUMFERENCE = 2 * Math.PI * R

// Pouls de la famille sur le menu de la semaine : part d'avis positifs,
// nombre de répondants, et de quoi relancer (partage du sondage) ou lire le
// détail. Ton rassurant : le sondage n'est jamais un examen.
export function FamilyPulseCard({
  planId,
  shareToken,
  onShareToken,
  respondentCount,
  memberCount,
  agreementPct,
}: FamilyPulseCardProps) {
  const dash = `${((agreementPct ?? 0) / 100) * CIRCUMFERENCE}, ${CIRCUMFERENCE}`
  const shared = !!shareToken

  // Lien du sondage créé à la demande s'il n'existe pas encore (même parcours
  // que l'écran de validation du menu).
  async function sharePayload() {
    let token = shareToken
    if (!token && planId) {
      try {
        const res = await fetch(`/api/meal-plans/${planId}/share`, { method: 'POST' })
        if (res.ok) {
          token = ((await res.json()) as { share_token: string }).share_token
          onShareToken(token)
        }
      } catch {
        /* réseau indisponible : rien à partager */
      }
    }
    return token ? surveyLinkPayload(token) : null
  }

  const message = !planId
    ? 'Génère ton menu pour demander l’avis de ta famille.'
    : !shared
      ? 'Partage le sondage : chacun donne son avis en un geste.'
      : respondentCount === 0
        ? 'Le sondage est parti, les premiers avis arrivent bientôt.'
        : `${respondentCount} sur ${memberCount} ${respondentCount > 1 ? 'ont' : 'a'} donné son avis.`

  return (
    <section className="rounded-[var(--kkb-r-xl)] bg-white p-4" aria-labelledby="family-pulse-title">
      <div className="flex items-center gap-4">
        <div className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center">
          <svg className="h-[72px] w-[72px] -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
            <circle cx="18" cy="18" r={R} fill="none" stroke="var(--kkb-sauge-50)" strokeWidth="3.5" />
            {agreementPct !== null && (
              <circle
                cx="18"
                cy="18"
                r={R}
                fill="none"
                stroke="var(--kkb-foret-500)"
                strokeWidth="3.5"
                strokeDasharray={dash}
                strokeLinecap="round"
              />
            )}
          </svg>
          <span className="absolute flex flex-col items-center">
            {agreementPct !== null ? (
              <span className="font-dosis text-[17px] font-extrabold leading-none text-[var(--kkb-foret)] tabular-nums">
                {agreementPct}%
              </span>
            ) : (
              <MessageCircleHeart className="h-6 w-6 text-[var(--kkb-foret-500)]" />
            )}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h2 id="family-pulse-title" className="text-h3 text-[var(--kkb-profond)]">
            L’avis de la famille
          </h2>
          {agreementPct !== null && (
            <p className="font-quicksand text-xs font-semibold text-[var(--kkb-foret-500)]">apprécient le menu</p>
          )}
          <p className="mt-1 font-quicksand text-sm text-[var(--kkb-texte-2)]">{message}</p>
        </div>
      </div>

      {planId && (
        <div className="mt-4 space-y-2">
          <ShareActions
            getPayload={sharePayload}
            shareLabel="Partager"
            className="flex items-center gap-2"
            buttonClassName="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full border-[1.5px] border-[var(--kkb-filet)] font-quicksand text-sm font-semibold text-[var(--kkb-foret)] transition-colors hover:border-[var(--kkb-foret-300)] disabled:opacity-60"
            shareButtonClassName="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--kkb-foret)] font-quicksand text-sm font-semibold text-[var(--kkb-creme)] transition-colors hover:bg-[var(--kkb-foret-900)] disabled:opacity-60"
          />
          {shared && respondentCount > 0 && (
            <Link
              href={`/votes/results?plan=${planId}`}
              className="flex h-11 items-center justify-center gap-0.5 font-quicksand text-sm font-bold text-[var(--kkb-foret)]"
            >
              Lire les avis <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}
    </section>
  )
}
