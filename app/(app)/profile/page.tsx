'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Bell,
  ChevronRight,
  Globe,
  HelpCircle,
  LogOut,
  Pencil,
  Save,
  Users,
  X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface UserProfile {
  id: string
  display_name: string
  family_size: number
  dietary_prefs: Record<string, unknown>
}

interface DietaryPref {
  id:       string
  pref_type: 'allergy' | 'dislike' | 'preference' | 'favorite'
  value:     string
  severity:  'strict' | 'light' | null
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [dietaryPrefs, setDietaryPrefs] = useState<DietaryPref[]>([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((data) => {
        setProfile(data)
        setLoading(false)
      })
    fetch('/api/users/me/dietary-prefs')
      .then((r) => r.json())
      .then((res) => setDietaryPrefs(Array.isArray(res?.data) ? res.data : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2000)
    return () => clearTimeout(t)
  }, [toast])

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
      const data = await res.json()
      setProfile(data)
      setEditMode(false)
    }
    setSaving(false)
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-[var(--kkb-text-tertiary)]">Chargement…</p>
      </div>
    )
  }

  const initial = (profile?.display_name || '?')[0].toUpperCase()
  const allergies = dietaryPrefs.filter(p => p.pref_type === 'allergy')
  const cuisines: string[] = Array.isArray(profile?.dietary_prefs?.cuisines)
    ? (profile.dietary_prefs.cuisines as string[])
    : []

  return (
    <div className="max-w-sm mx-auto px-4 py-6 space-y-6">

      {/* Toast */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[var(--kkb-text-primary)] text-white text-sm rounded-xl px-4 py-2 shadow-lg font-quicksand">
          {toast}
        </div>
      )}

      {/* Avatar + Nom */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <div className="relative">
          <div className="h-20 w-20 rounded-full bg-[var(--kkb-coral)] flex items-center justify-center text-white font-dosis font-bold text-3xl">
            {initial}
          </div>
          {!editMode && (
            <button
              type="button"
              onClick={startEdit}
              className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-[var(--kkb-bg)] border-2 border-[var(--kkb-border)] flex items-center justify-center text-[var(--kkb-text-secondary)] hover:text-[var(--kkb-coral-hover)]"
              aria-label="Modifier le nom"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {editMode ? (
          <div className="flex items-center gap-2 w-full">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              disabled={saving}
              className="border-[var(--kkb-border)] bg-white text-center font-dosis font-bold text-lg"
              autoFocus
            />
            <button
              type="button"
              onClick={saveEdit}
              disabled={saving}
              className="p-2 text-[var(--kkb-success)] hover:text-[var(--kkb-success)]"
              aria-label="Enregistrer"
            >
              <Save className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className="p-2 text-[var(--kkb-text-tertiary)] hover:text-[var(--kkb-text-secondary)]"
              aria-label="Annuler"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="text-center">
            <p className="font-dosis font-bold text-xl text-[var(--kkb-text-primary)]">{profile?.display_name}</p>
            <p className="text-sm text-[var(--kkb-text-tertiary)] italic font-quicksand">Planificatrice des menus familiaux</p>
          </div>
        )}
      </div>

      {/* MON IMPACT */}
      <section className="bg-[var(--kkb-coral-light)] border border-[var(--kkb-border)] rounded-xl p-4">
        <p className="text-xs text-[var(--kkb-text-tertiary)] uppercase tracking-widest font-medium mb-3">Mon impact</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <p className="font-dosis font-bold text-2xl text-[var(--kkb-coral)]">0</p>
            <p className="text-[10px] text-[var(--kkb-text-tertiary)] uppercase tracking-wide font-medium">Recettes partagées</p>
          </div>
          <div className="text-center">
            <p className="font-dosis font-bold text-2xl text-[var(--kkb-coral)]">0</p>
            <p className="text-[10px] text-[var(--kkb-text-tertiary)] uppercase tracking-wide font-medium">Repas planifiés</p>
          </div>
        </div>
      </section>

      {/* MA FAMILLE */}
      <section className="bg-white border border-[var(--kkb-border)] rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => router.push('/circle')}
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--kkb-bg)] transition-colors"
        >
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-[var(--kkb-coral)]" />
            <span className="font-quicksand font-medium text-[var(--kkb-text-primary)] text-sm">Ma famille</span>
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--kkb-text-tertiary)]" />
        </button>
      </section>

      {/* PRÉFÉRENCES ALIMENTAIRES */}
      <section className="space-y-2">
        <p className="text-xs text-[var(--kkb-text-tertiary)] uppercase tracking-widest font-medium">Préférences alimentaires</p>
        <div className="bg-white border border-[var(--kkb-border)] rounded-xl p-4 space-y-3">
          {allergies.length === 0 && cuisines.length === 0 ? (
            <p className="text-sm text-[var(--kkb-text-tertiary)] italic font-quicksand">Aucune préférence renseignée</p>
          ) : (
            <>
              {allergies.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-[var(--kkb-text-tertiary)] font-medium">Allergies</p>
                  <div className="flex flex-wrap gap-1.5">
                    {allergies.map((a) => (
                      <Badge
                        key={a.id}
                        className={`text-xs ${
                          a.severity === 'strict'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-orange-50 text-orange-700 border-orange-200'
                        }`}
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {a.value}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {cuisines.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-[var(--kkb-text-tertiary)] font-medium">Cuisines préférées</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cuisines.map((c) => (
                      <Badge key={c} className="text-xs bg-[var(--kkb-success-light)] text-[var(--kkb-success)] border-[var(--kkb-success-light)]">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* PARAMÈTRES */}
      <section className="space-y-2">
        <p className="text-xs text-[var(--kkb-text-tertiary)] uppercase tracking-widest font-medium">Paramètres</p>
        <div className="bg-white border border-[var(--kkb-border)] rounded-xl overflow-hidden divide-y divide-[var(--kkb-border-light)]">
          {[
            { icon: Bell, label: 'Notifications' },
            { icon: Globe, label: 'Langue' },
            { icon: HelpCircle, label: 'Aide' },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              type="button"
              onClick={() => setToast('Bientôt disponible')}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--kkb-bg)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-[var(--kkb-text-secondary)]" />
                <span className="font-quicksand font-medium text-[var(--kkb-text-primary)] text-sm">{label}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--kkb-text-tertiary)]" />
            </button>
          ))}

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-quicksand font-medium text-sm">Déconnexion</span>
          </button>
        </div>
      </section>
    </div>
  )
}
