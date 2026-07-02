'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, ChevronRight, Users, Key } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Step = 'profile' | 'circle'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('profile')
  const [displayName, setDisplayName] = useState('')
  const [familySize, setFamilySize] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const res = await fetch('/api/users/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: displayName, family_size: familySize }),
    })

    if (res.ok) {
      setStep('circle')
    } else {
      const data = await res.json()
      setError(data.error ?? 'Une erreur est survenue')
    }
    setSaving(false)
  }

  if (step === 'circle') {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold text-gray-900">Bienvenue, {displayName} !</h1>
          <p className="text-sm text-gray-500">Veux-tu rejoindre ou créer un cercle familial ?</p>
        </div>

        <div className="space-y-3">
          <Button
            className="w-full bg-terracotta hover:bg-terracotta/90 text-white"
            onClick={() => router.push('/circle/create')}
          >
            <Users className="mr-2 h-4 w-4" />
            Créer un cercle familial
          </Button>

          <Button
            variant="outline"
            className="w-full border-terracotta text-terracotta hover:bg-terracotta/5"
            onClick={() => router.push('/circle/join')}
          >
            <Key className="mr-2 h-4 w-4" />
            Rejoindre un cercle
          </Button>

          <Button
            variant="ghost"
            className="w-full text-gray-400"
            onClick={() => router.push('/')}
          >
            Passer pour l&apos;instant
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <User className="h-10 w-10 text-terracotta" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Crée ton profil</h1>
        <p className="text-sm text-gray-500">Quelques infos pour personnaliser tes menus</p>
      </div>

      <form onSubmit={handleProfileSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="display_name">Ton prénom ou surnom</Label>
          <Input
            id="display_name"
            type="text"
            placeholder="ex. Malia"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            disabled={saving}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="family_size">Nombre de personnes dans ton foyer</Label>
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

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <Button
          type="submit"
          className="w-full bg-terracotta hover:bg-terracotta/90 text-white"
          disabled={saving}
        >
          {saving ? 'Enregistrement…' : 'Continuer'}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
