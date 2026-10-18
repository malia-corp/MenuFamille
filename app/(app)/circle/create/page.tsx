'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowLeft, ArrowRight, Check, Loader2, MessageCircleHeart, Minus, PartyPopper, Plus, Share2, Tag, UserRound, Users } from 'lucide-react'
import { ShareActions, circleInvitePayload, circleJoinUrl } from '@/components/ui/share-actions'

type State = 'idle' | 'saving' | 'done'

interface Circle {
  id: string
  name: string
  invite_code: string
}

const MIN_SIZE = 1
const MAX_SIZE = 20

const STEPS = [
  { icon: Tag,                title: 'Nomme ton cercle',         text: 'Le nom que verra toute ta famille.' },
  { icon: Share2,             title: 'Partage le code',          text: 'Par message, ou en QR code à table.' },
  { icon: MessageCircleHeart, title: 'Chacun donne son avis',    text: 'Sur le menu de la semaine, en un geste.' },
]

const FIELD = 'h-12 w-full rounded-[var(--kkb-r-md)] border-[1.5px] border-[var(--kkb-filet)] bg-white px-4 font-quicksand text-[15px] text-[var(--kkb-profond)] outline-none transition-colors placeholder:text-[var(--kkb-texte-2)] hover:border-[var(--kkb-foret-300)] focus:border-[var(--kkb-foret-500)] disabled:opacity-60'

export default function CreateCirclePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [familySize, setFamilySize] = useState(1)
  const [state, setState] = useState<State>('idle')
  const [circle, setCircle] = useState<Circle | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('saving')
    setError(null)

    try {
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
    } catch {
      setError('Connexion impossible. Réessaie dans un instant.')
      setState('idle')
    }
  }

  const setSize = (n: number) => setFamilySize(Math.min(MAX_SIZE, Math.max(MIN_SIZE, n)))

  // ── Cercle créé : le code à partager ──────────────────────────────────────
  if (state === 'done' && circle) {
    return (
      <Shell
        aside={
          <>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
              <PartyPopper className="h-7 w-7 text-[var(--kkb-jaune)]" />
            </span>
            <p className="mt-5 font-quicksand text-sm font-semibold text-[var(--kkb-foret-100)]">Cercle créé, bravo !</p>
            <h1 className="mt-0.5 text-h1 text-[var(--kkb-creme)]">{circle.name}</h1>
            <p className="text-signature mt-3 text-[var(--kkb-sauge)]">Il ne manque plus que ta famille.</p>
            <Steps current={1} />
          </>
        }
      >
        <h2 className="text-h2 text-[var(--kkb-foret)]">Invite ta tablée</h2>
        <p className="mt-1 font-quicksand text-sm text-[var(--kkb-texte-2)]">
          Envoie le code ou fais scanner le QR code : chacun rejoint le cercle en quelques secondes.
        </p>

        <div className="mt-5 flex items-center gap-4 rounded-[var(--kkb-r-lg)] border-[1.5px] border-dashed border-[var(--kkb-foret-300)] bg-[var(--kkb-foret-50)] p-4">
          <div className="hidden shrink-0 rounded-[var(--kkb-r-sm)] bg-white p-1.5 sm:block">
            <QRCodeSVG value={circleJoinUrl(circle.invite_code)} size={96} fgColor="#294E3B" />
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="font-quicksand text-xs font-semibold text-[var(--kkb-texte-2)]">Code du foyer</p>
            <p className="break-all font-dosis text-[30px] font-extrabold leading-tight tracking-[0.12em] text-[var(--kkb-foret)]">
              {circle.invite_code}
            </p>
          </div>
        </div>

        <ShareActions
          getPayload={() => circleInvitePayload(circle.name, circle.invite_code)}
          copyLabel="Copier le code"
          className="mt-3 flex items-center gap-2"
          buttonClassName="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full border-[1.5px] border-[var(--kkb-filet)] bg-white font-quicksand text-sm font-semibold text-[var(--kkb-foret)] transition-colors hover:border-[var(--kkb-foret-300)] disabled:opacity-60"
          shareButtonClassName="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--kkb-foret)] font-quicksand text-sm font-semibold text-[var(--kkb-creme)] transition-colors hover:bg-[var(--kkb-foret-900)] disabled:opacity-60"
        />

        <div className="mt-8 space-y-2">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--kkb-orange)] font-quicksand text-[15px] font-bold text-white transition-colors hover:bg-[var(--kkb-orange-700)]"
          >
            Commencer à planifier <ArrowRight className="h-4 w-4" />
          </button>
          <Link href="/circle" className="flex h-11 items-center justify-center font-quicksand text-sm font-bold text-[var(--kkb-foret)] hover:underline">
            Voir mon cercle
          </Link>
        </div>
      </Shell>
    )
  }

  // ── Formulaire ────────────────────────────────────────────────────────────
  const saving = state === 'saving'
  const shownName = name.trim()

  return (
    <Shell
      onBack={() => router.back()}
      aside={
        <>
          <p className="font-quicksand text-sm font-semibold text-[var(--kkb-foret-100)]">Cercle familial</p>
          <h1 className="mt-0.5 text-h1 text-[var(--kkb-creme)]">Réunis ta tablée</h1>
          <p className="mt-2 max-w-md font-quicksand text-sm text-[var(--kkb-foret-100)] lg:text-base">
            Tu planifies, ta famille donne son avis : le menu de la semaine se décide à plusieurs.
          </p>
          <Steps current={0} />
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Aperçu du ticket du cercle, mis à jour en direct */}
        <div aria-hidden="true" className="flex items-center gap-3 rounded-[var(--kkb-r-lg)] border-[1.5px] border-dashed border-[var(--kkb-foret-300)] bg-[var(--kkb-foret-50)] p-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--kkb-foret)]">
            <Users className="h-5 w-5 text-[var(--kkb-creme)]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className={`truncate text-h3 ${shownName ? 'text-[var(--kkb-profond)]' : 'text-[var(--kkb-foret-300)]'}`}>
              {shownName || 'Ton cercle'}
            </p>
            <p className="font-quicksand text-xs text-[var(--kkb-texte-2)]">
              {familySize} personne{familySize > 1 ? 's' : ''} à table · code créé à l&apos;étape suivante
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="name" className="block font-quicksand text-sm font-bold text-[var(--kkb-profond)]">Nom du cercle</label>
          <input
            id="name"
            type="text"
            placeholder="ex. Famille Tiando"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="off"
            disabled={saving}
            aria-invalid={!!error}
            aria-describedby={error ? 'create-error' : undefined}
            className={FIELD}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="family_size" className="block font-quicksand text-sm font-bold text-[var(--kkb-profond)]">
            Personnes dans le foyer
          </label>
          <div className="flex items-center gap-4">
            <div className="flex items-center rounded-full border-[1.5px] border-[var(--kkb-filet)] bg-white p-1">
              <button
                type="button"
                onClick={() => setSize(familySize - 1)}
                disabled={saving || familySize <= MIN_SIZE}
                aria-label="Une personne de moins"
                className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--kkb-foret)] transition-colors hover:bg-[var(--kkb-foret-50)] disabled:opacity-40"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                id="family_size"
                type="number"
                inputMode="numeric"
                min={MIN_SIZE}
                max={MAX_SIZE}
                value={familySize}
                onChange={(e) => setSize(Number(e.target.value) || MIN_SIZE)}
                disabled={saving}
                className="w-10 bg-transparent text-center font-dosis text-xl font-extrabold text-[var(--kkb-profond)] outline-none tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => setSize(familySize + 1)}
                disabled={saving || familySize >= MAX_SIZE}
                aria-label="Une personne de plus"
                className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--kkb-foret)] transition-colors hover:bg-[var(--kkb-foret-50)] disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {/* Couverts : une silhouette par personne */}
            <div aria-hidden="true" className="flex min-w-0 flex-wrap items-center gap-1">
              {Array.from({ length: Math.min(familySize, 8) }, (_, i) => (
                <span key={i} className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--kkb-foret-50)]">
                  <UserRound className="h-4 w-4 text-[var(--kkb-foret-500)]" />
                </span>
              ))}
              {familySize > 8 && (
                <span className="font-quicksand text-xs font-bold text-[var(--kkb-foret)]">+{familySize - 8}</span>
              )}
            </div>
          </div>
          <p className="font-quicksand text-xs text-[var(--kkb-texte-2)]">Toi compris.</p>
        </div>

        {error && (
          <p id="create-error" role="alert" className="rounded-[var(--kkb-r-md)] bg-[var(--kkb-danger-light)] px-3 py-2 font-quicksand text-sm text-[var(--kkb-danger)]">
            {error}
          </p>
        )}

        <div className="space-y-3">
          <button
            type="submit"
            disabled={saving || !shownName}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--kkb-orange)] font-quicksand text-[15px] font-bold text-white transition-colors hover:bg-[var(--kkb-orange-700)] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {saving ? 'Création…' : 'Créer mon cercle'}
          </button>
          <p className="text-center font-quicksand text-sm text-[var(--kkb-texte-2)]">
            Tu as reçu un code ?{' '}
            <Link href="/circle/join" className="font-bold text-[var(--kkb-foret)] hover:underline">Rejoindre un cercle</Link>
          </p>
        </div>
      </form>
    </Shell>
  )
}

// Panneau vert (explication) + carte blanche (formulaire), côte à côte sur
// desktop, empilés sur mobile.
function Shell({ aside, onBack, children }: { aside: React.ReactNode; onBack?: () => void; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-lg px-4 pb-8 pt-2 lg:max-w-none lg:px-0 lg:pt-0">
      <div className="grid gap-4 lg:min-h-[calc(100vh-152px)] lg:grid-cols-12 lg:gap-5">
        <aside className="flex flex-col rounded-[var(--kkb-r-xl)] bg-[var(--kkb-foret)] p-5 lg:col-span-5 lg:p-10">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Retour"
              className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[var(--kkb-creme)] transition-colors hover:bg-white/20 lg:mb-8"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          {aside}
        </aside>
        <section className="flex flex-col justify-center rounded-[var(--kkb-r-xl)] bg-white p-5 lg:col-span-7 lg:p-10">
          <div className="mx-auto w-full max-w-md">{children}</div>
        </section>
      </div>
    </div>
  )
}

// Les trois étapes ; current = étape en cours (les précédentes sont cochées).
function Steps({ current }: { current: number }) {
  return (
    <ol className="mt-5 grid grid-cols-3 gap-2 lg:mt-auto lg:grid-cols-1 lg:gap-0 lg:pt-10">
      {STEPS.map(({ icon: Icon, title, text }, i) => {
        const done = i < current
        const now  = i === current
        return (
          <li
            key={title}
            aria-current={now ? 'step' : undefined}
            className="relative flex flex-col items-center gap-2 text-center lg:flex-row lg:items-start lg:gap-4 lg:pb-6 lg:text-left lg:last:pb-0"
          >
            {/* Fil entre les étapes (desktop) */}
            {i < STEPS.length - 1 && (
              <span aria-hidden="true" className={`absolute left-5 top-11 hidden h-[calc(100%-44px)] w-px border-l lg:block ${done ? 'border-solid border-[var(--kkb-sauge)]' : 'border-dashed border-white/25'}`} />
            )}
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              done ? 'bg-[var(--kkb-sauge)] text-[var(--kkb-profond)]' : now ? 'bg-[var(--kkb-creme)] text-[var(--kkb-foret)]' : 'bg-white/10 text-[var(--kkb-sauge)]'
            }`}>
              {done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
            </span>
            <span className="min-w-0">
              <span className={`block font-quicksand text-xs font-bold leading-tight lg:text-[15px] ${done ? 'text-[var(--kkb-foret-100)]' : 'text-[var(--kkb-creme)]'}`}>
                <span className="hidden lg:inline">{i + 1}. </span>{title}
                {done && <span className="sr-only"> (fait)</span>}
              </span>
              <span className="hidden font-quicksand text-sm text-[var(--kkb-foret-100)] lg:block">{text}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
