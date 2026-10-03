'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import {
  Check,
  CheckCircle,
  Clock,
  Heart,
  Key,
  KeyRound,
  LogOut,
  Pencil,
  Plus,
  Printer,
  QrCode,
  ThumbsUp,
  Users,
  Utensils,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { ShareActions, circleInvitePayload, circleJoinLinkPayload, circleJoinUrl } from '@/components/ui/share-actions'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton-card'
import { MealTypeIcon } from '@/components/ui/meal-type-icon'
import { MEAL_LABEL, type MealType } from '@/lib/constants/meal-type'
import { PREF_TYPE_OPTIONS, prefChipStyle, type Pref, type PrefType, type Severity } from '@/lib/constants/dietary-pref'
import { pickActiveCircle } from '@/lib/utils/active-circle'
import { toast } from '@/lib/stores/toast-store'
import { CircleSwitcher } from '@/components/circle/circle-switcher'

const AVATAR_COLORS = ['var(--kkb-coral)', 'var(--kkb-success)', 'var(--kkb-warning)', 'var(--kkb-teal)', 'var(--kkb-text-secondary)']

const ROLE_LABEL: Record<string, string> = { planificatrice: 'Planificatrice', membre: 'Membre' }
const ROLE_BADGE: Record<string, string> = {
  planificatrice: 'bg-[var(--kkb-coral)] text-white',
  membre:         'bg-[var(--kkb-teal-light)] text-[var(--kkb-teal)]',
}
const ROLE_DESCRIPTION: Record<string, string> = {
  planificatrice: 'Planifie les repas de la semaine, valide la liste de courses et coordonne les votes de la famille.',
  membre:         'Vote pour les repas de la semaine et partage ses avis après chaque repas.',
}

interface Member {
  id: string
  role: string
  joined_at: string
  users: { id: string; display_name: string; email: string; member_dietary_prefs: Pref[] } | null
}

interface Circle {
  id: string
  name: string
  invite_code: string
  created_by: string
  family_circle_members: Member[]
  my_role: string
}

interface MealConfig {
  meal_type:    MealType
  is_active:    boolean
  mode:         'daily' | 'template'
  default_time: string | null
}

interface CircleStats {
  meals_rated_month: number
  favorites_count:   number
}

const SHARE_GHOST = 'flex-1 flex items-center justify-center gap-1.5 rounded-[var(--kkb-radius-pill)] border border-[var(--kkb-border)] bg-white py-2.5 font-quicksand text-sm font-bold text-[var(--kkb-text-secondary)] transition-colors hover:border-[var(--kkb-coral)] hover:text-[var(--kkb-coral)] disabled:opacity-60'
const SHARE_TEAL  = 'flex-1 flex items-center justify-center gap-1.5 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-teal)] py-2.5 font-quicksand text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60'

function prefsSummary(prefs: Pref[]): string {
  if (prefs.length === 0) return 'Aucune préférence renseignée'
  return prefs.slice(0, 3).map((p) => p.value).join(' · ') + (prefs.length > 3 ? '…' : '')
}

export default function CirclePage() {
  const router = useRouter()
  const [circles, setCircles] = useState<Circle[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [mealConfigs, setMealConfigs] = useState<MealConfig[]>([])
  const [plannerName, setPlannerName] = useState<string | null>(null)
  const [stats, setStats] = useState<CircleStats | null>(null)

  // ── Préférences alimentaires ─────────────────────────────────────────────
  const [sheetTarget, setSheetTarget] = useState<{ circleId: string; userId: string; displayName: string } | null>(null)
  const [prefValue,    setPrefValue]    = useState('')
  const [prefType,     setPrefType]     = useState<PrefType>('allergy')
  const [prefSeverity, setPrefSeverity] = useState<Severity>('strict')
  const [savingPref,   setSavingPref]   = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/circles')
      .then((r) => r.json())
      .then((res) => {
        setCircles(res?.data ?? [])
        setActiveId(pickActiveCircle<Circle>(res)?.id ?? null)
        setCurrentUserId(res?.viewer_id ?? null)
        setLoading(false)
      })
      .catch(() => { toast.error('Erreur de connexion'); setLoading(false) })
    fetch('/api/users/me/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => setStats(s))
      .catch(() => {})
  }, [])

  // Moments de repas du cercle affiché (configuration de sa planificatrice,
  // lisible par tous les membres).
  useEffect(() => {
    if (!activeId) return
    setMealConfigs([])
    fetch(`/api/circles/${activeId}/meal-config`)
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        setMealConfigs(Array.isArray(res?.configs) ? res.configs : [])
        setPlannerName(res?.planner_name ?? null)
      })
      .catch(() => {})
  }, [activeId])

  async function switchCircle(id: string) {
    const res = await fetch('/api/circles/active', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ circle_id: id }),
    })
    if (!res.ok) { toast.error('Impossible de changer de cercle'); return }
    setActiveId(id)
    toast.success(`Cercle actif : ${circles.find((c) => c.id === id)?.name ?? ''}`)
    // En-tête, rôle et navigation sont rendus côté serveur.
    router.refresh()
  }

  async function removeMember(circleId: string, userId: string) {
    const res = await fetch(`/api/circles/${circleId}/members/${userId}`, { method: 'DELETE' })
    if (res.ok) {
      setCircles((prev) =>
        prev.map((c) =>
          c.id === circleId
            ? { ...c, family_circle_members: c.family_circle_members.filter((m) => m.users?.id !== userId) }
            : c
        )
      )
    }
  }

  async function leaveCircle(circleId: string) {
    if (!currentUserId) return
    const res = await fetch(`/api/circles/${circleId}/members/${currentUserId}`, { method: 'DELETE' })
    if (res.ok) {
      const remaining = circles.filter((c) => c.id !== circleId)
      setCircles(remaining)
      if (activeId === circleId) setActiveId(remaining[0]?.id ?? null)
      router.refresh()
    }
  }

  function openPrefSheet(circleId: string, userId: string, displayName: string) {
    setSheetTarget({ circleId, userId, displayName })
    setPrefValue('')
    setPrefType('allergy')
    setPrefSeverity('strict')
  }

  function closePrefSheet() {
    setSheetTarget(null)
  }

  async function savePref() {
    if (!sheetTarget || !prefValue.trim() || savingPref) return
    setSavingPref(true)
    try {
      const res = await fetch(`/api/circles/${sheetTarget.circleId}/members/${sheetTarget.userId}/prefs`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          pref_type: prefType,
          value:     prefValue.trim(),
          severity:  prefType === 'allergy' ? prefSeverity : undefined,
        }),
      })
      if (!res.ok) return
      const saved: Pref = await res.json()
      setCircles((prev) =>
        prev.map((c) =>
          c.id === sheetTarget.circleId
            ? {
                ...c,
                family_circle_members: c.family_circle_members.map((m) => {
                  if (!m.users || m.users.id !== sheetTarget.userId) return m
                  const users = m.users
                  return {
                    ...m,
                    users: {
                      ...users,
                      member_dietary_prefs: [
                        ...users.member_dietary_prefs.filter((p) => p.id !== saved.id),
                        saved,
                      ],
                    },
                  }
                }),
              }
            : c
        )
      )
      closePrefSheet()
    } finally {
      setSavingPref(false)
    }
  }

  async function deletePref(circleId: string, userId: string, prefId: string) {
    if (confirmDeleteId !== prefId) {
      setConfirmDeleteId(prefId)
      setTimeout(() => setConfirmDeleteId((cur) => (cur === prefId ? null : cur)), 3000)
      return
    }
    setConfirmDeleteId(null)
    const res = await fetch(`/api/circles/${circleId}/members/${userId}/prefs/${prefId}`, { method: 'DELETE' })
    if (res.ok) {
      setCircles((prev) =>
        prev.map((c) =>
          c.id === circleId
            ? {
                ...c,
                family_circle_members: c.family_circle_members.map((m) => {
                  if (!m.users || m.users.id !== userId) return m
                  const users = m.users
                  return { ...m, users: { ...users, member_dietary_prefs: users.member_dietary_prefs.filter((p) => p.id !== prefId) } }
                }),
              }
            : c
        )
      )
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-lg space-y-3 px-4 py-6 lg:max-w-[1100px] lg:px-8" aria-busy="true">
        <SkeletonCard variant="list" />
        <SkeletonCard variant="meal" />
        <SkeletonCard variant="meal" />
      </div>
    )
  }

  if (circles.length === 0) {
    return (
      <div className="mx-auto max-w-sm space-y-4 px-4 py-8">
        <EmptyState
          icon={Users}
          title="Pas encore de cercle"
          description="Crée ou rejoins un cercle familial pour planifier ensemble."
          className="py-6"
        />
        <button
          type="button"
          onClick={() => router.push('/circle/create')}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral)] py-3 font-quicksand font-bold text-white transition-colors hover:bg-[var(--kkb-coral-hover)]"
        >
          <Plus className="h-4 w-4" />
          Créer un cercle
        </button>
        <button
          type="button"
          onClick={() => router.push('/circle/join')}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--kkb-radius-pill)] border border-[var(--kkb-border)] bg-white py-3 font-quicksand font-bold text-[var(--kkb-text-secondary)] transition-colors hover:bg-[var(--kkb-bg)]"
        >
          <Key className="h-4 w-4" />
          Rejoindre avec un code
        </button>
      </div>
    )
  }

  // Afficher le premier cercle (MVP : un seul cercle à la fois)
  const circle = circles.find((c) => c.id === activeId) ?? circles[0]
  const members = (circle.family_circle_members ?? []).filter((m) => m.users)
  const isPlanificatrice = circle.my_role === 'planificatrice'
  const me = members.find((m) => m.users!.id === currentUserId)
  const myPrefs = me?.users?.member_dietary_prefs ?? []

  // Puces de préférences d'un membre (suppression au 2e tap + "Ajouter").
  function prefChips(m: Member, size: 'sm' | 'md') {
    const u = m.users!
    const isCurrentUser = u.id === currentUserId
    const canManagePrefs = isCurrentUser || isPlanificatrice
    const prefs = u.member_dietary_prefs ?? []
    const chip = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
    const icon = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {prefs.map((pref) => {
          const { className, Icon } = prefChipStyle(pref)
          const confirming = confirmDeleteId === pref.id
          return (
            <button
              key={pref.id}
              type="button"
              disabled={!canManagePrefs}
              onClick={() => canManagePrefs && void deletePref(circle.id, u.id, pref.id)}
              className={`inline-flex items-center gap-1 rounded-[var(--kkb-radius-pill)] border font-quicksand font-semibold ${chip} ${
                confirming ? 'border-[var(--kkb-danger)] bg-[var(--kkb-danger-light)] text-[var(--kkb-danger)]' : className
              } ${canManagePrefs ? '' : 'cursor-default'}`}
            >
              {confirming ? <X className={icon} /> : Icon && <Icon className={icon} />}
              {confirming ? 'Supprimer ?' : pref.value}
            </button>
          )
        })}
        {canManagePrefs && (
          <button
            type="button"
            onClick={() => openPrefSheet(circle.id, u.id, u.display_name || u.email)}
            className={`inline-flex items-center gap-1 rounded-[var(--kkb-radius-pill)] border border-dashed border-[var(--kkb-coral)]/50 font-quicksand font-semibold text-[var(--kkb-coral)] ${chip}`}
          >
            <Plus className={icon} />
            Ajouter
          </button>
        )}
      </div>
    )
  }

  function roleBadge(role: string) {
    return (
      <span className={`rounded-[var(--kkb-radius-pill)] px-2 py-0.5 font-quicksand text-[10px] font-bold uppercase tracking-wide ${ROLE_BADGE[role] ?? ROLE_BADGE.membre}`}>
        {ROLE_LABEL[role] ?? role}
      </span>
    )
  }

  function avatar(m: Member, index: number, size: number) {
    const u = m.users!
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-full font-dosis font-bold text-white"
        style={{ backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length], width: size, height: size, fontSize: size * 0.4 }}
      >
        {(u.display_name || u.email)[0].toUpperCase()}
      </span>
    )
  }

  const removeButton = (m: Member) =>
    isPlanificatrice && m.users!.id !== currentUserId ? (
      <button
        type="button"
        onClick={() => void removeMember(circle.id, m.users!.id)}
        className="shrink-0 rounded-[var(--kkb-radius-pill)] px-2.5 py-1 font-quicksand text-xs font-semibold text-[var(--kkb-danger)] transition-colors hover:bg-[var(--kkb-danger-light)]"
      >
        Retirer
      </button>
    ) : null

  const aloneState = members.length <= 1 && (
    <div className="rounded-[var(--kkb-radius-card)] border border-dashed border-[var(--kkb-border)] bg-white">
      {/* Pas de bouton : le code d'invitation et le partage sont déjà visibles */}
      <EmptyState
        icon={Users}
        title="Tu es seul(e) dans ce cercle pour l'instant"
        description="Invite ta famille avec le code ou le lien d'accès."
        className="py-8"
      />
    </div>
  )

  const otherActions = (
    <div className="space-y-2 pt-2">
      <button
        type="button"
        onClick={() => router.push('/circle/create')}
        className="flex w-full items-center justify-center gap-2 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white py-3 font-quicksand text-sm font-semibold text-[var(--kkb-text-secondary)] transition-colors hover:bg-[var(--kkb-coral-light)]"
      >
        <Plus className="h-4 w-4" />
        Créer ou rejoindre un autre cercle
      </button>
      {!isPlanificatrice && (
        <button
          type="button"
          onClick={() => void leaveCircle(circle.id)}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--kkb-radius-card)] py-3 font-quicksand text-sm font-semibold text-[var(--kkb-danger)] transition-colors hover:bg-[var(--kkb-danger-light)]"
        >
          <LogOut className="h-4 w-4" />
          Quitter le cercle
        </button>
      )}
    </div>
  )

  // Le cercle affiché est le cercle actif (users.active_circle_id).
  const statusRow = (
    <div className="flex items-center justify-between rounded-[var(--kkb-radius-sm)] border border-[var(--kkb-border-light)] px-3 py-2">
      <span className="font-quicksand text-xs font-semibold text-[var(--kkb-text-secondary)]">Statut cercle</span>
      <span className="inline-flex items-center gap-1.5 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-success-light)] px-2.5 py-1 font-quicksand text-xs font-bold text-[var(--kkb-success)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--kkb-success)]" /> Actif
      </span>
    </div>
  )

  return (
    <>
      {/* ─── Mobile ─────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-lg space-y-5 px-4 pb-6 pt-4 lg:hidden print:hidden">
        {/* Statut du cercle */}
        <section className="space-y-3 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-4">
          <CircleSwitcher circles={circles} activeId={circle.id} onSelect={switchCircle}>
            <span className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--kkb-coral-light)]">
                <Users className="h-5 w-5 text-[var(--kkb-coral)]" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-dosis text-lg font-bold text-[var(--kkb-text-primary)]">{circle.name}</span>
                <span className="block font-quicksand text-xs text-[var(--kkb-text-tertiary)]">
                  {members.length} {members.length > 1 ? 'convives' : 'convive'}
                  {circles.length > 1 && ` · ${circles.length} cercles`}
                </span>
              </span>
            </span>
          </CircleSwitcher>
          {statusRow}
          <p className="flex items-start gap-2 rounded-[var(--kkb-radius-sm)] bg-[var(--kkb-warning-light)] p-3 font-quicksand text-[13px] text-[var(--kkb-text-secondary)]">
            <Utensils className="mt-0.5 h-4 w-4 shrink-0 text-[var(--kkb-warning)]" />
            <span>
              <strong className="font-bold">Cuisine du cœur :</strong> vos votes et appétits guident le menu de la semaine
              {plannerName && !isPlanificatrice ? ` préparé par ${plannerName}` : ''}.
            </span>
          </p>
        </section>

        {/* Code d'invitation */}
        <section className="space-y-3 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-4">
          <p className="flex items-center gap-1.5 font-quicksand text-[10px] font-bold uppercase tracking-wider text-[var(--kkb-text-tertiary)]">
            <KeyRound className="h-3.5 w-3.5 text-[var(--kkb-coral)]" /> Code d&apos;invitation au cercle
          </p>
          <p className="font-dosis text-[28px] font-extrabold tracking-wider text-[var(--kkb-coral)]">{circle.invite_code}</p>
          <p className="font-quicksand text-[13px] text-[var(--kkb-text-secondary)]">
            Partage ce code avec un proche ou un invité du dimanche pour qu&apos;il vote et donne son avis sur les repas.
          </p>
          <ShareActions
            getPayload={() => circleInvitePayload(circle.name, circle.invite_code)}
            copyLabel="Copier"
            className="flex flex-row-reverse items-center gap-2"
            buttonClassName={SHARE_GHOST}
            shareButtonClassName={SHARE_TEAL}
          />
          <ShareActions
            getPayload={() => circleJoinLinkPayload(circle.name, circle.invite_code)}
            copyLabel="Copier le lien d'accès"
            className="flex items-center gap-2"
            buttonClassName={SHARE_GHOST}
            shareButtonClassName="hidden"
          />
        </section>

        {/* Membres */}
        <section className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 font-dosis text-lg font-bold text-[var(--kkb-text-primary)]">
                Membres de la tablée
                <span className="rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-teal-light)] px-2 py-0.5 font-quicksand text-xs font-bold text-[var(--kkb-teal)]">{members.length}</span>
              </h2>
              <p className="font-quicksand text-xs text-[var(--kkb-text-tertiary)]">Réunis autour des saveurs de la maison</p>
            </div>
            <UtensilsCrossed className="mt-1 h-5 w-5 text-[var(--kkb-text-tertiary)]" />
          </div>

          {aloneState}

          <div className="space-y-2">
            {members.map((m, index) => {
              const u = m.users!
              const isCurrentUser = u.id === currentUserId
              return (
                <div key={m.id} className="space-y-2.5 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-3">
                  <div className="flex items-center gap-3">
                    {avatar(m, index, 40)}
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate font-quicksand text-sm font-bold text-[var(--kkb-text-primary)]">{u.display_name || u.email}</span>
                        {isCurrentUser && (
                          <span className="rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral-light)] px-2 py-0.5 font-quicksand text-[10px] font-bold text-[var(--kkb-coral)]">Moi</span>
                        )}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        {roleBadge(m.role)}
                        <span className="truncate font-quicksand text-xs text-[var(--kkb-text-tertiary)]">{prefsSummary(u.member_dietary_prefs ?? [])}</span>
                      </div>
                    </div>
                    {removeButton(m)}
                  </div>
                  {prefChips(m, 'sm')}
                </div>
              )
            })}
          </div>
        </section>

        {/* Moments de repas (lecture) */}
        {mealConfigs.length > 0 && (
          <section className="space-y-3 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 font-quicksand text-[13px] font-bold text-[var(--kkb-text-primary)]">
                <Clock className="h-4 w-4 text-[var(--kkb-teal)]" />
                Moments de repas · {mealConfigs.filter((c) => c.is_active).length} créneaux
              </p>
              {isPlanificatrice && (
                <Link href="/settings/meal-config" className="font-quicksand text-xs font-bold text-[var(--kkb-coral)]">Ajuster</Link>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {mealConfigs.map((c) => (
                <div
                  key={c.meal_type}
                  className={`rounded-[var(--kkb-radius-sm)] border p-2.5 ${c.is_active ? 'border-[var(--kkb-border)] bg-[var(--kkb-bg)]' : 'border-dashed border-[var(--kkb-border)] opacity-60'}`}
                >
                  <p className="flex items-center gap-1.5 font-quicksand text-xs font-bold text-[var(--kkb-text-primary)]">
                    <MealTypeIcon type={c.meal_type} className="h-3.5 w-3.5 text-[var(--kkb-coral)]" />
                    {MEAL_LABEL[c.meal_type]}
                    <span className={`ml-auto h-2 w-2 rounded-full ${c.is_active ? 'bg-[var(--kkb-success)]' : 'bg-[var(--kkb-border)]'}`} aria-label={c.is_active ? 'Actif' : 'Inactif'} />
                  </p>
                  <p className="mt-1 font-quicksand text-[11px] text-[var(--kkb-text-tertiary)]">
                    {c.default_time ? c.default_time.slice(0, 5) : '—'} · {c.is_active ? (c.mode === 'daily' ? 'Quotidien' : 'Hebdomadaire') : 'Inactif'}
                  </p>
                </div>
              ))}
            </div>
            <p className="font-quicksand text-[11px] text-[var(--kkb-text-tertiary)]">
              Horaires synchronisés avec le planning de préparation{plannerName && !isPlanificatrice ? ` de ${plannerName}` : ''}
            </p>
          </section>
        )}

        {/* Mon assiette personnalisée */}
        {me && (
          <section className="space-y-3 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="font-dosis text-base font-bold text-[var(--kkb-text-primary)]">Mon assiette personnalisée</p>
              <button
                type="button"
                onClick={() => openPrefSheet(circle.id, me.users!.id, me.users!.display_name || me.users!.email)}
                className="flex items-center gap-1 font-quicksand text-xs font-bold text-[var(--kkb-coral)]"
              >
                <Pencil className="h-3.5 w-3.5" /> {myPrefs.length} critère{myPrefs.length > 1 ? 's' : ''}
              </button>
            </div>
            {prefChips(me, 'md')}
            <p className="font-quicksand text-xs italic text-[var(--kkb-text-tertiary)]">
              Ces filtres alimentent automatiquement la génération du menu de la semaine.
            </p>
          </section>
        )}

        {/* Stats */}
        <section className="grid grid-cols-2 gap-2">
          {[
            { icon: ThumbsUp, value: stats?.meals_rated_month, label: 'Repas notés ce mois' },
            { icon: Heart,    value: stats?.favorites_count,   label: 'Plats favoris' },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-4">
              <Icon className="h-5 w-5 text-[var(--kkb-coral)]" />
              <p className="mt-2 font-dosis text-2xl font-bold text-[var(--kkb-text-primary)]">{value ?? '–'}</p>
              <p className="font-quicksand text-xs text-[var(--kkb-text-tertiary)]">{label}</p>
            </div>
          ))}
        </section>

        {otherActions}
      </div>

      {/* ─── Desktop ────────────────────────────────────────────────────── */}
      <div className="mx-auto hidden max-w-[1200px] px-8 py-8 lg:block print:block print:p-0">
        <div className="mb-6 flex items-start justify-between gap-6 print:hidden">
          <div>
          <p className="font-quicksand text-[11px] font-bold uppercase tracking-wider text-[var(--kkb-coral)]">Tablée &amp; gouvernance</p>
          <h1 className="font-dosis text-3xl font-bold text-[var(--kkb-text-primary)]">Cercle familial · {circle.name}</h1>
          <p className="mt-1 max-w-2xl font-quicksand text-sm text-[var(--kkb-text-secondary)]">
            Réunissez votre tablée pour voter les repas de la semaine et partager les préférences de chacun.
          </p>
          </div>
          <div className="w-72 shrink-0 space-y-2 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-3">
            <CircleSwitcher circles={circles} activeId={circle.id} onSelect={switchCircle}>
              <span className="block truncate font-dosis text-base font-bold text-[var(--kkb-text-primary)]">{circle.name}</span>
              <span className="block font-quicksand text-xs text-[var(--kkb-text-tertiary)]">
                {members.length} {members.length > 1 ? 'convives' : 'convive'}
                {circles.length > 1 && ` · ${circles.length} cercles`}
              </span>
            </CircleSwitcher>
            {statusRow}
          </div>
        </div>

        <div className="grid grid-cols-[280px_minmax(0,1fr)] items-start gap-8 print:block">
          {/* Colonne gauche : invitation */}
          <aside className="space-y-4">
            <section className="space-y-3 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-coral)] bg-[var(--kkb-coral-light)] p-5 print:hidden">
              <p className="font-quicksand text-[10px] font-bold uppercase tracking-wider text-[var(--kkb-text-tertiary)]">Code unique du foyer</p>
              <p className="font-dosis text-[32px] font-extrabold leading-none tracking-wider text-[var(--kkb-coral)]">{circle.invite_code}</p>
              <p className="font-quicksand text-xs text-[var(--kkb-text-secondary)]">
                Partage ce code avec les enfants ou ton conjoint(e) pour rejoindre la tablée.
              </p>
              <ShareActions
                getPayload={() => circleInvitePayload(circle.name, circle.invite_code)}
                copyLabel="Copier"
                className="flex flex-col gap-2"
                buttonClassName={SHARE_GHOST + ' w-full flex-none'}
                shareButtonClassName={SHARE_TEAL + ' w-full flex-none'}
              />
            </section>

            <section className="space-y-3 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-5 text-center print:border-0">
              <div className="flex items-center justify-between print:justify-center">
                <p className="flex items-center gap-1.5 font-quicksand text-sm font-bold text-[var(--kkb-text-primary)]">
                  <QrCode className="h-4 w-4 text-[var(--kkb-teal)]" /> Scan direct à table
                </p>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1 font-quicksand text-xs font-bold text-[var(--kkb-coral)] print:hidden"
                >
                  <Printer className="h-3.5 w-3.5" /> Imprimer
                </button>
              </div>
              <div className="mx-auto w-fit rounded-[var(--kkb-radius-sm)] bg-white p-3">
                <QRCodeSVG value={circleJoinUrl(circle.invite_code)} size={160} fgColor="#0E5A5E" />
              </div>
              <p className="hidden font-dosis text-2xl font-extrabold text-[var(--kkb-coral)] print:block">{circle.invite_code}</p>
              <p className="font-quicksand text-xs text-[var(--kkb-text-secondary)]">
                Scanner avec l&apos;appareil photo pour rejoindre la tablée en 10 secondes.
              </p>
            </section>
          </aside>

          {/* Colonne droite : membres */}
          <section className="space-y-4 print:hidden">
            <h2 className="flex items-center gap-3 font-dosis text-2xl font-bold text-[var(--kkb-text-primary)]">
              Membres du cercle
              <span className="rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-teal-light)] px-2.5 py-0.5 font-quicksand text-sm font-bold text-[var(--kkb-teal)]">{members.length}</span>
            </h2>

            {aloneState}

            <div className="overflow-hidden rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white">
              {members.map((m, index) => {
                const u = m.users!
                const isCurrentUser = u.id === currentUserId
                return (
                  <div key={m.id} className="space-y-3 border-b border-[var(--kkb-border)] p-5 last:border-b-0">
                    <div className="flex items-center gap-4">
                      {avatar(m, index, 48)}
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="font-dosis text-lg font-semibold text-[var(--kkb-text-primary)]">{u.display_name || u.email}</span>
                          {roleBadge(m.role)}
                          {isCurrentUser && (
                            <span className="rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral-light)] px-2 py-0.5 font-quicksand text-[10px] font-bold uppercase text-[var(--kkb-coral)]">Vous</span>
                          )}
                        </p>
                        <p className="font-quicksand text-sm text-[var(--kkb-coral)]">{m.role === 'planificatrice' ? 'Cheffe du foyer' : 'Membre votant'}</p>
                      </div>
                      {removeButton(m)}
                    </div>
                    {m.role === 'planificatrice' && (
                      <div className="rounded-[var(--kkb-radius-sm)] bg-[var(--kkb-success-light)] p-3">
                        <p className="flex items-center gap-1.5 font-quicksand text-xs font-bold text-[var(--kkb-success)]">
                          <CheckCircle className="h-3.5 w-3.5" /> Rôle actif au sein du foyer
                        </p>
                        <p className="mt-1 font-quicksand text-[13px] text-[var(--kkb-text-secondary)]">{ROLE_DESCRIPTION.planificatrice}</p>
                      </div>
                    )}
                    {prefChips(m, 'md')}
                  </div>
                )
              })}
            </div>

            {otherActions}
          </section>
        </div>
      </div>

      {/* Feuille : ajouter une préférence alimentaire */}
      {sheetTarget && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40" onClick={closePrefSheet} />
          <div className="fixed bottom-0 left-0 right-0 z-[61] max-h-[85vh] space-y-4 overflow-y-auto rounded-t-3xl bg-white p-5 lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:w-[440px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-3xl">
            <div className="flex items-start justify-between">
              <p className="font-dosis text-base font-bold text-[var(--kkb-text-primary)]">
                Préférence de {sheetTarget.displayName}
              </p>
              <button type="button" onClick={closePrefSheet} className="-mr-1 p-1 text-[var(--kkb-text-tertiary)]" aria-label="Fermer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <input
              type="text"
              placeholder="Ingrédient ou plat…"
              aria-label="Ingrédient ou plat"
              value={prefValue}
              onChange={(e) => setPrefValue(e.target.value)}
              autoFocus
              className="w-full rounded-xl border border-[var(--kkb-border)] bg-[var(--kkb-bg)] px-3 py-2.5 font-quicksand text-sm text-[var(--kkb-text-primary)] outline-none placeholder:text-[var(--kkb-text-tertiary)] focus:border-[var(--kkb-coral-hover)]"
            />

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PREF_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPrefType(opt.value)}
                  className={`rounded-xl border py-2 font-quicksand text-xs font-medium transition-colors ${
                    prefType === opt.value
                      ? 'border-[var(--kkb-coral)] bg-[var(--kkb-coral)] text-white'
                      : 'border-[var(--kkb-border)] bg-white text-[var(--kkb-text-secondary)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {prefType === 'allergy' && (
              <div className="flex gap-2">
                {([['strict', 'Sévère (exclure des repas)'], ['light', 'Légère (éviter)']] as const).map(([s, label]) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPrefSeverity(s)}
                    className={`flex-1 rounded-xl border py-2 font-quicksand text-xs font-medium transition-colors ${
                      prefSeverity === s
                        ? s === 'strict'
                          ? 'border-[var(--kkb-danger)] bg-[var(--kkb-danger-light)] text-[var(--kkb-danger)]'
                          : 'border-[var(--kkb-warning)] bg-[var(--kkb-warning-light)] text-[var(--kkb-text-secondary)]'
                        : 'border-[var(--kkb-border)] bg-white text-[var(--kkb-text-secondary)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => void savePref()}
              disabled={!prefValue.trim() || savingPref}
              className="flex w-full items-center justify-center gap-2 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral)] py-3 font-quicksand text-sm font-bold text-white transition-opacity disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {savingPref ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </>
      )}
    </>
  )
}
