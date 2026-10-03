'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Key, LogOut, MoreVertical, Plus, Users, X } from 'lucide-react'
import { ShareActions, circleInvitePayload } from '@/components/ui/share-actions'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { PREF_TYPE_OPTIONS, prefChipStyle, type Pref, type PrefType, type Severity } from '@/lib/constants/dietary-pref'

const AVATAR_COLORS = ['var(--kkb-coral)', 'var(--kkb-success)', 'var(--kkb-warning)', 'var(--kkb-teal)', 'var(--kkb-text-secondary)']


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

export default function CirclePage() {
  const router = useRouter()
  const [circles, setCircles] = useState<Circle[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

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
        setCurrentUserId(res?.viewer_id ?? null)
        setLoading(false)
      })
  }, [])

  // Fermer le menu contextuel au clic extérieur
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function removeMember(circleId: string, userId: string) {
    setOpenMenu(null)
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
      setCircles((prev) => prev.filter((c) => c.id !== circleId))
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-[var(--kkb-text-tertiary)]">Chargement…</p>
      </div>
    )
  }

  if (circles.length === 0) {
    return (
      <div className="max-w-sm mx-auto px-4 py-8 space-y-6 text-center">
        <Users className="h-12 w-12 text-[var(--kkb-border)] mx-auto" />
        <div className="space-y-1">
          <h1 className="font-dosis font-bold text-xl text-[var(--kkb-text-primary)]">Pas encore de cercle</h1>
          <p className="text-sm text-[var(--kkb-text-secondary)]">Crée ou rejoins un cercle familial pour planifier ensemble.</p>
        </div>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => router.push('/circle/create')}
            className="w-full flex items-center justify-center gap-2 bg-[var(--kkb-coral)] text-white rounded-xl py-3 font-quicksand font-medium hover:bg-[var(--kkb-coral-hover)] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Créer un cercle
          </button>
          <button
            type="button"
            onClick={() => router.push('/circle/join')}
            className="w-full flex items-center justify-center gap-2 border border-[var(--kkb-border)] text-[var(--kkb-text-secondary)] rounded-xl py-3 font-quicksand font-medium hover:bg-[var(--kkb-bg)] transition-colors"
          >
            <Key className="h-4 w-4" />
            Rejoindre avec un code
          </button>
        </div>
      </div>
    )
  }

  // Afficher le premier cercle (MVP : un seul cercle à la fois)
  const circle = circles[0]
  const members = circle.family_circle_members ?? []
  const isPlanificatrice = circle.my_role === 'planificatrice'

  return (
    <div className="max-w-sm mx-auto px-4 py-6 space-y-6">
      <h1 className="font-dosis font-bold text-xl text-[var(--kkb-text-primary)]">{circle.name}</h1>

      {/* Section CODE D'INVITATION */}
      <section className="bg-[var(--kkb-coral-light)] border border-[var(--kkb-border)] rounded-xl p-4 space-y-3">
        <p className="text-xs text-[var(--kkb-text-tertiary)] uppercase tracking-widest font-medium">Code d&apos;invitation</p>
        <div className="flex items-center justify-between">
          <span className="font-dosis font-bold text-3xl text-[var(--kkb-coral)] tracking-widest">
            {circle.invite_code}
          </span>
          <ShareActions
            getPayload={() => circleInvitePayload(circle.name, circle.invite_code)}
            copyLabel="Copier"
            className="flex items-center gap-2"
            buttonClassName="flex items-center gap-1.5 text-sm text-[var(--kkb-text-secondary)] hover:text-[var(--kkb-coral-hover)] transition-colors px-2 py-1 rounded-lg hover:bg-white disabled:opacity-60"
          />
        </div>
      </section>

      {/* Section MEMBRES DU CERCLE */}
      <section className="space-y-2">
        <p className="text-xs text-[var(--kkb-text-tertiary)] uppercase tracking-widest font-medium">Membres du cercle</p>
        {members.length <= 1 && (
          <div className="rounded-[var(--kkb-radius-card)] border border-dashed border-[var(--kkb-border)] bg-white">
            {/* Pas de bouton : le code d'invitation et le partage sont juste au-dessus */}
            <EmptyState
              icon={Users}
              title="Tu es seul(e) dans ce cercle pour l'instant"
              description="Invite ta famille avec le code ou le lien à partager ci-dessus."
              className="py-8"
            />
          </div>
        )}
        <div className="space-y-2" ref={menuRef}>
          {members.map((member, index) => {
            const u = member.users
            if (!u) return null // profil illisible (RLS) — ne doit plus arriver, cf. migration users_select_circle_mates
            const initial = (u.display_name || u.email)[0].toUpperCase()
            const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length]
            const isCurrentUser = u.id === currentUserId
            const canRemove = isPlanificatrice && !isCurrentUser
            const canManagePrefs = isCurrentUser || isPlanificatrice
            const prefs = u.member_dietary_prefs ?? []

            return (
              <div
                key={member.id}
                className="bg-white border border-[var(--kkb-border)] rounded-xl px-4 py-3 flex items-center gap-3"
              >
                {/* Avatar */}
                <div
                  className="h-9 w-9 rounded-full flex items-center justify-center text-white font-dosis font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: avatarColor }}
                >
                  {initial}
                </div>

                {/* Nom + rôle */}
                <div className="flex-1 min-w-0">
                  <p className="font-quicksand font-semibold text-[var(--kkb-text-primary)] text-sm truncate">
                    {u.display_name || u.email}
                    {isCurrentUser && <span className="text-[var(--kkb-text-tertiary)] font-normal"> (moi)</span>}
                  </p>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] mt-0.5 ${
                      member.role === 'planificatrice'
                        ? 'bg-[var(--kkb-warning-light)] text-[var(--kkb-warning)]'
                        : 'bg-[var(--kkb-success-light)] text-[var(--kkb-success)]'
                    }`}
                  >
                    {member.role}
                  </Badge>

                  {/* Préférences alimentaires */}
                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                    {prefs.map((pref) => {
                      const { className, Icon } = prefChipStyle(pref)
                      const confirming = confirmDeleteId === pref.id
                      return (
                        <button
                          key={pref.id}
                          type="button"
                          disabled={!canManagePrefs}
                          onClick={() => canManagePrefs && void deletePref(circle.id, u.id, pref.id)}
                          className={`inline-flex items-center gap-1 text-[10px] font-quicksand font-medium px-1.5 py-0.5 rounded-full border ${
                            confirming ? 'bg-red-100 text-red-700 border-red-300' : className
                          } ${canManagePrefs ? '' : 'cursor-default'}`}
                        >
                          {confirming ? <X className="h-2.5 w-2.5" /> : Icon && <Icon className="h-2.5 w-2.5" />}
                          {confirming ? 'Supprimer ?' : pref.value}
                        </button>
                      )
                    })}
                    {canManagePrefs && (
                      <button
                        type="button"
                        onClick={() => openPrefSheet(circle.id, u.id, u.display_name || u.email)}
                        className="inline-flex items-center gap-1 text-[10px] font-quicksand font-medium px-1.5 py-0.5 rounded-full border border-dashed border-[var(--kkb-coral)]/40 text-[var(--kkb-coral)]"
                      >
                        <Plus className="h-2.5 w-2.5" />
                        Ajouter
                      </button>
                    )}
                  </div>
                </div>

                {/* Menu contextuel */}
                {canRemove && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenMenu(openMenu === member.id ? null : member.id)}
                      className="p-1 rounded-lg text-[var(--kkb-text-tertiary)] hover:text-[var(--kkb-text-secondary)] hover:bg-[var(--kkb-bg)]"
                      aria-label="Options du membre"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {openMenu === member.id && (
                      <div className="absolute right-0 top-8 z-10 bg-white border border-[var(--kkb-border)] rounded-xl shadow-lg py-1 min-w-[140px]">
                        <button
                          type="button"
                          onClick={() => removeMember(circle.id, u.id)}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-quicksand"
                        >
                          Retirer du cercle
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Actions */}
      <div className="space-y-2 pt-2">
        <button
          type="button"
          onClick={() => router.push('/circle/create')}
          className="w-full flex items-center justify-center gap-2 border border-[var(--kkb-border)] text-[var(--kkb-text-secondary)] rounded-xl py-3 font-quicksand text-sm hover:bg-[var(--kkb-bg)] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Créer un autre cercle
        </button>

        {!isPlanificatrice && (
          <button
            type="button"
            onClick={() => leaveCircle(circle.id)}
            className="w-full flex items-center justify-center gap-2 text-red-600 border border-red-200 rounded-xl py-3 font-quicksand text-sm hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Quitter le cercle
          </button>
        )}
      </div>

      {/* Feuille : ajouter une préférence alimentaire */}
      {sheetTarget && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={closePrefSheet} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <p className="font-dosis font-bold text-base text-[var(--kkb-text-primary)]">
                Préférence de {sheetTarget.displayName}
              </p>
              <button type="button" onClick={closePrefSheet} className="p-1 -mr-1 text-[var(--kkb-text-tertiary)]" aria-label="Fermer">
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
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--kkb-border)] bg-[var(--kkb-bg)] text-sm font-quicksand text-[var(--kkb-text-primary)] placeholder:text-[var(--kkb-text-tertiary)] outline-none focus:border-[var(--kkb-coral-hover)]"
            />

            <div className="flex gap-2">
              {PREF_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPrefType(opt.value)}
                  className={`flex-1 py-2 rounded-xl text-xs font-quicksand font-medium border transition-colors ${
                    prefType === opt.value
                      ? 'bg-[var(--kkb-coral)] text-white border-[var(--kkb-coral)]'
                      : 'bg-white border-[var(--kkb-border)] text-[var(--kkb-text-secondary)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {prefType === 'allergy' && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPrefSeverity('strict')}
                  className={`flex-1 py-2 rounded-xl text-xs font-quicksand font-medium border transition-colors ${
                    prefSeverity === 'strict'
                      ? 'bg-red-50 text-red-700 border-red-300'
                      : 'bg-white border-[var(--kkb-border)] text-[var(--kkb-text-secondary)]'
                  }`}
                >
                  Sévère (exclure des repas)
                </button>
                <button
                  type="button"
                  onClick={() => setPrefSeverity('light')}
                  className={`flex-1 py-2 rounded-xl text-xs font-quicksand font-medium border transition-colors ${
                    prefSeverity === 'light'
                      ? 'bg-orange-50 text-orange-700 border-orange-300'
                      : 'bg-white border-[var(--kkb-border)] text-[var(--kkb-text-secondary)]'
                  }`}
                >
                  Légère (éviter)
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => void savePref()}
              disabled={!prefValue.trim() || savingPref}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-dosis font-bold text-sm bg-[var(--kkb-coral)] text-white disabled:opacity-50 transition-opacity"
            >
              <Check className="h-4 w-4" />
              {savingPref ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
