'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Key, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type State = 'idle' | 'joining' | 'done'

export default function JoinCirclePage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [state, setState] = useState<State>('idle')
  const [circleName, setCircleName] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Lien d'accès / QR code du cercle : ?code=… pré-remplit le champ.
  useEffect(() => {
    const fromLink = new URLSearchParams(window.location.search).get('code')
    if (fromLink) setCode(fromLink.toUpperCase())
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('joining')
    setError(null)

    const res = await fetch('/api/circles/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code: code }),
    })

    const data = await res.json()

    if (res.ok) {
      setCircleName(data.circle.name)
      setState('done')
    } else {
      setError(data.error ?? 'Une erreur est survenue')
      setState('idle')
    }
  }

  if (state === 'done') {
    return (
      <div className="max-w-sm mx-auto px-4 py-8 space-y-6 text-center">
        <div className="flex justify-center">
          <CheckCircle className="h-12 w-12 text-[var(--kkb-success)]" />
        </div>
        <h1 className="font-dosis font-bold text-xl text-[var(--kkb-text-primary)]">Tu as rejoint le cercle !</h1>
        <p className="text-sm text-[var(--kkb-text-secondary)]">
          Bienvenue dans <span className="font-semibold text-[var(--kkb-text-primary)]">{circleName}</span>
        </p>
        <Button
          className="w-full bg-[var(--kkb-coral)] hover:bg-[var(--kkb-coral-hover)] text-white font-quicksand"
          onClick={() => router.push('/')}
        >
          Commencer à planifier
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <Key className="h-10 w-10 text-[var(--kkb-coral)]" />
        </div>
        <h1 className="font-dosis font-bold text-xl text-[var(--kkb-text-primary)]">Rejoindre un cercle</h1>
        <p className="text-sm text-[var(--kkb-text-secondary)]">
          Saisis le code partagé par la planificatrice de ta famille.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code" className="text-[var(--kkb-text-secondary)]">Code d&apos;invitation</Label>
          <Input
            id="code"
            type="text"
            placeholder="PRÉNOM-XX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
            disabled={state === 'joining'}
            className="font-mono tracking-widest text-center text-lg uppercase border-[var(--kkb-border)] bg-white"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button
          type="submit"
          className="w-full bg-[var(--kkb-coral)] hover:bg-[var(--kkb-coral-hover)] text-white font-quicksand"
          disabled={state === 'joining'}
        >
          <Users className="mr-2 h-4 w-4" />
          {state === 'joining' ? 'Vérification…' : 'Rejoindre'}
        </Button>
      </form>

      <button
        type="button"
        className="w-full text-sm text-[var(--kkb-text-tertiary)] hover:text-[var(--kkb-text-secondary)] transition-colors"
        onClick={() => router.back()}
      >
        Retour
      </button>
    </div>
  )
}
