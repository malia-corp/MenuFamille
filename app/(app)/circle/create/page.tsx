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
  const [familySize, setFamilySize] = useState(1)
  const [state, setState] = useState<State>('idle')
  const [circle, setCircle] = useState<Circle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('saving')
    setError(null)

    const [res] = await Promise.all([
      fetch('/api/circles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      }),
      // Non bloquant : la taille du foyer est une info de profil annexe,
      // son echec eventuel ne doit pas empecher la creation du cercle.
      fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ family_size: familySize }),
      }).catch(() => {}),
    ])

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
          <CheckCircle className="h-12 w-12 text-[var(--kkb-success)]" />
        </div>
        <div className="space-y-1">
          <h1 className="font-dosis font-bold text-xl text-[var(--kkb-text-primary)]">Cercle créé !</h1>
          <p className="text-sm text-[var(--kkb-text-secondary)]">
            Partage ce code avec ta famille pour qu&apos;ils te rejoignent.
          </p>
        </div>

        <div className="bg-[var(--kkb-coral-light)] rounded-xl border border-[var(--kkb-border)] p-4 space-y-3 text-left">
          <p className="text-xs text-[var(--kkb-text-tertiary)] uppercase tracking-widest font-medium">Nom du cercle</p>
          <p className="font-semibold text-[var(--kkb-text-primary)]">{circle.name}</p>
          <p className="text-xs text-[var(--kkb-text-tertiary)] uppercase tracking-widest font-medium">Code d&apos;invitation</p>
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xl font-bold text-[var(--kkb-coral)] tracking-widest">
              {circle.invite_code}
            </span>
            <button
              type="button"
              onClick={copyCode}
              className="ml-auto flex items-center gap-1.5 text-sm text-[var(--kkb-text-secondary)] hover:text-[var(--kkb-coral-hover)] transition-colors"
            >
              {copied ? (
                <><CheckCircle className="h-4 w-4 text-[var(--kkb-success)]" /> Copié</>
              ) : (
                <><Copy className="h-4 w-4" /> Copier</>
              )}
            </button>
          </div>
        </div>

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
          <Users className="h-10 w-10 text-[var(--kkb-coral)]" />
        </div>
        <h1 className="font-dosis font-bold text-xl text-[var(--kkb-text-primary)]">Créer un cercle familial</h1>
        <p className="text-sm text-[var(--kkb-text-secondary)]">
          Un cercle te permet de partager tes menus et recettes avec ta famille.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-[var(--kkb-text-secondary)]">Nom du cercle</Label>
          <Input
            id="name"
            type="text"
            placeholder="ex. Famille Tiando"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={state === 'saving'}
            className="border-[var(--kkb-border)] bg-white"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="family_size" className="text-[var(--kkb-text-secondary)]">
            Nombre de personnes dans le foyer
          </Label>
          <Input
            id="family_size"
            type="number"
            min={1}
            max={20}
            value={familySize}
            onChange={(e) => setFamilySize(Number(e.target.value))}
            required
            disabled={state === 'saving'}
            className="border-[var(--kkb-border)] bg-white"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button
          type="submit"
          className="w-full bg-[var(--kkb-coral)] hover:bg-[var(--kkb-coral-hover)] text-white font-quicksand"
          disabled={state === 'saving'}
        >
          <Plus className="mr-2 h-4 w-4" />
          {state === 'saving' ? 'Création…' : 'Créer mon cercle'}
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
