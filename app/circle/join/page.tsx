'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Key, CheckCircle } from 'lucide-react'
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
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="flex justify-center">
            <CheckCircle className="h-12 w-12 text-market-green" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Tu as rejoint le cercle !</h1>
          <p className="text-sm text-gray-500">
            Bienvenue dans <span className="font-medium text-gray-700">{circleName}</span>
          </p>
          <Button
            className="w-full bg-terracotta hover:bg-terracotta/90 text-white"
            onClick={() => router.push('/')}
          >
            Commencer à planifier
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <Key className="h-10 w-10 text-terracotta" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Rejoindre un cercle</h1>
          <p className="text-sm text-gray-500">
            Saisis le code partagé par la planificatrice de ta famille.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Code d&apos;invitation</Label>
            <Input
              id="code"
              type="text"
              placeholder="FAM-XXXX"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              disabled={state === 'joining'}
              className="font-mono tracking-widest text-center text-lg uppercase"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            type="submit"
            className="w-full bg-terracotta hover:bg-terracotta/90 text-white"
            disabled={state === 'joining'}
          >
            <Users className="mr-2 h-4 w-4" />
            {state === 'joining' ? 'Vérification…' : 'Rejoindre'}
          </Button>
        </form>

        <button
          className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
          onClick={() => router.back()}
        >
          Retour
        </button>
      </div>
    </div>
  )
}
