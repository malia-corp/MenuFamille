'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ExternalLink, Globe, Mail, MailCheck, ShieldCheck, UtensilsCrossed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type State = 'idle' | 'sending' | 'otp' | 'verifying'
type AuthMode = 'code' | 'link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [authMode, setAuthMode] = useState<AuthMode>('code')
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState<string | null>(null)
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

  // Toast stub OAuth
  useEffect(() => {
    if (!stubToast) return
    const timer = setTimeout(() => setStubToast(false), 2000)
    return () => clearTimeout(timer)
  }, [stubToast])

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
      body: JSON.stringify({ email, token }),
    })

    const data = await res.json()

    if (res.ok) {
      router.push(data.redirect)
    } else {
      setError(data.error ?? 'Code invalide')
      setState('otp')
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

  // ── Écran OTP / Lien ───────────────────────────────────────────────────────
  if (state === 'otp' || state === 'verifying') {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <MailCheck className="h-12 w-12 text-terracotta" />
        </div>

        <div className="space-y-1">
          <h1 className="font-dosis font-bold text-2xl text-[#2C1810]">
            Vérifiez votre boîte mail
          </h1>
          <p className="text-sm text-[#5A4A43]">
            Email envoyé à{' '}
            <span className="font-semibold text-[#2C1810]">{email}</span>
          </p>
        </div>

        {/* Sélecteur de mode */}
        <div className="flex rounded-xl border border-[#E8C99A] overflow-hidden">
          <button
            type="button"
            onClick={() => { setAuthMode('code'); setError(null) }}
            className={`flex-1 py-2.5 text-sm font-quicksand font-medium transition-colors ${
              authMode === 'code'
                ? 'bg-terracotta text-white'
                : 'bg-white text-[#5A4A43] hover:bg-[#FDF6EE]'
            }`}
          >
            Saisir le code
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('link'); setError(null) }}
            className={`flex-1 py-2.5 text-sm font-quicksand font-medium transition-colors ${
              authMode === 'link'
                ? 'bg-terracotta text-white'
                : 'bg-white text-[#5A4A43] hover:bg-[#FDF6EE]'
            }`}
          >
            Utiliser le lien
          </button>
        </div>

        {authMode === 'code' ? (
          <form onSubmit={handleOtpSubmit} className="space-y-5">
            <div className="flex justify-center gap-2">
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
                  className="w-10 h-12 text-center text-xl font-semibold border-2 border-[#E8C99A] rounded-lg bg-white focus:border-terracotta focus:outline-none disabled:opacity-50"
                />
              ))}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button
              type="submit"
              className="w-full bg-terracotta hover:bg-[#C74E21] text-white font-quicksand"
              disabled={state === 'verifying'}
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              {state === 'verifying' ? 'Vérification…' : 'Valider le code'}
            </Button>

            <div className="text-sm text-[#8c7169]">
              {countdown > 0 ? (
                <span>Renvoyer dans {countdown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-terracotta underline hover:no-underline"
                >
                  Renvoyer le code
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="space-y-4 py-2">
            <div className="bg-[#FCEEE6] rounded-xl p-4 space-y-2">
              <ExternalLink className="h-6 w-6 text-terracotta mx-auto" />
              <p className="text-sm text-[#5A4A43] font-quicksand">
                Cliquez sur le lien dans votre email pour vous connecter automatiquement.
              </p>
              <p className="text-xs text-[#8c7169] font-quicksand">
                Le lien est valable 60 minutes.
              </p>
            </div>
            <div className="text-sm text-[#8c7169]">
              {countdown > 0 ? (
                <span>Renvoyer dans {countdown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-terracotta underline hover:no-underline"
                >
                  Renvoyer l&apos;email
                </button>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => { setState('idle'); setDigits(['', '', '', '', '', '']); setError(null); setAuthMode('code') }}
          className="text-xs text-[#8c7169] underline"
        >
          Utiliser une autre adresse
        </button>
      </div>
    )
  }

  // ── Écran Email ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-7">
      {/* Logo */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2 mb-2">
          <UtensilsCrossed className="h-8 w-8 text-terracotta" />
          <span className="font-dosis font-bold text-2xl text-terracotta">MenuFamille</span>
        </div>
        <h1 className="font-dosis font-bold text-2xl text-[#2C1810]">La table de famille</h1>
        <p className="text-sm text-[#5A4A43]">
          Rejoignez la table.<br />
          Commencez à planifier vos repas familiaux.
        </p>
      </div>

      {/* Formulaire email */}
      <form onSubmit={handleEmailSubmit} className="space-y-4">
        <div className="space-y-1">
          <label
            htmlFor="email"
            className="block text-xs font-semibold tracking-widest uppercase text-[#5A4A43] font-quicksand"
          >
            Adresse email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8c7169]" />
            <Input
              id="email"
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={state === 'sending'}
              className="pl-9 border-[#E8C99A] focus:border-terracotta bg-white"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button
          type="submit"
          className="w-full bg-terracotta hover:bg-[#C74E21] text-white font-quicksand"
          disabled={state === 'sending'}
        >
          {state === 'sending' ? 'Envoi en cours…' : (
            <>
              Continuer
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      {/* Séparateur */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[#E8C99A]" />
        <span className="text-xs text-[#8c7169] font-quicksand">OU CONTINUER VIA</span>
        <div className="flex-1 h-px bg-[#E8C99A]" />
      </div>

      {/* Boutons stub OAuth */}
      <div className="space-y-2">
        {stubToast && (
          <p className="text-center text-xs text-[#5A4A43] bg-[#FEF3E0] border border-[#E8C99A] rounded-lg px-3 py-2">
            Bientôt disponible
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          className="w-full border-[#E8C99A] text-[#5A4A43] hover:bg-[#FDF6EE] font-quicksand"
          onClick={() => setStubToast(true)}
        >
          <Globe className="mr-2 h-4 w-4" />
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full border-[#E8C99A] text-[#5A4A43] hover:bg-[#FDF6EE] font-quicksand"
          onClick={() => setStubToast(true)}
        >
          <Globe className="mr-2 h-4 w-4" />
          Facebook
        </Button>
      </div>

      {/* Lien bas */}
      <p className="text-center text-sm text-[#8c7169]">
        Déjà un compte ?{' '}
        <span className="font-semibold text-terracotta">Se connecter</span>
      </p>
    </div>
  )
}
