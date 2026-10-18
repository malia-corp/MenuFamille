'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  ExternalLink,
  Headphones,
  Heart,
  Lightbulb,
  Mail,
  MailCheck,
  MessageCircleHeart,
  Pencil,
  ShieldCheck,
  Sparkles,
  Timer,
  type LucideIcon,
} from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { GoogleIcon } from '@/components/brand/google-icon'
import { MEAL_ICON } from '@/lib/constants/meal-type-icon'
import { toast } from '@/lib/stores/toast-store'

type State = 'idle' | 'sending' | 'otp' | 'verifying'
type AuthMode = 'code' | 'link'

const EMPTY_CODE = ['', '', '', '', '', '']

const formatCountdown = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

const PROMISES: { icon: LucideIcon; text: string }[] = [
  { icon: CalendarDays, text: 'Le menu de la semaine en 2 minutes' },
  { icon: MessageCircleHeart, text: 'Toute la famille donne son avis' },
  { icon: BookOpen, text: 'Tes recettes, partagées avec ton cercle' },
]

// Pastilles décoratives des 4 types de repas (bandeau de marque).
const MEAL_STRIP = [
  { icon: MEAL_ICON.petit_dejeuner, color: 'text-[var(--kkb-jaune)]' },
  { icon: MEAL_ICON.dejeuner, color: 'text-[var(--kkb-orange-300)]' },
  { icon: MEAL_ICON.gouter, color: 'text-[var(--kkb-sauge)]' },
  { icon: MEAL_ICON.diner, color: 'text-[var(--kkb-creme)]' },
]

function MealStrip({ small = false }: { small?: boolean }) {
  return (
    <div className="flex gap-2" aria-hidden="true">
      {MEAL_STRIP.map(({ icon: Icon, color }, i) => (
        <span
          key={i}
          className={`${small ? 'h-8 w-8' : 'h-10 w-10'} flex items-center justify-center rounded-full bg-white/10`}
        >
          <Icon className={`${small ? 'h-4 w-4' : 'h-5 w-5'} ${color}`} />
        </span>
      ))}
    </div>
  )
}

// Signature de marque (Bricolage, une fois par écran) soulignée d'orange.
function Signature({ className }: { className: string }) {
  return (
    <p className={`font-main font-semibold text-[var(--kkb-creme)] ${className}`}>
      On mange quoi ?<br />
      On décide ensemble.
      <span
        className="mt-2.5 block h-1 w-14 rounded-full bg-[var(--kkb-orange)]"
        aria-hidden="true"
      />
    </p>
  )
}

// Desktop : panneau de marque à gauche, formulaire à droite. Mobile : bandeau
// de marque au-dessus du formulaire (étape e-mail seulement).
function LoginShell({
  showMobileHero,
  children,
}: {
  showMobileHero: boolean
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hidden flex-col justify-between bg-[var(--kkb-foret)] p-12 lg:flex xl:p-16">
        <Logo variant="reversed" layout="horizontal" size={64} />
        <div className="space-y-10">
          <Signature className="text-[32px] leading-[1.1]" />
          <ul className="space-y-4">
            {PROMISES.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-center gap-3 text-[17px] text-[var(--kkb-creme)]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <Icon className="h-5 w-5 text-[var(--kkb-sauge)]" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col items-start gap-4">
          <MealStrip />
          <p className="flex items-center gap-1.5 text-sm text-[var(--kkb-foret-100)]">
            <Heart className="h-4 w-4 text-[var(--kkb-orange-300)]" /> Cuisiné avec amour pour toute
            la famille
          </p>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        {showMobileHero && (
          <header className="rounded-b-[var(--kkb-r-xl)] bg-[var(--kkb-foret)] px-5 pb-6 pt-[calc(env(safe-area-inset-top)+20px)] lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <Logo variant="reversed" layout="horizontal" size={28} />
              <MealStrip small />
            </div>
            <Signature className="mt-5 text-[24px] leading-[1.15]" />
          </header>
        )}
        <main className="flex flex-1 justify-center px-5 py-6 lg:items-center lg:px-12 lg:py-8">
          <div className="w-full max-w-sm">{children}</div>
        </main>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [authMode, setAuthMode] = useState<AuthMode>('code')
  const [digits, setDigits] = useState(EMPTY_CODE)
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Auto-focus premier champ OTP
  useEffect(() => {
    if (state === 'otp') {
      setCountdown(60)
      setTimeout(() => inputRefs.current[0]?.focus(), 50)
    }
  }, [state])

  // Countdown renvoyer le code
  useEffect(() => {
    if (state !== 'otp' || countdown <= 0) return
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [state, countdown])

  function resetToEmailStep() {
    setState('idle')
    setDigits(EMPTY_CODE)
    setError(null)
    setAuthMode('code')
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('sending')
    setError(null)

    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    if (res.ok) {
      const data = await res.json()
      setAuthMode(data.preferredMode ?? 'code')
      setState('otp')
    } else {
      const data = await res.json()
      setError(data.error ?? 'Une erreur est survenue')
      setState('idle')
    }
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault()
    const token = digits.join('')
    if (token.length < 6) {
      setError('Saisis les 6 chiffres du code')
      return
    }

    setState('verifying')
    setError(null)

    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token, authMode }),
    })

    const data = await res.json()

    if (res.ok) {
      router.push(data.redirect)
    } else {
      setError(data.error ?? 'Code incorrect')
      setState('otp')
      setDigits(EMPTY_CODE)
      setShake(true)
      setTimeout(() => inputRefs.current[0]?.focus(), 50)
    }
  }

  function handleDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleDigitKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  // Coller le code reçu par e-mail remplit les 6 cases d'un coup.
  function handleDigitPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    e.preventDefault()
    const next = [...EMPTY_CODE]
    pasted.split('').forEach((d, i) => {
      next[i] = d
    })
    setDigits(next)
    inputRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  async function handleResend() {
    setError(null)
    await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setDigits(EMPTY_CODE)
    setCountdown(60)
    setTimeout(() => inputRefs.current[0]?.focus(), 50)
  }

  const digitsFilled = digits.every((d) => d !== '')
  const supportSoon = () => toast.info('Le support familial arrive bientôt.')

  // ── Écran OTP ──────────────────────────────────────────────────────────────
  if (state === 'otp' || state === 'verifying') {
    return (
      <LoginShell showMobileHero={false}>
        <div className="space-y-5">
          {/* Barre de navigation */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={resetToEmailStep}
              aria-label="Retour"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--kkb-border)] bg-white text-[var(--kkb-foret)] transition-colors hover:border-[var(--kkb-foret-300)]"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--kkb-sauge-50)] px-3 text-[13px] font-semibold text-[var(--kkb-foret)]">
              <ShieldCheck className="h-4 w-4 text-[var(--kkb-foret-500)]" /> Étape sécurisée
            </span>
            <button
              type="button"
              onClick={supportSoon}
              aria-label="Support"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--kkb-border)] bg-white text-[var(--kkb-text-secondary)] transition-colors hover:border-[var(--kkb-foret-300)]"
            >
              <Headphones className="h-5 w-5" />
            </button>
          </div>

          {/* Illustration + titre */}
          <div className="flex flex-col items-center gap-3 pt-1 text-center">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--kkb-sauge-50)]">
                <MailCheck className="h-9 w-9 text-[var(--kkb-foret)]" />
              </div>
              <span
                className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--kkb-creme)] bg-[var(--kkb-jaune-50)]"
                aria-hidden="true"
              >
                <Sparkles className="h-4 w-4 text-[var(--kkb-jaune-700)]" />
              </span>
            </div>
            <h1 className="text-h1 text-[var(--kkb-foret)] max-[380px]:text-[24px] max-[380px]:leading-[30px]">
              Vérifie ta boîte mail
            </h1>
            <p className="text-balance text-[15px] text-[var(--kkb-text-secondary)]">
              {authMode === 'code'
                ? 'Saisis le code à 6 chiffres reçu par e-mail.'
                : 'Ouvre le lien de connexion reçu par e-mail.'}
            </p>
          </div>

          {/* Carte de saisie */}
          <div className="space-y-4 rounded-[var(--kkb-r-lg)] bg-white p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-xs text-[var(--kkb-text-secondary)]">
                  <Mail className="h-3.5 w-3.5" /> Envoyé à
                </p>
                <p className="truncate text-sm font-semibold text-[var(--kkb-text-primary)]">
                  {email}
                </p>
              </div>
              <button
                type="button"
                onClick={resetToEmailStep}
                aria-label={`Modifier l'adresse ${email}`}
                title="Modifier l'adresse"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--kkb-foret-50)] text-[var(--kkb-foret)] transition-colors hover:bg-[var(--kkb-foret-100)]"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
            <div className="h-px bg-[var(--kkb-border-light)]" />

            {authMode === 'code' ? (
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div
                  className={`grid grid-cols-6 gap-2 ${shake ? 'animate-shake' : ''}`}
                  onAnimationEnd={() => setShake(false)}
                >
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        inputRefs.current[i] = el
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      aria-label={`Chiffre ${i + 1} du code`}
                      value={d}
                      onChange={(e) => handleDigitChange(i, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(i, e)}
                      onPaste={handleDigitPaste}
                      disabled={state === 'verifying'}
                      className={`h-14 w-full min-w-0 rounded-[var(--kkb-r-md)] border-[1.5px] text-center font-dosis text-[22px] font-extrabold outline-none transition-colors disabled:opacity-50 ${
                        d
                          ? 'border-[var(--kkb-foret-500)] bg-[var(--kkb-foret-50)] text-[var(--kkb-foret)]'
                          : 'border-[var(--kkb-border)] bg-white text-[var(--kkb-text-primary)] focus:border-[var(--kkb-foret-500)] focus:shadow-[0_0_0_3px_var(--kkb-foret-100)]'
                      }`}
                    />
                  ))}
                </div>

                {error && (
                  <p role="alert" className="text-center text-sm text-[var(--kkb-danger)]">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={state === 'verifying' || !digitsFilled}
                  className="text-btn-primary flex h-12 w-full items-center justify-center gap-2 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral)] text-white transition-colors hover:bg-[var(--kkb-coral-hover)] disabled:opacity-50"
                >
                  {state === 'verifying' ? 'Vérification…' : 'Vérifier et continuer'}
                  {state !== 'verifying' && <ArrowRight className="h-4 w-4" />}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-sm text-[var(--kkb-text-tertiary)]">
                  <Timer className="h-3.5 w-3.5" />
                  {countdown > 0 ? (
                    <span>
                      Nouveau code possible dans{' '}
                      <span className="font-bold tabular-nums text-[var(--kkb-foret)]">
                        {formatCountdown(countdown)}
                      </span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      className="min-h-11 font-bold text-[var(--kkb-foret)] underline hover:no-underline"
                    >
                      Renvoyer le code
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <div className="space-y-3 text-center">
                <ExternalLink className="mx-auto h-6 w-6 text-[var(--kkb-foret)]" />
                <p className="text-[15px] text-[var(--kkb-text-secondary)]">
                  Clique sur le lien reçu par courriel pour te connecter. Il est valable 60 minutes.
                </p>
                <div className="flex items-center justify-center gap-1.5 text-sm text-[var(--kkb-text-tertiary)]">
                  <Timer className="h-3.5 w-3.5" />
                  {countdown > 0 ? (
                    <span>
                      Nouveau lien possible dans{' '}
                      <span className="font-bold tabular-nums text-[var(--kkb-foret)]">
                        {formatCountdown(countdown)}
                      </span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      className="min-h-11 font-bold text-[var(--kkb-foret)] underline hover:no-underline"
                    >
                      Renvoyer l&apos;email
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <p className="flex items-start gap-2.5 px-1 text-[13px] text-[var(--kkb-text-secondary)]">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[var(--kkb-jaune-700)]" />
            <span>
              Rien reçu&nbsp;? Jette un œil aux indésirables ou à l’onglet
              «&nbsp;Promotions&nbsp;»&nbsp;: la tambouille s’y cache parfois.
            </span>
          </p>

          {/* Toggle discret lien magique */}
          <div className="flex flex-col items-center gap-1 pt-2 text-[13px] text-[var(--kkb-text-secondary)]">
            <button
              type="button"
              onClick={() => setAuthMode((m) => (m === 'code' ? 'link' : 'code'))}
              className="min-h-11 underline hover:text-[var(--kkb-foret)]"
            >
              {authMode === 'code' ? 'Utiliser le lien magique plutôt' : 'Saisir le code plutôt'}
            </button>
            <p>
              Besoin d&apos;aide ?{' '}
              <button
                type="button"
                onClick={supportSoon}
                className="min-h-11 font-semibold text-[var(--kkb-foret)] underline"
              >
                Contacter le support familial
              </button>
            </p>
          </div>
        </div>
      </LoginShell>
    )
  }

  // ── Écran Email ────────────────────────────────────────────────────────────
  return (
    <LoginShell showMobileHero>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-h1 text-[var(--kkb-foret)]">Bienvenue à table&nbsp;!</h1>
          <p className="text-base text-[var(--kkb-text-secondary)]">
            Entre ton e-mail, on t’envoie un code pour te connecter. Pas de mot de passe à retenir.
          </p>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-[var(--kkb-text-primary)]"
            >
              Ton adresse e-mail
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--kkb-text-tertiary)]" />
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="ex : rosine.famille@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={state === 'sending'}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'email-error' : undefined}
                className="placeholder:text-[var(--kkb-text-tertiary)]/70 h-12 w-full rounded-full border-[1.5px] border-[var(--kkb-border)] bg-white pl-12 pr-4 text-base text-[var(--kkb-profond)] outline-none transition-shadow focus:border-[var(--kkb-foret-500)] focus:shadow-[0_0_0_3px_var(--kkb-foret-100)] disabled:opacity-50"
              />
            </div>
          </div>

          {error && (
            <p id="email-error" role="alert" className="text-sm text-[var(--kkb-danger)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={state === 'sending'}
            className="text-btn-primary flex h-12 w-full items-center justify-center gap-2 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral)] text-white transition-colors hover:bg-[var(--kkb-coral-hover)] disabled:opacity-50"
          >
            {state === 'sending' ? 'Envoi en cours…' : 'Continuer'}
            {state !== 'sending' && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        {/* Séparateur */}
        <div className="flex items-center gap-3" aria-hidden="true">
          <div className="h-px flex-1 bg-[var(--kkb-border)]" />
          <span className="text-xs font-semibold text-[var(--kkb-text-tertiary)]">ou</span>
          <div className="h-px flex-1 bg-[var(--kkb-border)]" />
        </div>

        <button
          type="button"
          onClick={() => toast.info('La connexion avec Google arrive bientôt.')}
          className="text-btn-secondary flex h-12 w-full items-center justify-center gap-3 rounded-[var(--kkb-radius-pill)] border-[1.5px] border-[var(--kkb-border)] bg-white text-[var(--kkb-text-primary)] transition-colors hover:border-[var(--kkb-foret-300)]"
        >
          <GoogleIcon size={20} /> Continuer avec Google
        </button>

        <div className="flex items-start gap-3 rounded-[var(--kkb-r-md)] bg-[var(--kkb-sauge-50)] p-4">
          <ShieldCheck className="h-5 w-5 shrink-0 text-[var(--kkb-foret-500)]" />
          <p className="text-sm text-[var(--kkb-text-secondary)]">
            <span className="font-semibold text-[var(--kkb-foret)]">Nouveau ici ?</span> Ton compte
            se crée tout seul à ta première connexion.
          </p>
        </div>

        <p className="text-center text-xs leading-relaxed text-[var(--kkb-text-tertiary)]">
          En continuant, tu acceptes nos{' '}
          <span className="text-[var(--kkb-foret)] underline">Conditions d’utilisation</span>, notre{' '}
          <span className="text-[var(--kkb-foret)] underline">Politique de confidentialité</span> et
          nos <span className="text-[var(--kkb-foret)] underline">Mentions légales</span>.
        </p>
      </div>
    </LoginShell>
  )
}
