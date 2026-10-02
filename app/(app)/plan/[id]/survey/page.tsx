'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, BarChart3, Users, ThumbsUp, MessageSquare,
  MailOpen, Share2, Copy, Pencil, Inbox,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { MEAL_LABEL, type MealType } from '@/lib/constants/meal-type'
import { MealTypeIcon } from '@/components/ui/meal-type-icon'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Comment {
  respondent_name: string
  comment:         string
  created_at:      string
}

interface ItemResult {
  id:               string
  meal_type:        MealType
  day_of_week:      string
  applies_all_days: boolean
  recipe_name:      string | null
  aime:             number
  bof:              number
  naime_pas:        number
  comments:         Comment[]
}

interface SurveyResults {
  share_token:       string | null
  respondent_count:  number
  rated_items_count: number
  comment_count:     number
  items:             ItemResult[]
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const MEAL_ORDER = ['petit_dejeuner', 'dejeuner', 'gouter', 'diner']

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SurveyResultsPage() {
  const params  = useParams<{ id: string }>()
  const router  = useRouter()
  const [data, setData]       = useState<SurveyResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied]   = useState(false)

  const fetchResults = useCallback(async () => {
    const res = await fetch(`/api/meal-plans/${params.id}/survey-results`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [params.id])

  useEffect(() => { fetchResults() }, [fetchResults])

  async function copyShareLink() {
    if (!data?.share_token) return
    const url = `${window.location.origin}/s/${data.share_token}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--kkb-bg)]">
        <div className="h-5 w-5 border-2 border-[var(--kkb-coral)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--kkb-bg)]">
        <p className="text-sm font-quicksand text-[var(--kkb-text-tertiary)]">Résultats introuvables.</p>
      </div>
    )
  }

  // Trier les items dans l'ordre des types de repas
  const sortedItems = [...data.items].sort(
    (a, b) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type)
  )

  return (
    <div className="min-h-screen bg-[var(--kkb-bg)]">
      {/* Header */}
      <header className="bg-white border-b border-[var(--kkb-border-light)] px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 -ml-1">
          <ArrowLeft className="h-5 w-5 text-[var(--kkb-text-primary)]" />
        </button>
        <BarChart3 className="h-5 w-5 text-[var(--kkb-coral)]" />
        <span className="font-dosis font-bold text-base text-[var(--kkb-text-primary)]">Résultats du sondage</span>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-5">

        {/* Cas : 0 répondant */}
        {data.respondent_count === 0 ? (
          <div className="bg-white border border-[var(--kkb-border-light)] rounded-2xl p-6 text-center space-y-3">
            <MailOpen className="h-8 w-8 text-[var(--kkb-text-tertiary)] mx-auto" />
            <p className="font-dosis font-semibold text-base text-[var(--kkb-text-primary)]">
              En attente des avis
            </p>
            <p className="text-xs font-quicksand text-[var(--kkb-text-tertiary)]">
              Partagez le lien avec votre famille pour recueillir leurs réactions.
            </p>
            {data.share_token && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={copyShareLink}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--kkb-warning-light)] text-[var(--kkb-warning)] text-sm font-quicksand font-semibold"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? 'Copié !' : 'Copier le lien'}
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Donne ton avis sur notre menu de la semaine : ${window.location.origin}/s/${data.share_token}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--kkb-success-light)] text-[var(--kkb-success)] text-sm font-quicksand font-semibold"
                >
                  <Share2 className="h-4 w-4" />
                </a>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Stats globales */}
            <div className="grid grid-cols-3 gap-2">
              <StatCard icon={<Users className="h-4 w-4" />} label="RÉPONDANTS" value={data.respondent_count} />
              <StatCard icon={<ThumbsUp className="h-4 w-4" />} label="PLATS NOTÉS" value={data.rated_items_count} />
              <StatCard icon={<MessageSquare className="h-4 w-4" />} label="SUGGESTIONS" value={data.comment_count} />
            </div>

            {/* Par repas */}
            {sortedItems.map(item => {
              const total    = item.aime + item.bof + item.naime_pas
              const majority = total > 0 && item.naime_pas / total > 0.5

              return (
                <div key={item.id} className="bg-white border border-[var(--kkb-border-light)] rounded-2xl p-4 space-y-3">
                  {/* Titre */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <MealTypeIcon type={item.meal_type} className="h-5 w-5 text-[var(--kkb-coral)]" />
                      <div>
                        <p className="text-[10px] font-quicksand font-semibold uppercase tracking-wider text-[var(--kkb-text-tertiary)]">
                          {MEAL_LABEL[item.meal_type] ?? item.meal_type}
                        </p>
                        <p className="font-dosis font-semibold text-sm text-[var(--kkb-text-primary)]">
                          {item.recipe_name ?? 'Repas non défini'}
                        </p>
                      </div>
                    </div>
                    {majority && (
                      <button
                        onClick={() => router.push('/plan')}
                        className="flex items-center gap-1 text-[10px] font-quicksand font-semibold text-[var(--kkb-coral)] px-2 py-1 rounded-lg border border-[var(--kkb-coral)]/30 flex-shrink-0"
                      >
                        <Pencil className="h-3 w-3" />
                        Modifier
                      </button>
                    )}
                  </div>

                  {/* Barres de distribution */}
                  {total === 0 ? (
                    <div className="flex items-center gap-2 text-xs font-quicksand text-[var(--kkb-text-tertiary)]">
                      <Inbox className="h-3.5 w-3.5" />
                      Aucun avis pour ce repas
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <DistributionBar emoji={'\u{1F60A}'} count={item.aime}      total={total} color="var(--kkb-success)" />
                      <DistributionBar emoji={'\u{1F610}'} count={item.bof}       total={total} color="var(--kkb-warning)" />
                      <DistributionBar emoji={'\u{1F615}'} count={item.naime_pas} total={total} color="var(--kkb-danger)" />
                    </div>
                  )}

                  {/* Commentaires */}
                  {item.comments.length > 0 && (
                    <div className="space-y-2 pt-1 border-t border-[var(--kkb-border-light)]/60">
                      {item.comments.map((c, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="h-6 w-6 rounded-full bg-[var(--kkb-warning-light)] flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-dosis font-bold text-[var(--kkb-warning)]">
                              {c.respondent_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-quicksand font-semibold text-[var(--kkb-text-tertiary)]">
                              {c.respondent_name} ·{' '}
                              {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: fr })}
                            </p>
                            <p className="text-xs font-quicksand text-[var(--kkb-text-primary)] mt-0.5">{c.comment}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
      </main>
    </div>
  )
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white border border-[var(--kkb-border-light)] rounded-xl p-3 text-center space-y-1">
      <div className="flex justify-center text-[var(--kkb-coral)]">{icon}</div>
      <p className="font-dosis font-bold text-lg text-[var(--kkb-text-primary)]">{value}</p>
      <p className="text-[9px] font-quicksand font-bold uppercase tracking-wider text-[var(--kkb-text-tertiary)]">{label}</p>
    </div>
  )
}

function DistributionBar({
  emoji, count, total, color,
}: {
  emoji: string; count: number; total: number; color: string
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm w-5 flex-shrink-0">{emoji}</span>
      <div className="flex-1 h-2.5 bg-[var(--kkb-border-light)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color, opacity: pct > 0 ? 1 : 0 }}
        />
      </div>
      <span className="text-[10px] font-quicksand font-semibold w-8 text-right flex-shrink-0"
        style={{ color: pct > 0 ? color : 'var(--kkb-text-tertiary)' }}>
        {pct > 0 ? `${pct}%` : '—'}
      </span>
    </div>
  )
}
