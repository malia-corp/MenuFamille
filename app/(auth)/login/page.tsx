'use client'

import { useState } from 'react'
import { Mail, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type State = 'idle' | 'sending' | 'sent'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('sending')
    setError(null)

    const res = await fetch('/api/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    if (res.ok) {
      setState('sent')
    } else {
      const data = await res.json()
      setError(data.error ?? 'Une erreur est survenue')
      setState('idle')
    }
  }

  if (state === 'sent') {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <CheckCircle className="h-12 w-12 text-market-green" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Lien envoyé !</h1>
        <p className="text-sm text-gray-500">
          Vérifie ta boîte mail <span className="font-medium text-gray-700">{email}</span> et clique sur le lien pour te connecter.
        </p>
        <button
          className="text-sm text-terracotta underline"
          onClick={() => setState('idle')}
        >
          Utiliser une autre adresse
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">MenuFamille</h1>
        <p className="text-sm text-gray-500">Connecte-toi pour planifier tes menus</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Adresse email</Label>
          <Input
            id="email"
            type="email"
            placeholder="toi@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={state === 'sending'}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <Button
          type="submit"
          className="w-full bg-terracotta hover:bg-terracotta/90 text-white"
          disabled={state === 'sending'}
        >
          <Mail className="mr-2 h-4 w-4" />
          {state === 'sending' ? 'Envoi en cours…' : 'Envoyer le lien magique'}
        </Button>
      </form>
    </div>
  )
}
