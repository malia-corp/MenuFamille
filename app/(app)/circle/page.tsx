'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import {
  Check,
  Clock,
  Heart,
  Info,
  Key,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Plus,
  Power,
  Printer,
  QrCode,
  ThumbsUp,
  UserMinus,
  Users,
  X,
} from 'lucide-react'
import { ShareActions, circleInvitePayload, circleJoinLinkPayload, circleJoinUrl } from '@/components/ui/share-actions'
import { EmptyState } from '@/components/ui/empty-state'
import { Switch } from '@/components/ui/switch'
import { MealTypeIcon } from '@/components/ui/meal-type-icon'
import { MEAL_COLOR, MEAL_LABEL, type MealType } from '@/lib/constants/meal-type'
import { PREF_TYPE_OPTIONS, prefChipStyle, type Pref, type PrefType, type Severity } from '@/lib/constants/dietary-pref'
import { pickActiveCircle } from '@/lib/utils/active-circle'
import { toast } from '@/lib/stores/toast-store'
import { CircleSwitcher } from '@/components/circle/circle-switcher'
import { CircleSkeleton } from '@/components/skeletons/page-skeletons'

const AVATAR_COLORS = ['var(--kkb-orange)', 'var(--kkb-foret-500)', 'var(--kkb-jaune-900)', 'var(--kkb-foret)', 'var(--kkb-texte-2)']

const ROLE_LABEL: Record<string, string> = { planificatrice: 'Planificatrice', membre: 'Membre' }
const ROLE_BADGE: Record<string, string> = {
  planificatrice: 'bg-[var(--kkb-foret)] text-[var(--kkb-creme)]',
  membre:         'bg-[var(--kkb-foret-50)] text-[var(--kkb-foret)]',
}
const ROLE_DESCRIPTION: Record<string, string> = {
  planificatrice: 'Planifie les repas de la semaine, valide la liste de courses et coordonne les votes de la famille.',
  membre:         'Vote pour les repas de la semaine et partage ses avis après chaque repas.',
}

interface Member {
  id: string
  role: string
  joined_at: string
  is_active?: boolean
  users: { id: string; display_name: string; email: string; member_dietary_prefs: Pref[] } | null
}

interface Circle {
  id: string
  name: string
  invite_code: string | null   // null si l'on est désactivé dans ce cercle
  created_by: string
  family_circle_members: Member[]
  my_role: string
  my_is_active: boolean
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

// « Imalyn, Koffi, Aïcha et Sena »
function joinNames(names: string[]): string {
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`
}

export default function CirclePage() {
  const router = useRouter()
  const [circles, setCircles] = useState<Circle[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  // activeId : cercle actif (users.active_circle_id, action explicite) ;
  // viewedId : cercle sélectionné pour consultation (sans l'activer).
  const [activeId, setActiveId] = useState<string | null>(null)
  const [viewedId, setViewedId] = useState<string | null>(null)
  const [activating, setActivating] = useState(false)
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
  const [showQr, setShowQr] = useState(false)

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

  const shownId = viewedId ?? activeId
  const shown   = circles.find((c) => c.id === shownId) ?? circles[0]

  // Moments de repas du cercle consulté (configuration de sa planificatrice,
  // lisible par ses membres actifs).
  useEffect(() => {
    setMealConfigs([])
    setPlannerName(null)
    if (!shown?.id || !shown.my_is_active) return
    fetch(`/api/circles/${shown.id}/meal-config`)
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        setMealConfigs(Array.isArray(res?.configs) ? res.configs : [])
        setPlannerName(res?.planner_name ?? null)
      })
      .catch(() => {})
  }, [shown?.id, shown?.my_is_active])

  // Sélection : on consulte le cercle, sans l'activer.
  async function selectCircle(id: string) {
    setViewedId(id)
  }

  // Activation explicite du cercle consulté.
  async function activateCircle(id: string) {
    setActivating(true)
    try {
      const res = await fetch('/api/circles/active', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ circle_id: id }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error ?? 'Impossible d\'activer ce cercle')
        return
      }
      setActiveId(id)
      toast.success(`Cercle actif : ${circles.find((c) => c.id === id)?.name ?? ''}`)
      // En-tête, rôle et navigation sont rendus côté serveur.
      router.refresh()
    } finally {
      setActivating(false)
    }
  }

  // Planificatrice : activer / désactiver un membre (il garde son historique).
  async function setMemberActive(circleId: string, userId: string, isActive: boolean) {
    const res = await fetch(`/api/circles/${circleId}/members/${userId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ is_active: isActive }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      toast.error(d.error ?? 'Impossible de changer le statut')
      return
    }
    setCircles((prev) =>
      prev.map((c) =>
        c.id === circleId
          ? { ...c, family_circle_members: c.family_circle_members.map((m) => (m.users?.id === userId ? { ...m, is_active: isActive } : m)) }
          : c
      )
    )
    toast.success(isActive ? 'Membre réactivé' : 'Membre désactivé')
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
      if (viewedId === circleId) setViewedId(null)
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

  if (loading) return <CircleSkeleton />

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

  // Cercle consulté (sélection), par défaut le cercle actif.
  const circle = shown
  const isActiveCircle = circle.id === activeId
  const members = (circle.family_circle_members ?? []).filter((m) => m.users)
  const isPlanificatrice = circle.my_role === 'planificatrice'
  const me = members.find((m) => m.users!.id === currentUserId)

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
            className={`inline-flex items-center gap-1 rounded-[var(--kkb-radius-pill)] border border-dashed border-[var(--kkb-foret-300)] font-quicksand font-semibold text-[var(--kkb-foret)] ${chip}`}
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
      <span className={`rounded-[var(--kkb-radius-pill)] px-2 py-0.5 font-quicksand text-xs font-bold ${ROLE_BADGE[role] ?? ROLE_BADGE.membre}`}>
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

  const aloneState = members.length <= 1 && (
    <div className="rounded-[var(--kkb-r-lg)] border-[1.5px] border-dashed border-[var(--kkb-filet)] bg-white">
      {/* Pas de bouton : le code d'invitation et le partage sont déjà visibles */}
      <EmptyState
        icon={Users}
        title="La table n'attend plus que ta famille"
        description="Partage le code du foyer ou le lien d'accès pour qu'elle te rejoigne."
        className="py-8"
      />
    </div>
  )

  const otherActions = (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => router.push('/circle/create')}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-dashed border-[var(--kkb-foret-300)] font-quicksand text-sm font-semibold text-[var(--kkb-foret)] transition-colors hover:bg-[var(--kkb-foret-50)]"
      >
        <Plus className="h-4 w-4" />
        Créer ou rejoindre un autre cercle
      </button>
      {!isPlanificatrice && (
        <button
          type="button"
          onClick={() => void leaveCircle(circle.id)}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full font-quicksand text-sm font-semibold text-[var(--kkb-danger)] transition-colors hover:bg-[var(--kkb-danger-light)]"
        >
          <LogOut className="h-4 w-4" />
          Quitter le cercle
        </button>
      )}
    </div>
  )

  const switcherProps = { circles, selectedId: circle.id, activeId, onSelect: selectCircle }

  // Accès désactivé par la planificatrice : ni membres, ni code, ni menu ;
  // seulement ses propres informations et l'historique de ses avis.
  if (!circle.my_is_active) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 pb-8 pt-2 lg:max-w-2xl lg:px-0 lg:pt-0">
        <section className="rounded-[var(--kkb-r-xl)] bg-[var(--kkb-foret)] p-5 lg:p-6">
          <p className="font-quicksand text-sm font-semibold text-[var(--kkb-foret-100)]">
            Cercle familial{circles.length > 1 ? ` · ${circles.length} cercles` : ''}
          </p>
          <CircleSwitcher {...switcherProps} tone="onDark" className="mt-0.5 w-fit max-w-full">
            <span className="block truncate text-h1 text-[var(--kkb-creme)]">{circle.name}</span>
          </CircleSwitcher>
          <span className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-full bg-white/10 px-3 font-quicksand text-xs font-bold text-[var(--kkb-foret-100)]">
            <Lock className="h-3.5 w-3.5" /> Accès en pause
          </span>
        </section>
        <section className="rounded-[var(--kkb-r-xl)] bg-white">
          <EmptyState
            icon={Lock}
            title="Ton accès à ce cercle est en pause"
            description="La planificatrice a mis ta participation en pause : tu ne vois plus le menu, les sondages ni les membres. Tu gardes l'historique de tes avis."
            ctaLabel="Voir mes avis"
            ctaHref="/feedback"
            className="py-8"
          />
        </section>
        {me && (
          <section className="space-y-3 rounded-[var(--kkb-r-xl)] bg-white p-5">
            <p className="text-h3 text-[var(--kkb-profond)]">Mon assiette personnalisée</p>
            {prefChips(me, 'md')}
          </section>
        )}
        {otherActions}
      </div>
    )
  }

  // Membre actif : le code d'invitation est toujours renvoyé par l'API.
  const inviteCode    = circle.invite_code ?? ''
  const activeMembers = members.filter((m) => m.is_active !== false)
  const activeMeals   = mealConfigs.filter((c) => c.is_active)
  const ghostBtn = 'flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full border-[1.5px] border-[var(--kkb-filet)] bg-white font-quicksand text-sm font-semibold text-[var(--kkb-foret)] transition-colors hover:border-[var(--kkb-foret-300)] disabled:opacity-60'

  return (
    <>
      <div className="mx-auto max-w-lg px-4 pb-8 pt-2 lg:max-w-none lg:px-0 lg:pt-0 print:hidden">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          {/* ── Bandeau : le cercle, son statut, ses chiffres ──────────────── */}
          <section className="flex flex-col rounded-[var(--kkb-r-xl)] bg-[var(--kkb-foret)] p-5 lg:col-span-8 lg:row-start-1 lg:p-6">
            <p className="font-quicksand text-sm font-semibold text-[var(--kkb-foret-100)]">
              Cercle familial{circles.length > 1 ? ` · ${circles.length} cercles` : ''}
            </p>
            <CircleSwitcher {...switcherProps} tone="onDark" className="mt-0.5 w-fit max-w-full">
              <span className="block truncate text-h1 text-[var(--kkb-creme)]">{circle.name}</span>
            </CircleSwitcher>
            <p className="mt-2 max-w-xl font-quicksand text-sm text-[var(--kkb-foret-100)]">
              Vos avis et vos appétits guident le menu de la semaine
              {plannerName && !isPlanificatrice ? `, préparé par ${plannerName}` : ''}.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {isActiveCircle ? (
                <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--kkb-sauge)] px-3 font-quicksand text-xs font-bold text-[var(--kkb-profond)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--kkb-profond)]" /> Cercle actif
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => void activateCircle(circle.id)}
                  disabled={activating}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[var(--kkb-orange)] px-4 font-quicksand text-sm font-bold text-white transition-colors hover:bg-[var(--kkb-orange-700)] disabled:opacity-60"
                >
                  {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                  Activer ce cercle
                </button>
              )}
              <div className="flex -space-x-1.5" aria-hidden="true">
                {members.slice(0, 5).map((m) => (
                  <span key={m.id} className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--kkb-foret-100)] font-quicksand text-xs font-bold text-[var(--kkb-foret)] ring-2 ring-[var(--kkb-foret)]">
                    {(m.users!.display_name || m.users!.email)[0].toUpperCase()}
                  </span>
                ))}
                {members.length > 5 && (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 font-quicksand text-[11px] font-bold text-[var(--kkb-creme)] ring-2 ring-[var(--kkb-foret)]">
                    +{members.length - 5}
                  </span>
                )}
              </div>
              <p className="hidden min-w-0 truncate font-quicksand text-sm font-semibold text-[var(--kkb-foret-100)] sm:block">
                {joinNames(members.map((m) => m.users!.display_name || m.users!.email))}
              </p>
            </div>

            <dl className="mt-5 grid grid-cols-3 gap-2 lg:mt-auto lg:pt-5">
              {[
                { icon: Users,    label: 'Convives',      value: activeMembers.length, total: members.length },
                { icon: ThumbsUp, label: 'Notés ce mois', value: stats?.meals_rated_month },
                { icon: Heart,    label: 'Plats favoris', value: stats?.favorites_count },
              ].map(({ icon: Icon, label, value, total }) => (
                <div key={label} className="rounded-[var(--kkb-r-md)] bg-white/10 px-3 py-2.5">
                  <dt className="flex items-center gap-1.5 font-quicksand text-xs text-[var(--kkb-foret-100)]">
                    <Icon className="hidden h-3.5 w-3.5 shrink-0 text-[var(--kkb-sauge)] sm:block" /> <span className="truncate">{label}</span>
                  </dt>
                  <dd className="mt-0.5 font-dosis text-[20px] font-extrabold leading-tight text-[var(--kkb-creme)] tabular-nums">
                    {value ?? '–'}
                    {total !== undefined && total !== value && <span className="text-sm font-bold text-[var(--kkb-foret-100)]">/{total}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* ── Inviter à table ────────────────────────────────────────────── */}
          <section className="flex flex-col rounded-[var(--kkb-r-xl)] bg-white p-5 lg:col-span-4 lg:col-start-9 lg:row-start-1" aria-labelledby="invite-title">
            <CardTitle id="invite-title" icon={<KeyRound className="h-4 w-4" />}>Inviter à table</CardTitle>
            {/* Ticket : le code, ou le QR code à scanner à sa place. */}
            <div className="mt-3 rounded-[var(--kkb-r-lg)] border-[1.5px] border-dashed border-[var(--kkb-foret-300)] bg-[var(--kkb-foret-50)] px-4 py-3 text-center">
              {showQr ? (
                <div className="flex items-center gap-4 text-left">
                  <div className="shrink-0 rounded-[var(--kkb-r-sm)] bg-white p-1.5">
                    <QRCodeSVG value={circleJoinUrl(inviteCode)} size={92} fgColor="#294E3B" />
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <p className="font-dosis text-xl font-extrabold tracking-[0.12em] text-[var(--kkb-foret)]">{inviteCode}</p>
                    <p className="font-quicksand text-xs text-[var(--kkb-texte-2)]">À scanner avec l&apos;appareil photo.</p>
                    <button type="button" onClick={() => window.print()} className="flex items-center gap-1 font-quicksand text-xs font-bold text-[var(--kkb-foret)] hover:underline">
                      <Printer className="h-3.5 w-3.5" /> Imprimer pour la cuisine
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="font-quicksand text-xs font-semibold text-[var(--kkb-texte-2)]">Code du foyer</p>
                  <p className="font-dosis text-[32px] font-extrabold leading-tight tracking-[0.12em] text-[var(--kkb-foret)]">{inviteCode}</p>
                </>
              )}
            </div>
            <p className="mt-3 font-quicksand text-[13px] text-[var(--kkb-texte-2)]">
              Un proche, un invité du dimanche : avec ce code, il rejoint la tablée et donne son avis sur les repas.
            </p>
            <div className="mt-auto space-y-2 pt-4">
              <ShareActions
                getPayload={() => circleInvitePayload(circle.name, inviteCode)}
                copyLabel="Copier le code"
                className="flex items-center gap-2"
                buttonClassName={ghostBtn}
                shareButtonClassName="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--kkb-foret)] font-quicksand text-sm font-semibold text-[var(--kkb-creme)] transition-colors hover:bg-[var(--kkb-foret-900)] disabled:opacity-60"
              />
              <div className="flex items-center gap-2">
                <ShareActions
                  getPayload={() => circleJoinLinkPayload(circle.name, inviteCode)}
                  copyLabel="Copier le lien"
                  className="contents"
                  buttonClassName={ghostBtn}
                  shareButtonClassName="hidden"
                />
                <button type="button" onClick={() => setShowQr((v) => !v)} aria-expanded={showQr} className={ghostBtn}>
                  <QrCode className="h-4 w-4" /> {showQr ? 'Le code' : 'QR code'}
                </button>
              </div>
            </div>
          </section>

          {/* ── La tablée ──────────────────────────────────────────────────── */}
          <section className="space-y-3 pt-2 lg:col-span-8 lg:row-start-2 lg:pt-3" aria-labelledby="table-title">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="table-title" className="flex items-center gap-2 text-h2 text-[var(--kkb-foret)]">
                La tablée
                <span className="rounded-full bg-[var(--kkb-foret-50)] px-2.5 py-0.5 font-quicksand text-sm font-bold">{members.length}</span>
              </h2>
              <p className="hidden font-quicksand text-xs text-[var(--kkb-texte-2)] sm:block">Les préférences de chacun guident la génération du menu</p>
            </div>

            {aloneState}

            <div className="grid gap-3 sm:grid-cols-2 lg:gap-4">
              {members.map((m, index) => {
                const u = m.users!
                const isCurrentUser = u.id === currentUserId
                const canManage = isPlanificatrice && !isCurrentUser
                const inactive = m.is_active === false
                return (
                  <article key={m.id} className="flex flex-col gap-3 rounded-[var(--kkb-r-lg)] bg-white p-4">
                    <div className={`flex items-center gap-3 ${inactive ? 'opacity-60' : ''}`}>
                      {avatar(m, index, 44)}
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-h3 text-[var(--kkb-profond)]">{u.display_name || u.email}</span>
                          {isCurrentUser && (
                            <span className="rounded-full bg-[var(--kkb-jaune-50)] px-2 py-0.5 font-quicksand text-[11px] font-bold text-[var(--kkb-jaune-text)]">Moi</span>
                          )}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5">
                          {roleBadge(m.role)}
                          {inactive && <span className="font-quicksand text-xs font-semibold text-[var(--kkb-texte-2)]">· En pause</span>}
                        </p>
                      </div>
                    </div>
                    {prefChips(m, 'sm')}
                    {canManage && (
                      <div className="mt-auto flex items-center justify-between gap-2 border-t border-dashed border-[var(--kkb-filet)] pt-3">
                        {m.role === 'membre' ? (
                          <label className="flex items-center gap-2 font-quicksand text-xs font-semibold text-[var(--kkb-texte-2)]">
                            <Switch
                              checked={!inactive}
                              onCheckedChange={(on) => void setMemberActive(circle.id, u.id, on)}
                              aria-label={`Participation de ${u.display_name || u.email}`}
                              className="data-[state=checked]:bg-[var(--kkb-foret-500)] data-[state=unchecked]:bg-[var(--kkb-filet)]"
                            />
                            {inactive ? 'En pause' : 'Participe'}
                          </label>
                        ) : <span />}
                        <button
                          type="button"
                          onClick={() => void removeMember(circle.id, u.id)}
                          className="flex h-8 items-center gap-1 rounded-full px-2.5 font-quicksand text-xs font-semibold text-[var(--kkb-danger)] transition-colors hover:bg-[var(--kkb-danger-light)]"
                        >
                          <UserMinus className="h-3.5 w-3.5" /> Retirer
                        </button>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </section>

          {/* ── Colonne : moments de repas, rôles, autres actions ──────────── */}
          <div className="space-y-4 lg:col-span-4 lg:col-start-9 lg:row-start-2 lg:pt-3">
            {mealConfigs.length > 0 && (
              <section className="rounded-[var(--kkb-r-xl)] bg-white p-5" aria-labelledby="meals-title">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle id="meals-title" icon={<Clock className="h-4 w-4" />}>Moments de repas</CardTitle>
                  {isPlanificatrice && (
                    <Link href="/settings/meal-config" className="font-quicksand text-xs font-bold text-[var(--kkb-foret)] hover:underline">Ajuster</Link>
                  )}
                </div>
                <ul className="mt-3 space-y-1">
                  {mealConfigs.map((c) => {
                    const color = MEAL_COLOR[c.meal_type]
                    return (
                      <li key={c.meal_type} className={`flex items-center gap-3 py-1.5 ${c.is_active ? '' : 'opacity-50'}`}>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--kkb-r-md)]" style={{ backgroundColor: color.bg, color: color.text }}>
                          <MealTypeIcon type={c.meal_type} className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 font-quicksand text-sm font-bold text-[var(--kkb-profond)]">{MEAL_LABEL[c.meal_type]}</span>
                        <span className="shrink-0 text-right font-quicksand text-xs text-[var(--kkb-texte-2)]">
                          {c.is_active ? (
                            <>
                              <span className="font-dosis text-sm font-extrabold text-[var(--kkb-profond)] tabular-nums">{c.default_time ? c.default_time.slice(0, 5) : '—'}</span>
                              {' · '}{c.mode === 'daily' ? 'chaque jour' : 'toute la semaine'}
                            </>
                          ) : 'Pas prévu'}
                        </span>
                      </li>
                    )
                  })}
                </ul>
                <p className="mt-2 font-quicksand text-xs text-[var(--kkb-texte-2)]">
                  {activeMeals.length} moment{activeMeals.length > 1 ? 's' : ''} par jour{plannerName && !isPlanificatrice ? `, réglés par ${plannerName}` : ''}.
                </p>
              </section>
            )}

            <section className="rounded-[var(--kkb-r-xl)] bg-white p-5" aria-labelledby="roles-title">
              <CardTitle id="roles-title" icon={<Info className="h-4 w-4" />}>Qui fait quoi</CardTitle>
              <dl className="mt-3 space-y-3">
                {(['planificatrice', 'membre'] as const).map((r) => (
                  <div key={r} className="space-y-1">
                    <dt>{roleBadge(r)}</dt>
                    <dd className="font-quicksand text-[13px] text-[var(--kkb-texte-2)]">{ROLE_DESCRIPTION[r]}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {otherActions}
          </div>
        </div>
      </div>

      {/* Impression : le QR code et le code, à afficher dans la cuisine */}
      <div className="hidden text-center print:block">
        <p className="font-dosis text-2xl font-bold text-[var(--kkb-foret)]">Rejoins la tablée {circle.name}</p>
        <div className="mx-auto my-6 w-fit">
          <QRCodeSVG value={circleJoinUrl(inviteCode)} size={240} fgColor="#294E3B" />
        </div>
        <p className="font-dosis text-3xl font-extrabold tracking-[0.12em] text-[var(--kkb-foret)]">{inviteCode}</p>
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
                      ? 'border-[var(--kkb-foret)] bg-[var(--kkb-foret)] text-[var(--kkb-creme)]'
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

function CardTitle({ id, icon, children }: { id: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 id={id} className="flex items-center gap-2.5 text-h3 text-[var(--kkb-profond)]">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--kkb-foret-50)] text-[var(--kkb-foret)]">{icon}</span>
      {children}
    </h2>
  )
}
