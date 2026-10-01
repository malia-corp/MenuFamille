'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Globe,
  Headphones,
  Lightbulb,
  Mail,
  MailCheck,
  Pencil,
  Share2,
  Shield,
  Timer,
} from 'lucide-react'

type State = 'idle' | 'sending' | 'otp' | 'verifying'
type AuthMode = 'code' | 'link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [authMode, setAuthMode] = useState<AuthMode>('code')
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const [stubToast, setStubToast] = useState(false)
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

  // Toast stub OAuth / support
  useEffect(() => {
    if (!stubToast) return
    const timer = setTimeout(() => setStubToast(false), 2000)
    return () => clearTimeout(timer)
  }, [stubToast])

  function resetToEmailStep() {
    setState('idle')
    setDigits(['', '', '', '', '', ''])
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
      setDigits(['', '', '', '', '', ''])
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

  async function handleResend() {
    setError(null)
    await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setDigits(['', '', '', '', '', ''])
    setCountdown(60)
    setTimeout(() => inputRefs.current[0]?.focus(), 50)
  }

  const digitsFilled = digits.every((d) => d !== '')

  // ── Écran OTP ──────────────────────────────────────────────────────────────
  if (state === 'otp' || state === 'verifying') {
    return (
      <div className="space-y-6">
        {/* Barre de navigation */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={resetToEmailStep}
            aria-label="Retour"
            className="p-1.5 text-[var(--kkb-teal)]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="flex items-center gap-1.5 text-[var(--kkb-teal)] text-sm font-quicksand font-semibold">
            <Shield className="h-4 w-4" /> Étape sécurisée
          </span>
          <button
            type="button"
            onClick={() => setStubToast(true)}
            aria-label="Support"
            className="p-1.5 text-[var(--kkb-text-tertiary)]"
          >
            <Headphones className="h-5 w-5" />
          </button>
        </div>

        {/* Illustration */}
        <div className="flex justify-center py-2">
          <div className="h-[120px] w-[120px] rounded-full bg-[var(--kkb-coral-light)] flex items-center justify-center">
            <MailCheck className="h-12 w-12 text-[var(--kkb-coral)]" />
          </div>
        </div>

        <div className="text-center space-y-1.5">
          <h1 className="text-h1 text-[var(--kkb-coral)]">Vérifiez votre boîte mail ✨</h1>
          <p className="text-kkb-body text-[var(--kkb-text-secondary)]">
            Nous venons de glisser un code à 6 chiffres dans la boîte de
          </p>
          <button
            type="button"
            onClick={resetToEmailStep}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral-light)] text-[var(--kkb-coral)] font-quicksand font-semibold text-sm"
          >
            <Mail className="h-4 w-4" /> {email}
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Toggle discret lien magique */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => setAuthMode((m) => (m === 'code' ? 'link' : 'code'))}
            className="text-xs font-quicksand text-[var(--kkb-text-tertiary)] underline hover:text-[var(--kkb-coral)]"
          >
            {authMode === 'code' ? 'Utiliser le lien magique plutôt' : 'Saisir le code plutôt'}
          </button>
        </div>

        {authMode === 'code' ? (
          <form onSubmit={handleOtpSubmit} className="space-y-5">
            <div
              className={`flex justify-center gap-2.5 ${shake ? 'animate-shake' : ''}`}
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
                  disabled={state === 'verifying'}
                  className={`w-12 h-14 text-center font-quicksand font-bold text-2xl rounded-[var(--kkb-radius-sm)] border-[1.5px] outline-none transition-colors disabled:opacity-50 ${
                    d
                      ? 'border-[var(--kkb-teal)] bg-[var(--kkb-teal-light)] text-[var(--kkb-teal)]'
                      : 'border-[var(--kkb-border)] bg-white text-[var(--kkb-text-primary)] focus:border-[var(--kkb-coral)] focus:shadow-[0_0_0_3px_var(--kkb-coral-light)]'
                  }`}
                />
              ))}
            </div>

            {error && <p className="text-sm text-center text-[var(--kkb-danger)]">{error}</p>}

            <div className="flex items-start gap-2 bg-[var(--kkb-warning-light)] rounded-[var(--kkb-radius-sm)] p-3">
              <Lightbulb className="h-4 w-4 text-[var(--kkb-warning)] shrink-0 mt-0.5" />
              <p className="text-xs font-quicksand text-[var(--kkb-text-secondary)]">
                Pensez à regarder dans vos courriers indésirables ou dans l&apos;onglet « Promotions » si la
                tambouille tarde à arriver.
              </p>
            </div>

            <button
              type="submit"
              disabled={state === 'verifying' || !digitsFilled}
              className="w-full flex items-center justify-center gap-2 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral)] hover:bg-[var(--kkb-coral-hover)] text-white font-quicksand font-bold text-[15px] py-4 transition-colors disabled:opacity-50"
            >
              {state === 'verifying' ? 'Vérification…' : 'Vérifier et continuer'}
              {state !== 'verifying' && <ArrowRight className="h-4 w-4" />}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-sm text-[var(--kkb-text-tertiary)] font-quicksand">
              <Timer className="h-3.5 w-3.5" />
              {countdown > 0 ? (
                <span>
                  Renvoyer un nouveau code dans{' '}
                  <span className="font-bold text-[var(--kkb-coral)]">
                    00:{String(countdown).padStart(2, '0')}
                  </span>
                </span>
              ) : (
                <button type="button" onClick={handleResend} className="text-[var(--kkb-coral)] underline hover:no-underline">
                  Renvoyer le code
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="space-y-4 py-2">
            <div className="bg-[var(--kkb-coral-light)] rounded-[var(--kkb-radius-sm)] p-4 space-y-2 text-center">
              <ExternalLink className="h-6 w-6 text-[var(--kkb-coral)] mx-auto" />
              <p className="text-sm text-[var(--kkb-text-secondary)] font-quicksand">
                Cliquez sur le lien dans votre email pour vous connecter automatiquement.
              </p>
              <p className="text-xs text-[var(--kkb-text-tertiary)] font-quicksand">Le lien est valable 60 minutes.</p>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-sm text-[var(--kkb-text-tertiary)] font-quicksand">
              <Timer className="h-3.5 w-3.5" />
              {countdown > 0 ? (
                <span>Renvoyer dans {countdown}s</span>
              ) : (
                <button type="button" onClick={handleResend} className="text-[var(--kkb-coral)] underline hover:no-underline">
                  Renvoyer l&apos;email
                </button>
              )}
            </div>
          </div>
        )}

        {stubToast && (
          <p className="text-center text-xs text-[var(--kkb-text-secondary)] bg-[var(--kkb-warning-light)] border border-[var(--kkb-border)] rounded-lg px-3 py-2">
            Bientôt disponible
          </p>
        )}

        <div className="text-center space-y-1.5 pt-2">
          <p className="flex items-center justify-center gap-1.5 text-xs text-[var(--kkb-text-tertiary)] font-quicksand">
            ♥ Cuisiné avec amour pour toute la famille
          </p>
          <p className="text-[13px] text-[var(--kkb-text-secondary)] font-quicksand">
            Besoin d&apos;aide ?{' '}
            <button type="button" onClick={() => setStubToast(true)} className="text-[var(--kkb-coral)] underline">
              Contacter le support familial
            </button>
          </p>
        </div>
      </div>
    )
  }

  // ── Écran Email ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-7">
      {/* Logo */}
      <div className="flex items-center justify-center gap-2 pt-2">
        <Image src="/logo-icon.svg" alt="" width={28} height={28} className="h-7 w-7" />
        <span className="text-h2 text-[var(--kkb-coral)] text-[22px]">KeskonBouf</span>
      </div>

      {/* Textes */}
      <div className="text-center space-y-1">
        <h1 className="text-h1 text-[var(--kkb-text-primary)]">Bienvenue dans la famille !</h1>
        <p className="text-kkb-body text-[var(--kkb-text-secondary)]">Planifiez vos repas ensemble.</p>
      </div>

      {/* Formulaire email */}
      <form onSubmit={handleEmailSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-kkb-label text-[var(--kkb-text-tertiary)]">
            Adresse e-mail
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--kkb-text-tertiary)]" />
            <input
              id="email"
              type="email"
              placeholder="ex: rosine.famille@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={state === 'sending'}
              className="w-full pl-11 pr-4 py-3.5 rounded-[var(--kkb-radius-sm)] border-[1.5px] border-[var(--kkb-border)] bg-white text-[var(--kkb-text-primary)] font-quicksand text-sm outline-none focus:border-[var(--kkb-coral)] disabled:opacity-50"
            />
          </div>
        </div>

        {error && <p className="text-sm text-[var(--kkb-danger)]">{error}</p>}

        <button
          type="submit"
          disabled={state === 'sending'}
          className="w-full flex items-center justify-center gap-2 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral)] hover:bg-[var(--kkb-coral-hover)] text-white font-quicksand font-bold text-[15px] py-4 transition-colors disabled:opacity-50"
        >
          {state === 'sending' ? 'Envoi en cours…' : 'Continuer'}
          {state !== 'sending' && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>

      {/* Séparateur */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[var(--kkb-border)]" />
        <span className="text-[11px] font-quicksand font-semibold uppercase text-[var(--kkb-text-tertiary)]">
          Ou connectez-vous avec
        </span>
        <div className="flex-1 h-px bg-[var(--kkb-border)]" />
      </div>

      {/* Boutons sociaux */}
      <div className="space-y-2">
        {stubToast && (
          <p className="text-center text-xs text-[var(--kkb-text-secondary)] bg-[var(--kkb-warning-light)] border border-[var(--kkb-border)] rounded-lg px-3 py-2">
            Bientôt disponible
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStubToast(true)}
            className="flex-1 flex items-center justify-center gap-2 border-[1.5px] border-[var(--kkb-border)] bg-white text-[var(--kkb-text-secondary)] font-quicksand font-semibold text-sm rounded-[var(--kkb-radius-pill)] py-3.5"
          >
            <Globe className="h-4 w-4" /> Google
          </button>
          <button
            type="button"
            onClick={() => setStubToast(true)}
            className="flex-1 flex items-center justify-center gap-2 border-[1.5px] border-[var(--kkb-border)] bg-white text-[var(--kkb-text-secondary)] font-quicksand font-semibold text-sm rounded-[var(--kkb-radius-pill)] py-3.5"
          >
            <Share2 className="h-4 w-4" /> Facebook
          </button>
        </div>
      </div>

      {/* Légal */}
      <p className="text-center text-[11px] text-[var(--kkb-text-tertiary)] font-quicksand leading-relaxed">
        En continuant, vous acceptez nos{' '}
        <span className="underline text-[var(--kkb-coral)]">Conditions d&apos;utilisation</span>, notre{' '}
        <span className="underline text-[var(--kkb-coral)]">Politique de confidentialité</span> et nos{' '}
        <span className="underline text-[var(--kkb-coral)]">Mentions légales</span>.
      </p>

      {/* Pied */}
      <p className="text-center text-sm text-[var(--kkb-text-secondary)] font-quicksand">
        Nouveau ici ?{' '}
        <span className="font-bold underline text-[var(--kkb-coral)]">Créer un compte</span>
      </p>
    </div>
  )
}
