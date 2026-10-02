'use client'

import { useRouter } from 'next/navigation'

interface HarmonyWidgetProps {
  respondentCount: number
  memberCount: number
  agreementPct: number | null
  planId: string | null
}

const CIRCUMFERENCE = 2 * Math.PI * 15.9155

export function HarmonyWidget({ respondentCount, memberCount, agreementPct, planId }: HarmonyWidgetProps) {
  const router = useRouter()
  const dash = `${((agreementPct ?? 0) / 100) * CIRCUMFERENCE}, ${CIRCUMFERENCE}`

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm flex flex-col gap-5">
      <h3 className="text-h2 text-[var(--kkb-text-primary)]">Adhésion du Foyer</h3>

      <div className="flex items-center gap-5 p-4 rounded-xl bg-[var(--kkb-bg)]">
        <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="var(--kkb-border)"
              strokeWidth="3.5"
            />
            {agreementPct !== null && (
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="var(--kkb-success)"
                strokeWidth="3.5"
                strokeDasharray={dash}
                strokeLinecap="round"
              />
            )}
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="font-dosis font-bold text-lg text-[var(--kkb-text-primary)] leading-none">
              {agreementPct !== null ? `${agreementPct}%` : '—'}
            </span>
            <span className="text-[9px] font-quicksand text-[var(--kkb-success)] mt-0.5">D&apos;ACCORD</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-quicksand text-sm text-[var(--kkb-text-primary)] leading-tight">
            {respondentCount}/{memberCount} membres ont répondu
          </span>
          <p className="text-xs font-quicksand text-[var(--kkb-text-secondary)]">
            {agreementPct === null ? 'Pas encore de retours cette semaine.' : 'Merci pour vos retours !'}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => planId && router.push(`/votes/results?plan=${planId}`)}
        disabled={!planId}
        className="w-full h-11 rounded-lg bg-[var(--kkb-bg)] hover:bg-[var(--kkb-border-light)] text-[var(--kkb-text-primary)] font-quicksand text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
      >
        Consulter le détail des votes →
      </button>
    </div>
  )
}
