'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Pencil, Save, Users, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface UserProfile {
  id: string
  display_name: string
  email: string
  family_size: number
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [familySize, setFamilySize] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((data) => {
        setProfile(data)
        setDisplayName(data.display_name)
        setFamilySize(data.family_size)
      })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const res = await fetch('/api/users/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: displayName, family_size: familySize }),
    })

    if (res.ok) {
      const data = await res.json()
      setProfile(data)
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } else {
      const data = await res.json()
      setError(data.error ?? 'Une erreur est survenue')
    }
    setSaving(false)
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Chargement…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-sm mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Mon profil</h1>
          <button onClick={handleLogout} className="text-gray-400 hover:text-gray-600 transition-colors">
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-terracotta/10 flex items-center justify-center">
              <User className="h-6 w-6 text-terracotta" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{profile.display_name}</p>
              <p className="text-xs text-gray-400">{profile.email}</p>
            </div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="ml-auto text-gray-400 hover:text-terracotta transition-colors"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="space-y-4 pt-2 border-t border-gray-100">
              <div className="space-y-2">
                <Label htmlFor="display_name">Prénom ou surnom</Label>
                <Input
                  id="display_name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="family_size">Personnes dans le foyer</Label>
                <Input
                  id="family_size"
                  type="number"
                  min={1}
                  max={20}
                  value={familySize}
                  onChange={(e) => setFamilySize(Number(e.target.value))}
                  required
                  disabled={saving}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 bg-terracotta hover:bg-terracotta/90 text-white" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                  Annuler
                </Button>
              </div>
            </form>
          ) : (
            <div className="pt-2 border-t border-gray-100 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Personnes dans le foyer</span>
                <span className="font-medium text-gray-900">{profile.family_size}</span>
              </div>
              {saved && <p className="text-xs text-market-green">Profil mis à jour</p>}
            </div>
          )}
        </div>

        <Button
          variant="outline"
          className="w-full border-terracotta text-terracotta hover:bg-terracotta/5"
          onClick={() => router.push('/circle')}
        >
          <Users className="mr-2 h-4 w-4" />
          Mon cercle familial
        </Button>
      </div>
    </div>
  )
}
