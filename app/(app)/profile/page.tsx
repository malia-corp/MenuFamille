'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Bell,
  BookOpen,
  CalendarCheck,
  ChevronRight,
  Globe,
  LogOut,
  Pencil,
  Save,
  Settings,
  Share2,
  SlidersHorizontal,
  Smile,
  Star,
  Trophy,
  UserPlus,
  Users,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { SkeletonCard } from '@/components/ui/skeleton-card'
import { DietaryPrefsSheet } from '@/components/settings/dietary-prefs-sheet'
import { ShareActions, appSharePayload } from '@/components/ui/share-actions'
import { toast } from '@/lib/stores/toast-store'
import { logout } from '@/lib/utils/logout'
import { pickActiveCircle } from '@/lib/utils/active-circle'
import { prefChipStyle, type Pref } from '@/lib/constants/dietary-pref'

interface UserProfile {
  id:            string
  display_name:  string
  family_size:   number
  dietary_prefs: Record<string, unknown>
}

interface ImpactStats {
  recipes_shared: number
  meals_planned:  number
  approval_pct:   number | null
}

interface CircleMember {
  id:    string
  role:  string
  users: { id: string; display_name: string; email: string } | null
}

interface Circle {
  id:                    string
  name:                  string
  my_role:               string
  family_circle_members: CircleMember[]
}

const AVATAR_COLORS = ['var(--kkb-coral)', 'var(--kkb-success)', 'var(--kkb-warning)', 'var(--kkb-teal)', 'var(--kkb-text-secondary)']
const ROLE_LABEL: Record<string, string> = { planificatrice: 'Organisatrice', membre: 'Membre' }
const MEMBERS_SHOWN = 4

function SectionTitle({ icon: Icon, label, action }: { icon: LucideIcon; label: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-1">
      <p className="flex items-center gap-2 font-quicksand text-[11px] font-bold uppercase tracking-wider text-[var(--kkb-text-tertiary)]">
        <Icon className="h-4 w-4 text-[var(--kkb-coral)]" /> {label}
      </p>
      {action}
    </div>
  )
}

const SETTING_ROW = 'flex min-h-[56px] w-full items-center gap-3 p-4 text-left transition-colors hover:bg-[var(--kkb-bg)]'

function SettingContent({ icon: Icon, label, sub, chevron = true }: { icon: LucideIcon; label: string; sub?: string; chevron?: boolean }) {
  return (
    <span className="flex w-full items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--kkb-coral-light)]">
        <Icon className="h-4 w-4 text-[var(--kkb-coral)]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-quicksand text-[15px] font-semibold text-[var(--kkb-text-primary)]">{label}</span>
        {sub && <span className="block font-quicksand text-xs text-[var(--kkb-text-tertiary)]">{sub}</span>}
      </span>
      {chevron && <ChevronRight className="h-4 w-4 shrink-0 text-[var(--kkb-text-tertiary)]" />}
    </span>
  )
}

function Stat({ icon: Icon, value, label, tone }: { icon: LucideIcon; value: string; label: string; tone: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="mb-1.5 flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: `color-mix(in srgb, ${tone} 14%, white)` }}>
        <Icon className="h-4 w-4" style={{ color: tone }} />
      </span>
      <p className="font-dosis text-2xl font-extrabold text-[var(--kkb-coral)]">{value}</p>
      <p className="font-quicksand text-[10px] font-bold uppercase leading-tight tracking-wide text-[var(--kkb-text-tertiary)]">{label}</p>
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile,      setProfile]      = useState<UserProfile | null>(null)
  const [dietaryPrefs, setDietaryPrefs] = useState<Pref[]>([])
  const [stats,        setStats]        = useState<ImpactStats | null>(null)
  const [circle,       setCircle]       = useState<Circle | null>(null)
  const [prefsOpen,    setPrefsOpen]    = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [editMode,     setEditMode]     = useState(false)
  const [editName,     setEditName]     = useState('')
  const [saving,       setSaving]       = useState(false)

  useEffect(() => {
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((data) => setProfile(data))
      .catch(() => toast.error('Erreur de connexion'))
      .finally(() => setLoading(false))
    fetch('/api/users/me/dietary-prefs')
      .then((r) => r.json())
      .then((res) => setDietaryPrefs(Array.isArray(res?.data) ? res.data : []))
      .catch(() => {})
    fetch('/api/users/me/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => setStats(s))
      .catch(() => {})
    fetch('/api/circles')
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => setCircle(pickActiveCircle<Circle>(res)))
      .catch(() => {})
  }, [])

  function startEdit() {
    setEditName(profile?.display_name ?? '')
    setEditMode(true)
  }

  async function saveEdit() {
    if (!editName.trim()) return
    setSaving(true)
    const res = await fetch('/api/users/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: editName.trim() }),
    })
    if (res.ok) {
      setProfile(await res.json())
      setEditMode(false)
      toast.success('Nom mis à jour')
    } else {
      toast.error('Impossible d\'enregistrer')
    }
    setSaving(false)
  }

  async function handleLogout() {
    await logout()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-6" aria-busy="true">
        <SkeletonCard variant="stat" className="mx-auto w-40" />
        <SkeletonCard variant="list" />
        <SkeletonCard variant="list" />
      </div>
    )
  }

  const initial   = (profile?.display_name || '?')[0].toUpperCase()
  const isPlanner = circle?.my_role === 'planificatrice'
  const members   = (circle?.family_circle_members ?? []).filter((m) => m.users)
  const cuisines: string[] = Array.isArray(profile?.dietary_prefs?.cuisines)
    ? (profile.dietary_prefs.cuisines as string[])
    : []

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 pb-10 pt-6 lg:pt-2">

      {/* Avatar + nom */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-[var(--kkb-coral)] font-dosis text-[32px] font-bold text-white shadow-[var(--kkb-shadow-card)]">
            {initial}
          </div>
          {isPlanner && (
            <span className="absolute -right-6 -top-1 inline-flex items-center gap-1 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-warning)] px-2 py-0.5 font-quicksand text-[10px] font-bold uppercase text-white shadow-sm">
              <Star className="h-3 w-3 fill-current" /> Chef
            </span>
          )}
          {!editMode && (
            <button
              type="button"
              onClick={startEdit}
              className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--kkb-border)] bg-white text-[var(--kkb-text-secondary)] hover:text-[var(--kkb-coral)]"
              aria-label="Modifier le nom"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
        </div>

        {editMode ? (
          <div className="flex w-full items-center gap-2">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              disabled={saving}
              className="border-[var(--kkb-border)] bg-white text-center font-dosis text-lg font-bold"
              autoFocus
            />
            <button type="button" onClick={saveEdit} disabled={saving} className="p-2 text-[var(--kkb-success)]" aria-label="Enregistrer">
              <Save className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => setEditMode(false)} className="p-2 text-[var(--kkb-text-tertiary)]" aria-label="Annuler">
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="space-y-1.5 text-center">
            <p className="font-dosis text-[22px] font-bold text-[var(--kkb-text-primary)]">{profile?.display_name}</p>
            <p className="font-quicksand text-sm italic text-[var(--kkb-text-secondary)]">
              {isPlanner ? 'Chef d\'orchestre culinaire du foyer' : 'Gourmet du foyer'}
            </p>
            {circle && (
              <span className="inline-flex items-center gap-1.5 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-teal-light)] px-3 py-1 font-quicksand text-xs font-bold text-[var(--kkb-teal)]">
                <UtensilsCrossed className="h-3.5 w-3.5" />
                {circle.name} · {members.length} {members.length > 1 ? 'gourmets' : 'gourmet'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Mon impact */}
      <section className="space-y-2">
        <SectionTitle icon={Trophy} label="Mon impact & victoires" />
        <div className="grid grid-cols-3 gap-2 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-4">
          <Stat icon={BookOpen}      value={stats ? String(stats.recipes_shared) : '–'} label="Recettes partagées" tone="var(--kkb-coral)" />
          <Stat icon={CalendarCheck} value={stats ? String(stats.meals_planned) : '–'}  label="Repas planifiés"   tone="var(--kkb-warning)" />
          <Stat icon={Smile}         value={stats?.approval_pct != null ? `${stats.approval_pct}%` : '–'} label="Approbation tablée" tone="var(--kkb-success)" />
        </div>
      </section>

      {/* Cercle familial */}
      <section className="space-y-2">
        <SectionTitle
          icon={Users}
          label={`Cercle familial${members.length ? ` (${members.length})` : ''}`}
          action={
            <Link href="/circle" className="flex items-center gap-0.5 font-quicksand text-xs font-bold text-[var(--kkb-coral)]">
              Gérer <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <div className="space-y-3 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-3">
          {members.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {members.slice(0, MEMBERS_SHOWN).map((m, i) => {
                const name = m.users!.display_name || m.users!.email
                return (
                  <div key={m.id} className="flex min-w-0 items-center gap-2.5 rounded-[var(--kkb-radius-sm)] bg-[var(--kkb-coral-light)]/60 p-2.5">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-dosis text-sm font-bold text-white"
                      style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                    >
                      {name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-dosis text-sm font-bold text-[var(--kkb-text-primary)]">{name.split(' ')[0]}</span>
                      <span className="block font-quicksand text-[11px] text-[var(--kkb-text-tertiary)]">{ROLE_LABEL[m.role] ?? m.role}</span>
                    </span>
                  </div>
                )
              })}
            </div>
          )}
          {members.length > MEMBERS_SHOWN && (
            <p className="text-center font-quicksand text-xs text-[var(--kkb-text-tertiary)]">
              + {members.length - MEMBERS_SHOWN} autre{members.length - MEMBERS_SHOWN > 1 ? 's' : ''}
            </p>
          )}
          <Link
            href="/circle"
            className="flex items-center justify-center gap-2 rounded-[var(--kkb-radius-sm)] border border-[var(--kkb-border)] bg-white py-3 font-quicksand text-sm font-semibold text-[var(--kkb-coral)] transition-colors hover:bg-[var(--kkb-coral-light)]"
          >
            <UserPlus className="h-4 w-4" /> Inviter un membre ou un invité du week-end
          </Link>
        </div>
      </section>

      {/* Préférences & allergies */}
      <section className="space-y-2">
        <SectionTitle
          icon={UtensilsCrossed}
          label="Préférences & allergies"
          action={
            <button type="button" onClick={() => setPrefsOpen(true)} className="flex items-center gap-1 font-quicksand text-xs font-bold text-[var(--kkb-coral)]">
              Ajuster <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>
          }
        />
        <div className="space-y-3 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white p-4">
          {dietaryPrefs.length === 0 && cuisines.length === 0 ? (
            <p className="font-quicksand text-sm italic text-[var(--kkb-text-tertiary)]">Aucune préférence renseignée</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {dietaryPrefs.map((p) => {
                const { className, Icon } = prefChipStyle(p)
                return (
                  <span key={p.id} className={`inline-flex items-center gap-1 rounded-[var(--kkb-radius-pill)] border px-2.5 py-1 font-quicksand text-xs font-semibold ${className}`}>
                    {Icon && <Icon className="h-3 w-3" />}
                    {p.value}
                  </span>
                )
              })}
              {cuisines.map((c) => (
                <span key={c} className="rounded-[var(--kkb-radius-pill)] border border-[var(--kkb-success-light)] bg-[var(--kkb-success-light)] px-2.5 py-1 font-quicksand text-xs font-semibold text-[var(--kkb-success)]">
                  {c}
                </span>
              ))}
            </div>
          )}
          <p className="font-quicksand text-xs italic text-[var(--kkb-text-tertiary)]">
            Ces filtres alimentent automatiquement la génération du menu de la semaine.
          </p>
        </div>
      </section>

      {/* Paramètres de l'application */}
      <section className="space-y-2">
        <SectionTitle icon={Settings} label="Paramètres de l'application" />
        <div className="divide-y-[0.5px] divide-[var(--kkb-border)] overflow-hidden rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white">
          <Link href="/settings/notifications" className={SETTING_ROW}>
            <SettingContent icon={Bell} label="Notifications push" sub="Rappels de repas et avis après le repas" />
          </Link>
          <button type="button" onClick={() => toast.info('Bientôt disponible')} className={SETTING_ROW}>
            <SettingContent icon={Globe} label="Langue & Unités culinaires" sub="Français · Mesures locales (Sodabi, Oloko, Grammes)" />
          </button>
          <button type="button" onClick={() => toast.info('Bientôt disponible')} className={SETTING_ROW}>
            <SettingContent icon={BookOpen} label="Aide & Astuces familiales" />
          </button>
          <div className="space-y-3 p-4">
            <SettingContent icon={Share2} label="Partager KeskonBouf" sub="Offrir sérénité culinaire à vos proches" chevron={false} />
            <ShareActions
              getPayload={appSharePayload}
              buttonClassName="flex-1 flex items-center justify-center gap-1.5 rounded-[var(--kkb-radius-pill)] py-2.5 font-quicksand font-bold text-sm border border-[var(--kkb-border)] text-[var(--kkb-text-secondary)] hover:border-[var(--kkb-coral)] hover:text-[var(--kkb-coral)] transition-colors disabled:opacity-60"
            />
          </div>
          <Link href="/settings" className={SETTING_ROW}>
            <SettingContent icon={Settings} label="Tous les paramètres" sub="Rythme des repas, préférences, compte" />
          </Link>
        </div>
      </section>

      <button
        type="button"
        onClick={() => void handleLogout()}
        className="flex w-full items-center justify-center gap-2 rounded-[var(--kkb-radius-card)] p-4 font-quicksand text-[15px] font-bold text-[var(--kkb-danger)] transition-colors hover:bg-[var(--kkb-danger-light)]"
      >
        <LogOut className="h-4 w-4" /> Se déconnecter
      </button>

      {prefsOpen && (
        <DietaryPrefsSheet prefs={dietaryPrefs} onChange={setDietaryPrefs} onClose={() => setPrefsOpen(false)} />
      )}
    </div>
  )
}
