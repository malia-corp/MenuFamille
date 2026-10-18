'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, ClipboardPaste, KeyRound, Loader2, MessageCircleHeart, PartyPopper, Users } from 'lucide-react'
import { EntryShell, EntrySteps, type EntryStep } from '@/components/circle/entry-shell'

type State = 'idle' | 'joining' | 'done'

const STEPS: EntryStep[] = [
  { icon: KeyRound,           title: 'Récupère le code',      text: 'La planificatrice te l’envoie, ou le montre en QR code.' },
  { icon: Users,              title: 'Rejoins la tablée',     text: 'Saisis-le ici : tu entres dans le cercle.' },
  { icon: MessageCircleHeart, title: 'Donne ton avis',        text: 'Sur le menu de la semaine, en un geste.' },
]

// Code du foyer : prénom en majuscules, tiret, deux chiffres (PRÉNOM-42).
const clean = (v: string) => v.toUpperCase().replace(/\s+/g, '')

export default function JoinCirclePage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [state, setState] = useState<State>('idle')
  const [circleName, setCircleName] = useState('')
  const [error, setError] = useState<{ message: string; alreadyMember: boolean } | null>(null)
  const [shake, setShake] = useState(false)
  const [canPaste, setCanPaste] = useState(false)

  // Lien d'accès / QR code du cercle : ?code=… pré-remplit le champ.
  useEffect(() => {
    const fromLink = new URLSearchParams(window.location.search).get('code')
    if (fromLink) setCode(clean(fromLink))
    setCanPaste(typeof navigator !== 'undefined' && !!navigator.clipboard?.readText)
  }, [])

  async function paste() {
    try {
      const text = await navigator.clipboard.readText()
      if (text.trim()) { setCode(clean(text.trim())); setError(null) }
    } catch {
      /* lecture refusée par le navigateur : la saisie reste possible */
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('joining')
    setError(null)

    try {
      const res = await fetch('/api/circles/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: code }),
      })
      const data = await res.json()

      if (res.ok) {
        setCircleName(data.circle.name)
        setState('done')
        return
      }
      setError({ message: data.error ?? 'Une erreur est survenue', alreadyMember: res.status === 409 })
    } catch {
      setError({ message: 'Connexion impossible. Réessaie dans un instant.', alreadyMember: false })
    }
    setState('idle')
    setShake(true)
    setTimeout(() => setShake(false), 450)
  }

  // ── Cercle rejoint ────────────────────────────────────────────────────────
  if (state === 'done') {
    return (
      <EntryShell
        aside={
          <>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
              <PartyPopper className="h-7 w-7 text-[var(--kkb-jaune)]" />
            </span>
            <p className="mt-5 font-quicksand text-sm font-semibold text-[var(--kkb-foret-100)]">Bienvenue à table</p>
            <h1 className="mt-0.5 text-h1 text-[var(--kkb-creme)]">{circleName}</h1>
            <p className="text-signature mt-3 text-[var(--kkb-sauge)]">Ta place est mise.</p>
            <EntrySteps steps={STEPS} current={2} />
          </>
        }
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--kkb-sauge-50)]">
          <Users className="h-6 w-6 text-[var(--kkb-foret-500)]" />
        </span>
        <h2 className="mt-4 text-h2 text-[var(--kkb-foret)]">Tu fais partie du cercle</h2>
        <p className="mt-1 font-quicksand text-sm text-[var(--kkb-texte-2)]">
          Dès que le menu de la semaine est prêt, tu pourras donner ton avis sur chaque repas. Pense aussi à indiquer tes allergies et tes envies : elles guident la génération du menu.
        </p>
        <div className="mt-8 space-y-2">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--kkb-orange)] font-quicksand text-[15px] font-bold text-white transition-colors hover:bg-[var(--kkb-orange-700)]"
          >
            C&apos;est parti <ArrowRight className="h-4 w-4" />
          </button>
          <Link href="/circle" className="flex h-11 items-center justify-center font-quicksand text-sm font-bold text-[var(--kkb-foret)] hover:underline">
            Voir le cercle et mes préférences
          </Link>
        </div>
      </EntryShell>
    )
  }

  // ── Saisie du code ────────────────────────────────────────────────────────
  const joining = state === 'joining'

  return (
    <EntryShell
      onBack={() => router.back()}
      aside={
        <>
          <p className="font-quicksand text-sm font-semibold text-[var(--kkb-foret-100)]">Cercle familial</p>
          <h1 className="mt-0.5 text-h1 text-[var(--kkb-creme)]">Rejoins ta tablée</h1>
          <p className="mt-2 max-w-md font-quicksand text-sm text-[var(--kkb-foret-100)] lg:text-base">
            Ta famille planifie ses repas sur KeskonBouf. Avec son code, tu donnes ton avis sur le menu de la semaine.
          </p>
          <EntrySteps steps={STEPS} current={1} />
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h2 className="text-h2 text-[var(--kkb-foret)]">Ton code d&apos;invitation</h2>
          <p className="mt-1 font-quicksand text-sm text-[var(--kkb-texte-2)]">
            Il ressemble à <span className="font-bold text-[var(--kkb-profond)]">PRÉNOM-42</span>. Tu le trouves dans le message reçu, ou dans le cercle de la personne qui t&apos;invite.
          </p>
        </div>

        {/* Le champ prend la forme du ticket du code, comme dans le cercle */}
        <div className={`rounded-[var(--kkb-r-lg)] border-[1.5px] border-dashed p-4 transition-colors ${
          error ? 'border-[var(--kkb-danger)] bg-[var(--kkb-danger-light)]' : 'border-[var(--kkb-foret-300)] bg-[var(--kkb-foret-50)]'
        } ${shake ? 'animate-shake' : ''}`}>
          <label htmlFor="code" className="block text-center font-quicksand text-xs font-semibold text-[var(--kkb-texte-2)]">Code du foyer</label>
          <input
            id="code"
            type="text"
            placeholder="PRÉNOM-42"
            value={code}
            onChange={(e) => { setCode(clean(e.target.value)); setError(null) }}
            required
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            disabled={joining}
            aria-invalid={!!error}
            aria-describedby={error ? 'join-error' : undefined}
            className="mt-1 w-full bg-transparent text-center font-dosis text-[30px] font-extrabold uppercase leading-tight tracking-[0.12em] text-[var(--kkb-foret)] outline-none placeholder:text-[var(--kkb-foret-300)] placeholder:opacity-60 disabled:opacity-60"
          />
          {canPaste && (
            <div className="mt-2 flex justify-center">
              <button
                type="button"
                onClick={() => void paste()}
                disabled={joining}
                className="flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 font-quicksand text-xs font-bold text-[var(--kkb-foret)] transition-colors hover:bg-[var(--kkb-foret-100)] disabled:opacity-60"
              >
                <ClipboardPaste className="h-3.5 w-3.5" /> Coller le code
              </button>
            </div>
          )}
        </div>

        {error && (
          <p id="join-error" role="alert" className="font-quicksand text-sm text-[var(--kkb-danger)]">
            {error.message}
            {error.alreadyMember && (
              <>
                {' '}
                <Link href="/circle" className="font-bold text-[var(--kkb-foret)] underline">Voir mon cercle</Link>
              </>
            )}
          </p>
        )}

        <div className="space-y-3">
          <button
            type="submit"
            disabled={joining || !code}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--kkb-orange)] font-quicksand text-[15px] font-bold text-white transition-colors hover:bg-[var(--kkb-orange-700)] disabled:opacity-50"
          >
            {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
            {joining ? 'Vérification…' : 'Rejoindre le cercle'}
          </button>
          <p className="text-center font-quicksand text-sm text-[var(--kkb-texte-2)]">
            Pas de code ?{' '}
            <Link href="/circle/create" className="font-bold text-[var(--kkb-foret)] hover:underline">Crée ton propre cercle</Link>
          </p>
        </div>
      </form>
    </EntryShell>
  )
}
