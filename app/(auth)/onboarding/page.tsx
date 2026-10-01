'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, ArrowRight, Crown, Users, ChevronRight } from 'lucide-react'

type Step = 'profile' | 'circle'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('profile')
  const [displayName, setDisplayName] = useState('')
  const [familySize, setFamilySize] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [joinExpanded, setJoinExpanded] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

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

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setJoining(true)
    setJoinError(null)

    const res = await fetch('/api/circles/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code: inviteCode }),
    })

    if (res.ok) {
      router.push('/')
    } else {
      const data = await res.json()
      setJoinError(data.error ?? 'Code invalide')
    }
    setJoining(false)
  }

  if (step === 'circle') {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-1.5">
          <h1 className="text-h1 text-[var(--kkb-text-primary)]">Bienvenue, {displayName} !</h1>
          <p className="text-kkb-body text-[var(--kkb-text-secondary)]">
            Veux-tu rejoindre ou créer un cercle familial ?
          </p>
        </div>

        <div className="space-y-4">
          {/* Carte A — Planificatrice */}
          <div className="bg-white border border-[var(--kkb-border)] rounded-[var(--kkb-radius-card)] p-5 space-y-3">
            <div className="flex items-center gap-3">
              <span className="h-10 w-10 rounded-full bg-[var(--kkb-coral-light)] flex items-center justify-center shrink-0">
                <Crown className="h-5 w-5 text-[var(--kkb-coral)]" />
              </span>
              <div>
                <p className="font-dosis font-bold text-[var(--kkb-text-primary)]">Je planifie les repas</p>
                <p className="text-xs font-quicksand text-[var(--kkb-text-secondary)]">
                  Je crée et partage les menus de ma famille
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push('/circle/create')}
              className="w-full flex items-center justify-center gap-2 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral)] hover:bg-[var(--kkb-coral-hover)] text-white font-quicksand font-bold text-sm py-3 transition-colors"
            >
              Créer mon cercle familial <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Carte B — Membre */}
          <div className="bg-white border border-[var(--kkb-border)] rounded-[var(--kkb-radius-card)] p-5 space-y-3">
            <div className="flex items-center gap-3">
              <span className="h-10 w-10 rounded-full bg-[var(--kkb-teal-light)] flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-[var(--kkb-teal)]" />
              </span>
              <div>
                <p className="font-dosis font-bold text-[var(--kkb-text-primary)]">Je fais partie d&apos;un foyer</p>
                <p className="text-xs font-quicksand text-[var(--kkb-text-secondary)]">
                  J&apos;ai reçu un code d&apos;invitation
                </p>
              </div>
            </div>

            {!joinExpanded ? (
              <button
                type="button"
                onClick={() => setJoinExpanded(true)}
                className="w-full flex items-center justify-center gap-2 rounded-[var(--kkb-radius-pill)] border-[1.5px] border-[var(--kkb-border)] bg-white hover:bg-[var(--kkb-bg)] text-[var(--kkb-text-secondary)] font-quicksand font-semibold text-sm py-3 transition-colors"
              >
                Rejoindre un cercle <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <form onSubmit={handleJoin} className="space-y-2">
                <input
                  type="text"
                  placeholder="Code (ex: ROSI-42)"
                  value={inviteCode}
                  onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); setJoinError(null) }}
                  required
                  disabled={joining}
                  autoFocus
                  className="w-full px-4 py-3 rounded-[var(--kkb-radius-sm)] border-[1.5px] border-[var(--kkb-border)] bg-white text-center font-quicksand font-semibold tracking-widest uppercase text-[var(--kkb-text-primary)] outline-none focus:border-[var(--kkb-teal)] disabled:opacity-50"
                />
                {joinError && <p className="text-sm text-center text-[var(--kkb-danger)]">{joinError}</p>}
                <button
                  type="submit"
                  disabled={joining}
                  className="w-full flex items-center justify-center gap-2 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-teal)] hover:opacity-90 text-white font-quicksand font-bold text-sm py-3 transition-opacity disabled:opacity-50"
                >
                  {joining ? 'Vérification…' : 'Rejoindre'}
                </button>
              </form>
            )}
          </div>

          <button
            type="button"
            onClick={() => router.push('/')}
            className="w-full text-center text-sm font-quicksand text-[var(--kkb-text-tertiary)] py-2"
          >
            Passer pour l&apos;instant →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1.5">
        <div className="flex justify-center">
          <span className="h-14 w-14 rounded-full bg-[var(--kkb-coral-light)] flex items-center justify-center">
            <User className="h-7 w-7 text-[var(--kkb-coral)]" />
          </span>
        </div>
        <h1 className="text-h1 text-[var(--kkb-text-primary)]">Crée ton profil</h1>
        <p className="text-kkb-body text-[var(--kkb-text-secondary)]">
          Quelques infos pour personnaliser tes menus
        </p>
      </div>

      <form onSubmit={handleProfileSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="display_name" className="text-kkb-label text-[var(--kkb-text-tertiary)]">
            Ton prénom ou surnom
          </label>
          <input
            id="display_name"
            type="text"
            placeholder="ex. Malia"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            disabled={saving}
            className="w-full px-4 py-3.5 rounded-[var(--kkb-radius-sm)] border-[1.5px] border-[var(--kkb-border)] bg-white font-quicksand text-sm text-[var(--kkb-text-primary)] outline-none focus:border-[var(--kkb-coral)] disabled:opacity-50"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="family_size" className="text-kkb-label text-[var(--kkb-text-tertiary)]">
            Nombre de personnes dans ton foyer
          </label>
          <input
            id="family_size"
            type="number"
            min={1}
            max={20}
            value={familySize}
            onChange={(e) => setFamilySize(Number(e.target.value))}
            required
            disabled={saving}
            className="w-full px-4 py-3.5 rounded-[var(--kkb-radius-sm)] border-[1.5px] border-[var(--kkb-border)] bg-white font-quicksand text-sm text-[var(--kkb-text-primary)] outline-none focus:border-[var(--kkb-coral)] disabled:opacity-50"
          />
        </div>

        {error && <p className="text-sm text-[var(--kkb-danger)]">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral)] hover:bg-[var(--kkb-coral-hover)] text-white font-quicksand font-bold text-[15px] py-4 transition-colors disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : 'Continuer'}
          {!saving && <ChevronRight className="h-4 w-4" />}
        </button>
      </form>
    </div>
  )
}
