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
  Shield,
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
  { icon: CalendarDays,       text: 'Le menu de la semaine en 2 minutes' },
  { icon: MessageCircleHeart, text: 'Toute la famille donne son avis' },
  { icon: BookOpen,           text: 'Tes recettes, partagées avec ton cercle' },
]

// Pastilles décoratives des 4 types de repas (bandeau de marque).
const MEAL_STRIP = [
  { icon: MEAL_ICON.petit_dejeuner, color: 'text-[var(--kkb-jaune)]' },
  { icon: MEAL_ICON.dejeuner,       color: 'text-[var(--kkb-orange-300)]' },
  { icon: MEAL_ICON.gouter,         color: 'text-[var(--kkb-sauge)]' },
  { icon: MEAL_ICON.diner,          color: 'text-[var(--kkb-creme)]' },
]

function MealStrip({ small = false }: { small?: boolean }) {
  return (
    <div className="flex gap-2" aria-hidden="true">
      {MEAL_STRIP.map(({ icon: Icon, color }, i) => (
        <span key={i} className={`${small ? 'h-8 w-8' : 'h-10 w-10'} rounded-full bg-white/10 flex items-center justify-center`}>
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
      <span className="mt-2.5 block h-1 w-14 rounded-full bg-[var(--kkb-orange)]" aria-hidden="true" />
    </p>
  )
}

// Desktop : panneau de marque à gauche, formulaire à droite. Mobile : bandeau
// de marque au-dessus du formulaire (étape e-mail seulement).
function LoginShell({ showMobileHero, children }: { showMobileHero: boolean; children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hidden lg:flex flex-col justify-between bg-[var(--kkb-foret)] p-12 xl:p-16">
        <Logo variant="reversed" layout="horizontal" size={40} />
        <div className="space-y-10">
          <Signature className="text-[44px] leading-[1.05]" />
          <ul className="space-y-4">
            {PROMISES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[17px] text-[var(--kkb-creme)]">
                <span className="h-10 w-10 shrink-0 rounded-full bg-white/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-[var(--kkb-sauge)]" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center justify-between">
          <MealStrip />
          <p className="flex items-center gap-1.5 text-sm text-[var(--kkb-foret-100)]">
            <Heart className="h-4 w-4 text-[var(--kkb-orange-300)]" /> Cuisiné avec amour pour toute la famille
          </p>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        {showMobileHero && (
          <header className="lg:hidden bg-[var(--kkb-foret)] rounded-b-[var(--kkb-r-xl)] px-5 pb-6 pt-[calc(env(safe-area-inset-top)+20px)]">
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
    pasted.split('').forEach((d, i) => { next[i] = d })
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
              className="-ml-2 h-11 w-11 flex items-center justify-center rounded-full text-[var(--kkb-foret)] hover:bg-[var(--kkb-foret-50)]"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--kkb-foret)]">
              <Shield className="h-4 w-4" /> Étape sécurisée
            </span>
            <button
              type="button"
              onClick={supportSoon}
              aria-label="Support"
              className="-mr-2 h-11 w-11 flex items-center justify-center rounded-full text-[var(--kkb-text-tertiary)] hover:bg-[var(--kkb-foret-50)]"
            >
              <Headphones className="h-5 w-5" />
            </button>
          </div>

          {/* Illustration */}
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-[var(--kkb-sauge-50)] flex items-center justify-center">
              <MailCheck className="h-9 w-9 text-[var(--kkb-foret)]" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-h1 max-[380px]:text-[24px] max-[380px]:leading-[30px] text-[var(--kkb-foret)] flex items-center justify-center gap-2">
              Vérifie ta boîte mail <Sparkles className="h-6 w-6 shrink-0 text-[var(--kkb-jaune)]" />
            </h1>
            <p className="text-[15px] text-[var(--kkb-text-secondary)]">
              {authMode === 'code'
                ? 'On t’a envoyé un code à 6 chiffres sur'
                : 'On t’a envoyé un lien de connexion sur'}
            </p>
            <button
              type="button"
              onClick={resetToEmailStep}
              aria-label={`Modifier l'adresse ${email}`}
              className="inline-flex max-w-full items-center gap-2 px-4 h-11 rounded-[var(--kkb-radius-pill)] bg-white border border-[var(--kkb-border)] text-[var(--kkb-foret)] font-semibold text-sm"
            >
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">{email}</span>
              <Pencil className="h-3.5 w-3.5 shrink-0" />
            </button>
          </div>

          {authMode === 'code' ? (
            <form onSubmit={handleOtpSubmit} className="space-y-5">
              <div
                className={`flex justify-center gap-2 ${shake ? 'animate-shake' : ''}`}
                onAnimationEnd={() => setShake(false)}
              >
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    aria-label={`Chiffre ${i + 1} du code`}
                    value={d}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(i, e)}
                    onPaste={handleDigitPaste}
                    disabled={state === 'verifying'}
                    className={`w-11 h-14 sm:w-12 text-center font-dosis font-extrabold text-[22px] rounded-[var(--kkb-r-md)] border-[1.5px] outline-none transition-colors disabled:opacity-50 ${
                      d
                        ? 'border-[var(--kkb-foret-500)] bg-[var(--kkb-foret-50)] text-[var(--kkb-foret)]'
                        : 'border-[var(--kkb-border)] bg-white text-[var(--kkb-text-primary)] focus:border-[var(--kkb-foret-500)] focus:shadow-[0_0_0_3px_var(--kkb-foret-100)]'
                    }`}
                  />
                ))}
              </div>

              {error && <p role="alert" className="text-sm text-center text-[var(--kkb-danger)]">{error}</p>}

              <button
                type="submit"
                disabled={state === 'verifying' || !digitsFilled}
                className="w-full h-12 flex items-center justify-center gap-2 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral)] hover:bg-[var(--kkb-coral-hover)] text-btn-primary text-white transition-colors disabled:opacity-50"
              >
                {state === 'verifying' ? 'Vérification…' : 'Vérifier et continuer'}
                {state !== 'verifying' && <ArrowRight className="h-4 w-4" />}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-sm text-[var(--kkb-text-tertiary)]">
                <Timer className="h-3.5 w-3.5" />
                {countdown > 0 ? (
                  <span>
                    Nouveau code possible dans{' '}
                    <span className="font-bold text-[var(--kkb-foret)] tabular-nums">
                      {formatCountdown(countdown)}
                    </span>
                  </span>
                ) : (
                  <button type="button" onClick={handleResend} className="min-h-11 text-[var(--kkb-foret)] font-bold underline hover:no-underline">
                    Renvoyer le code
                  </button>
                )}
              </div>

              <div className="flex items-start gap-2.5 bg-[var(--kkb-warning-light)] rounded-[var(--kkb-r-md)] p-3.5">
                <Lightbulb className="h-4 w-4 text-[var(--kkb-jaune-700)] shrink-0 mt-0.5" />
                <p className="text-[13px] text-[var(--kkb-text-secondary)]">
                  Pense à regarder dans tes courriers indésirables ou dans l’onglet « Promotions » si la
                  tambouille tarde à arriver.
                </p>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-[var(--kkb-r-lg)] p-5 space-y-2 text-center">
                <ExternalLink className="h-6 w-6 text-[var(--kkb-foret)] mx-auto" />
                <p className="text-[15px] text-[var(--kkb-text-secondary)]">
                  Clique sur le lien reçu par courriel pour te connecter.
                </p>
                <p className="text-xs text-[var(--kkb-text-tertiary)]">Le lien est valable 60 minutes.</p>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-sm text-[var(--kkb-text-tertiary)]">
                <Timer className="h-3.5 w-3.5" />
                {countdown > 0 ? (
                  <span>Renvoyer dans <span className="tabular-nums">{countdown}</span>s</span>
                ) : (
                  <button type="button" onClick={handleResend} className="min-h-11 text-[var(--kkb-foret)] font-bold underline hover:no-underline">
                    Renvoyer l&apos;email
                  </button>
                )}
              </div>
            </div>
          )}

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
              <button type="button" onClick={supportSoon} className="min-h-11 font-semibold text-[var(--kkb-foret)] underline">
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
            <label htmlFor="email" className="block text-sm font-semibold text-[var(--kkb-text-primary)]">
              Ton adresse e-mail
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--kkb-text-tertiary)]" />
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
                className="w-full h-12 pl-12 pr-4 rounded-full bg-white border-[1.5px] border-[var(--kkb-border)] text-[var(--kkb-profond)] text-base outline-none transition-shadow placeholder:text-[var(--kkb-text-tertiary)]/70 focus:border-[var(--kkb-foret-500)] focus:shadow-[0_0_0_3px_var(--kkb-foret-100)] disabled:opacity-50"
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
            className="w-full h-12 flex items-center justify-center gap-2 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral)] hover:bg-[var(--kkb-coral-hover)] text-btn-primary text-white transition-colors disabled:opacity-50"
          >
            {state === 'sending' ? 'Envoi en cours…' : 'Continuer'}
            {state !== 'sending' && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        {/* Séparateur */}
        <div className="flex items-center gap-3" aria-hidden="true">
          <div className="flex-1 h-px bg-[var(--kkb-border)]" />
          <span className="text-xs font-semibold text-[var(--kkb-text-tertiary)]">ou</span>
          <div className="flex-1 h-px bg-[var(--kkb-border)]" />
        </div>

        <button
          type="button"
          onClick={() => toast.info('La connexion avec Google arrive bientôt.')}
          className="w-full h-12 flex items-center justify-center gap-3 rounded-[var(--kkb-radius-pill)] border-[1.5px] border-[var(--kkb-border)] bg-white text-btn-secondary text-[var(--kkb-text-primary)] transition-colors hover:border-[var(--kkb-foret-300)]"
        >
          <GoogleIcon size={20} /> Continuer avec Google
        </button>

        <div className="flex items-start gap-3 rounded-[var(--kkb-r-md)] bg-[var(--kkb-sauge-50)] p-4">
          <ShieldCheck className="h-5 w-5 shrink-0 text-[var(--kkb-foret-500)]" />
          <p className="text-sm text-[var(--kkb-text-secondary)]">
            <span className="font-semibold text-[var(--kkb-foret)]">Nouveau ici ?</span> Ton compte se crée
            tout seul à ta première connexion.
          </p>
        </div>

        <p className="text-center text-xs leading-relaxed text-[var(--kkb-text-tertiary)]">
          En continuant, tu acceptes nos{' '}
          <span className="underline text-[var(--kkb-foret)]">Conditions d’utilisation</span>, notre{' '}
          <span className="underline text-[var(--kkb-foret)]">Politique de confidentialité</span> et nos{' '}
          <span className="underline text-[var(--kkb-foret)]">Mentions légales</span>.
        </p>
      </div>
    </LoginShell>
  )
}
