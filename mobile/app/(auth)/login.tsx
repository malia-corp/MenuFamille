import { useEffect, useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ArrowLeft, ArrowRight, Heart, Mail, ShieldCheck, Sparkles, Users, Vote } from 'lucide-react-native'
import { Logo } from '@/components/brand/Logo'
import { Button, Card, Field, FieldLabel, Txt } from '@/components/ui'
import { request } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { C, F, R } from '@/theme'

const CODE_LENGTH = 6
const EMPTY = Array<string>(CODE_LENGTH).fill('')
const PROMISES = [
  { icon: Sparkles, text: 'Le menu de la semaine en un clic' },
  { icon: Vote,     text: 'Toute la famille donne son avis' },
  { icon: Users,    text: 'Un cercle pour décider ensemble' },
]

// Connexion par code à 6 chiffres reçu par e-mail (même parcours que /login
// sur le web ; le lien magique, qui ouvre le navigateur, n'est pas proposé).
export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [digits, setDigits] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(60)
  const inputs = useRef<(TextInput | null)[]>([])

  useEffect(() => {
    if (step !== 'code' || countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [step, countdown])

  async function sendCode() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError('Saisis une adresse e-mail valide'); return }
    setBusy(true); setError(null)
    try {
      const res = await request<{ error?: string }>('/api/auth/send-otp', { method: 'POST', json: { email: email.trim() } })
      if (!res.ok) { setError(res.data?.error ?? 'Envoi impossible'); return }
      setStep('code'); setDigits(EMPTY); setCountdown(60)
      setTimeout(() => inputs.current[0]?.focus(), 200)
    } catch {
      setError('Connexion impossible. Vérifie ton réseau.')
    } finally {
      setBusy(false)
    }
  }

  async function verify(code: string) {
    setBusy(true); setError(null)
    try {
      const res = await request<{ error?: string; redirect?: string; session?: { access_token: string; refresh_token: string } }>(
        '/api/auth/verify-otp', { method: 'POST', json: { email: email.trim(), token: code, authMode: 'code', client: 'mobile' } },
      )
      if (!res.ok || !res.data?.session) {
        setError(res.data?.error ?? 'Code invalide')
        setDigits(EMPTY)
        inputs.current[0]?.focus()
        return
      }
      await supabase.auth.setSession(res.data.session)
      router.replace(res.data.redirect === '/onboarding' ? '/onboarding' : '/')
    } catch {
      setError('Connexion impossible. Vérifie ton réseau.')
    } finally {
      setBusy(false)
    }
  }

  function setDigit(i: number, v: string) {
    const clean = v.replace(/\D/g, '')
    // Code collé en entier
    if (clean.length > 1) {
      const next = clean.slice(0, CODE_LENGTH).split('')
      const filled = [...next, ...EMPTY].slice(0, CODE_LENGTH)
      setDigits(filled)
      if (next.length === CODE_LENGTH) void verify(next.join(''))
      else inputs.current[next.length]?.focus()
      return
    }
    const next = [...digits]
    next[i] = clean
    setDigits(next)
    if (clean && i < CODE_LENGTH - 1) inputs.current[i + 1]?.focus()
    if (next.every(d => d)) void verify(next.join(''))
  }

  async function resend() {
    await request('/api/auth/send-otp', { method: 'POST', json: { email: email.trim() } }).catch(() => null)
    setCountdown(60)
    toast.success('Nouveau code envoyé')
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.creme }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {/* Bandeau vert : logo et promesses */}
        <View style={{ backgroundColor: C.foret, paddingTop: insets.top + 24, paddingHorizontal: 24, paddingBottom: 32, borderBottomLeftRadius: R.xl, borderBottomRightRadius: R.xl }}>
          <Logo size={48} reversed />
          <Txt variant="signature" color={C.creme} style={{ marginTop: 20, fontSize: 24, lineHeight: 30 }}>On mange quoi ?{'\n'}On décide ensemble.</Txt>
          <View style={{ marginTop: 20, gap: 10 }}>
            {PROMISES.map(p => (
              <View key={p.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 34, height: 34, borderRadius: R.pill, backgroundColor: C.white10, alignItems: 'center', justifyContent: 'center' }}>
                  <p.icon size={17} color={C.sauge} />
                </View>
                <Txt color={C.creme} style={{ fontFamily: F.bodySemi }}>{p.text}</Txt>
              </View>
            ))}
          </View>
        </View>

        <View style={{ padding: 20, gap: 16 }}>
          {step === 'email' ? (
            <Card style={{ gap: 14 }}>
              <View>
                <Txt variant="h2">Connexion</Txt>
                <Txt variant="small" style={{ marginTop: 4 }}>On t’envoie un code à 6 chiffres par e-mail. Pas de mot de passe à retenir.</Txt>
              </View>
              <View>
                <FieldLabel>Adresse e-mail</FieldLabel>
                <Field
                  value={email}
                  onChangeText={v => { setEmail(v); setError(null) }}
                  placeholder="prenom@exemple.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  onSubmitEditing={() => void sendCode()}
                  invalid={!!error}
                  accessibilityLabel="Adresse e-mail"
                />
              </View>
              {!!error && <Txt variant="small" color={C.danger}>{error}</Txt>}
              <Button label="Recevoir mon code" icon={Mail} tone="orange" size="lg" onPress={() => void sendCode()} loading={busy} full />
            </Card>
          ) : (
            <Card style={{ gap: 14 }}>
              <Pressable accessibilityRole="button" accessibilityLabel="Changer d'adresse" onPress={() => { setStep('email'); setError(null) }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ArrowLeft size={16} color={C.foret} />
                <Txt variant="smallBold" color={C.foret}>Changer d’adresse</Txt>
              </Pressable>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 40, height: 40, borderRadius: R.pill, backgroundColor: C.sauge50, alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={20} color={C.foret500} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt variant="h3">Étape sécurisée</Txt>
                  <Txt variant="small">Code envoyé à <Txt variant="smallBold">{email.trim()}</Txt></Txt>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
                {digits.map((d, i) => (
                  <TextInput
                    key={i}
                    ref={el => { inputs.current[i] = el }}
                    value={d}
                    onChangeText={v => setDigit(i, v)}
                    onKeyPress={e => { if (e.nativeEvent.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus() }}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    maxLength={i === 0 ? CODE_LENGTH : 1}
                    accessibilityLabel={`Chiffre ${i + 1} sur ${CODE_LENGTH}`}
                    editable={!busy}
                    style={{
                      flex: 1, height: 56, borderRadius: R.md, borderWidth: 1.5, borderColor: error ? C.danger : d ? C.foret500 : C.filet,
                      backgroundColor: '#FFFFFF', textAlign: 'center', fontFamily: F.title, fontSize: 22, color: C.foret,
                    }}
                  />
                ))}
              </View>
              {!!error && <Txt variant="small" color={C.danger}>{error}</Txt>}
              <Button label={busy ? 'Vérification…' : 'Me connecter'} iconRight={ArrowRight} tone="orange" size="lg" onPress={() => void verify(digits.join(''))}
                disabled={!digits.every(Boolean)} loading={busy} full />
              {countdown > 0 ? (
                <Txt variant="small" style={{ textAlign: 'center' }}>Nouveau code possible dans 00:{String(countdown).padStart(2, '0')}</Txt>
              ) : (
                <Button label="Renvoyer un code" tone="link" onPress={() => void resend()} />
              )}
            </Card>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Heart size={14} color={C.orange300} />
            <Txt variant="meta">Cuisiné avec amour pour toute la famille</Txt>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
