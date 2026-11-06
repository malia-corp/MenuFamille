'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Bell, BookOpen, CalendarCheck, CalendarDays, Check, ChefHat, ChevronRight, Globe, LifeBuoy, Loader2,
  LogOut, Pencil, Settings, Share2, SlidersHorizontal, Smile, Sparkles, UserPlus, Users, UtensilsCrossed, X,
  type LucideIcon,
} from 'lucide-react'
import { DietaryPrefsSheet } from '@/components/settings/dietary-prefs-sheet'
import { ShareActions, appSharePayload } from '@/components/ui/share-actions'
import { toast } from '@/lib/stores/toast-store'
import { logout } from '@/lib/utils/logout'
import { pickActiveCircle } from '@/lib/utils/active-circle'
import { prefChipStyle, type Pref } from '@/lib/constants/dietary-pref'
import { ProfileSkeleton } from '@/components/skeletons/page-skeletons'

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

const AVATAR_COLORS = ['var(--kkb-orange)', 'var(--kkb-foret-500)', 'var(--kkb-jaune-900)', 'var(--kkb-foret)', 'var(--kkb-texte-2)']
const ROLE_LABEL: Record<string, string> = { planificatrice: 'Organisatrice', membre: 'Membre' }
const MEMBERS_SHOWN = 4

function CardTitle({ id, icon: Icon, children }: { id: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <h2 id={id} className="flex items-center gap-2.5 text-h3 text-[var(--kkb-profond)]">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--kkb-foret-50)] text-[var(--kkb-foret)]">
        <Icon className="h-4 w-4" />
      </span>
      {children}
    </h2>
  )
}

const ROW = 'flex min-h-[56px] w-full items-center gap-3 rounded-[var(--kkb-r-lg)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--kkb-creme)]'

// Ligne de réglage ; « Bientôt » pour ce qui n'est pas encore disponible
// (cf. BACKLOG_PHASE2.md) plutôt qu'un bouton qui ne mène nulle part.
function RowContent({ icon: Icon, label, sub, chevron = true, soon = false }: { icon: LucideIcon; label: string; sub?: string; chevron?: boolean; soon?: boolean }) {
  return (
    <span className={`flex w-full items-center gap-3 ${soon ? 'opacity-60' : ''}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--kkb-creme)]">
        <Icon className="h-4 w-4 text-[var(--kkb-foret)]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-quicksand text-[15px] font-semibold text-[var(--kkb-profond)]">{label}</span>
        {sub && <span className="block font-quicksand text-xs text-[var(--kkb-texte-2)]">{sub}</span>}
      </span>
      {soon
        ? <span className="shrink-0 rounded-full bg-[var(--kkb-lin)] px-2 py-0.5 font-quicksand text-[11px] font-bold text-[var(--kkb-texte-2)]">Bientôt</span>
        : chevron && <ChevronRight className="h-4 w-4 shrink-0 text-[var(--kkb-texte-2)]" />}
    </span>
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

  if (loading) return <ProfileSkeleton />

  const name      = profile?.display_name || 'Toi'
  const initial   = name[0].toUpperCase()
  const isPlanner = circle?.my_role === 'planificatrice'
  const members   = (circle?.family_circle_members ?? []).filter((m) => m.users)
  const cuisines: string[] = Array.isArray(profile?.dietary_prefs?.cuisines)
    ? (profile.dietary_prefs.cuisines as string[])
    : []

  return (
    <div className="mx-auto max-w-lg px-4 pb-10 pt-2 lg:max-w-none lg:px-0 lg:pt-0">
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-5">
        <div className="space-y-4 lg:col-span-8 lg:space-y-5">
        {/* ── Bandeau : identité et impact ─────────────────────────────── */}
        <section className="rounded-[var(--kkb-r-xl)] bg-[var(--kkb-foret)] p-5 lg:p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-[var(--kkb-creme)] font-dosis text-[32px] font-extrabold text-[var(--kkb-foret)] ring-4 ring-white/10">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              {editMode ? (
                <form onSubmit={e => { e.preventDefault(); void saveEdit() }} className="flex items-center gap-1.5">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Escape') setEditMode(false) }}
                    disabled={saving}
                    autoFocus
                    aria-label="Ton prénom"
                    className="h-11 min-w-0 flex-1 rounded-full bg-white px-4 font-dosis text-lg font-bold text-[var(--kkb-profond)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--kkb-sauge)]"
                  />
                  <button type="submit" disabled={saving || !editName.trim()} aria-label="Enregistrer"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--kkb-sauge)] text-[var(--kkb-profond)] disabled:opacity-50">
                    {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                  </button>
                  <button type="button" onClick={() => setEditMode(false)} aria-label="Annuler"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-[var(--kkb-creme)] hover:bg-white/20">
                    <X className="h-5 w-5" />
                  </button>
                </form>
              ) : (
                <>
                  <p className="font-quicksand text-sm font-semibold text-[var(--kkb-foret-100)]">Mon profil</p>
                  <div className="flex items-center gap-2">
                    <h1 className="truncate text-h1 text-[var(--kkb-creme)]">{name}</h1>
                    <button type="button" onClick={startEdit} aria-label="Modifier mon prénom"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[var(--kkb-creme)] transition-colors hover:bg-white/20">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {circle && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 font-quicksand text-xs font-bold text-[var(--kkb-creme)]">
                    {isPlanner ? <ChefHat className="h-3.5 w-3.5 text-[var(--kkb-jaune)]" /> : <Users className="h-3.5 w-3.5 text-[var(--kkb-sauge)]" />}
                    {isPlanner ? 'Organisatrice' : 'Membre'} · {circle.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-3 gap-2">
            {[
              { icon: BookOpen,      label: 'Recettes partagées', short: 'Recettes', value: stats ? String(stats.recipes_shared) : '–' },
              { icon: CalendarCheck, label: 'Repas planifiés',    short: 'Repas', value: stats ? String(stats.meals_planned) : '–' },
              { icon: Smile,         label: 'Avis favorables',    short: 'Avis +', value: stats?.approval_pct != null ? `${stats.approval_pct}%` : '–' },
            ].map(s => (
              <div key={s.label} className="rounded-[var(--kkb-r-md)] bg-white/10 px-3 py-2.5">
                <dt className="flex items-center gap-1.5 font-quicksand text-xs text-[var(--kkb-foret-100)]">
                  <s.icon className="hidden h-3.5 w-3.5 shrink-0 text-[var(--kkb-sauge)] sm:block" /> <span className="truncate sm:hidden">{s.short}</span><span className="hidden truncate sm:inline">{s.label}</span>
                </dt>
                <dd className="mt-0.5 font-dosis text-[20px] font-extrabold leading-tight tabular-nums text-[var(--kkb-creme)]">{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── Mon assiette : préférences et allergies ─────────────────── */}
        <section className="rounded-[var(--kkb-r-xl)] bg-white p-5" aria-labelledby="prefs-title">
          <div className="flex items-center justify-between gap-2">
            <CardTitle id="prefs-title" icon={UtensilsCrossed}>Mon assiette</CardTitle>
            <button type="button" onClick={() => setPrefsOpen(true)}
              className="flex h-9 items-center gap-1.5 rounded-full bg-[var(--kkb-foret-50)] px-3.5 font-quicksand text-sm font-bold text-[var(--kkb-foret)] transition-colors hover:bg-[var(--kkb-foret-100)]">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Ajuster
            </button>
          </div>
          {dietaryPrefs.length === 0 && cuisines.length === 0 ? (
            <button type="button" onClick={() => setPrefsOpen(true)}
              className="mt-3 w-full rounded-[var(--kkb-r-lg)] border-[1.5px] border-dashed border-[var(--kkb-filet)] px-4 py-5 text-center font-quicksand text-sm text-[var(--kkb-texte-2)] transition-colors hover:border-[var(--kkb-foret-300)] hover:text-[var(--kkb-foret)]">
              Ajoute tes allergies, tes envies et ce que tu n’aimes pas : le menu en tiendra compte.
            </button>
          ) : (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {dietaryPrefs.map((p) => {
                const { className, Icon } = prefChipStyle(p)
                return (
                  <span key={p.id} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-quicksand text-xs font-semibold ${className}`}>
                    {Icon && <Icon className="h-3 w-3" />}
                    {p.value}
                  </span>
                )
              })}
              {cuisines.map((c) => (
                <span key={c} className="rounded-full bg-[var(--kkb-sauge-50)] px-2.5 py-1 font-quicksand text-xs font-semibold text-[var(--kkb-foret-500)]">{c}</span>
              ))}
            </div>
          )}
          <p className="mt-3 flex items-start gap-1.5 font-quicksand text-xs text-[var(--kkb-texte-2)]">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--kkb-foret-500)]" />
            Ces choix guident automatiquement la génération du menu de la semaine.
          </p>
        </section>

        </div>

        <div className="space-y-4 lg:col-span-4 lg:space-y-5">
        {/* ── Mon cercle ──────────────────────────────────────────────── */}
        <section className="flex flex-col rounded-[var(--kkb-r-xl)] bg-white p-5" aria-labelledby="circle-title">
          <div className="flex items-center justify-between gap-2">
            <CardTitle id="circle-title" icon={Users}>Mon cercle</CardTitle>
            <Link href="/circle" className="flex h-9 items-center gap-0.5 font-quicksand text-sm font-bold text-[var(--kkb-foret)] hover:underline">
              Gérer <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {members.length > 0 ? (
            <ul className="mt-3 flex-1 space-y-1">
              {members.slice(0, MEMBERS_SHOWN).map((m, i) => {
                const memberName = m.users!.display_name || m.users!.email
                return (
                  <li key={m.id} className="flex items-center gap-3 py-1.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-dosis text-sm font-bold text-white"
                      style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                      {memberName.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-quicksand text-sm font-bold text-[var(--kkb-profond)]">{memberName}</span>
                    <span className="shrink-0 font-quicksand text-xs text-[var(--kkb-texte-2)]">{ROLE_LABEL[m.role] ?? m.role}</span>
                  </li>
                )
              })}
              {members.length > MEMBERS_SHOWN && (
                <li className="font-quicksand text-xs text-[var(--kkb-texte-2)]">et {members.length - MEMBERS_SHOWN} autre{members.length - MEMBERS_SHOWN > 1 ? 's' : ''}</li>
              )}
            </ul>
          ) : (
            <p className="mt-3 flex-1 font-quicksand text-sm text-[var(--kkb-texte-2)]">Pas encore de cercle : crée-le pour planifier en famille.</p>
          )}
          <Link href="/circle" className="mt-3 flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--kkb-foret-50)] font-quicksand text-sm font-bold text-[var(--kkb-foret)] transition-colors hover:bg-[var(--kkb-foret-100)]">
            <UserPlus className="h-4 w-4" /> Inviter à ma table
          </Link>
        </section>

        {/* ── Réglages ────────────────────────────────────────────────── */}
        <section className="overflow-hidden rounded-[var(--kkb-r-xl)] bg-white" aria-labelledby="settings-title">
          <div className="px-5 pb-1 pt-5">
            <CardTitle id="settings-title" icon={Settings}>Réglages</CardTitle>
          </div>
          <ul className="px-2 pb-2">
            {isPlanner && (
              <li><Link href="/settings/meal-config" className={ROW}><RowContent icon={CalendarDays} label="Rythme des repas" sub="Repas préparés, heures, fréquence" /></Link></li>
            )}
            <li><Link href="/settings/notifications" className={ROW}><RowContent icon={Bell} label="Notifications" sub="Rappels et demandes d’avis" /></Link></li>
            <li><div className={`${ROW} cursor-default hover:bg-transparent`} aria-disabled="true"><RowContent icon={Globe} label="Langue & unités culinaires" sub="Français · mesures locales" soon /></div></li>
            <li><div className={`${ROW} cursor-default hover:bg-transparent`} aria-disabled="true"><RowContent icon={LifeBuoy} label="Aide & astuces" soon /></div></li>
            <li><Link href="/settings" className={ROW}><RowContent icon={Settings} label="Tous les paramètres" sub="Compte, préférences, rythme" /></Link></li>
          </ul>
          <div className="space-y-3 border-t border-dashed border-[var(--kkb-filet)] px-5 py-4">
            <RowContent icon={Share2} label="Partager KeskonBouf" sub="Fais découvrir l’app à tes proches" chevron={false} />
            <ShareActions
              getPayload={appSharePayload}
              className="flex items-center gap-2"
              buttonClassName="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full border-[1.5px] border-[var(--kkb-filet)] bg-white font-quicksand text-sm font-semibold text-[var(--kkb-foret)] transition-colors hover:border-[var(--kkb-foret-300)] disabled:opacity-60"
              shareButtonClassName="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--kkb-foret)] font-quicksand text-sm font-semibold text-[var(--kkb-creme)] transition-colors hover:bg-[var(--kkb-foret-900)] disabled:opacity-60"
            />
          </div>
          <button type="button" onClick={() => void handleLogout()}
            className="flex w-full items-center justify-center gap-2 border-t border-[var(--kkb-lin)] py-4 font-quicksand text-sm font-bold text-[var(--kkb-danger)] transition-colors hover:bg-[var(--kkb-danger-light)]">
            <LogOut className="h-4 w-4" /> Se déconnecter
          </button>
        </section>
        </div>
      </div>

      {prefsOpen && (
        <DietaryPrefsSheet prefs={dietaryPrefs} onChange={setDietaryPrefs} onClose={() => setPrefsOpen(false)} />
      )}
    </div>
  )
}
