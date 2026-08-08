'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Copy, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type State = 'idle' | 'saving' | 'done'

interface Circle {
  id: string
  name: string
  invite_code: string
}

export default function CreateCirclePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [state, setState] = useState<State>('idle')
  const [circle, setCircle] = useState<Circle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('saving')
    setError(null)

    const res = await fetch('/api/circles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })

    const data = await res.json()

    if (res.ok) {
      setCircle(data.circle)
      setState('done')
    } else {
      setError(data.error ?? 'Une erreur est survenue')
      setState('idle')
    }
  }

  async function copyCode() {
    if (!circle) return
    await navigator.clipboard.writeText(circle.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (state === 'done' && circle) {
    return (
      <div className="max-w-sm mx-auto px-4 py-8 space-y-6 text-center">
        <div className="flex justify-center">
          <CheckCircle className="h-12 w-12 text-market-green" />
        </div>
        <div className="space-y-1">
          <h1 className="font-dosis font-bold text-xl text-[#2C1810]">Cercle créé !</h1>
          <p className="text-sm text-[#5A4A43]">
            Partage ce code avec ta famille pour qu&apos;ils te rejoignent.
          </p>
        </div>

        <div className="bg-[#FCEEE6] rounded-xl border border-[#E8C99A] p-4 space-y-3 text-left">
          <p className="text-xs text-[#8c7169] uppercase tracking-widest font-medium">Nom du cercle</p>
          <p className="font-semibold text-[#2C1810]">{circle.name}</p>
          <p className="text-xs text-[#8c7169] uppercase tracking-widest font-medium">Code d&apos;invitation</p>
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xl font-bold text-terracotta tracking-widest">
              {circle.invite_code}
            </span>
            <button
              type="button"
              onClick={copyCode}
              className="ml-auto flex items-center gap-1.5 text-sm text-[#5A4A43] hover:text-terracotta transition-colors"
            >
              {copied ? (
                <><CheckCircle className="h-4 w-4 text-market-green" /> Copié</>
              ) : (
                <><Copy className="h-4 w-4" /> Copier</>
              )}
            </button>
          </div>
        </div>

        <Button
          className="w-full bg-terracotta hover:bg-[#C74E21] text-white font-quicksand"
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
          <Users className="h-10 w-10 text-terracotta" />
        </div>
        <h1 className="font-dosis font-bold text-xl text-[#2C1810]">Créer un cercle familial</h1>
        <p className="text-sm text-[#5A4A43]">
          Un cercle te permet de partager tes menus et recettes avec ta famille.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-[#5A4A43]">Nom du cercle</Label>
          <Input
            id="name"
            type="text"
            placeholder="ex. Famille Tiando"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={state === 'saving'}
            className="border-[#E8C99A] bg-white"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button
          type="submit"
          className="w-full bg-terracotta hover:bg-[#C74E21] text-white font-quicksand"
          disabled={state === 'saving'}
        >
          <Plus className="mr-2 h-4 w-4" />
          {state === 'saving' ? 'Création…' : 'Créer mon cercle'}
        </Button>
      </form>

      <button
        type="button"
        className="w-full text-sm text-[#8c7169] hover:text-[#5A4A43] transition-colors"
        onClick={() => router.back()}
      >
        Retour
      </button>
    </div>
  )
}
