import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ArrowRight, ChevronRight, Crown, KeyRound, User, Users } from 'lucide-react-native'
import { Button, Card, CardTitle, Field, FieldLabel, Txt } from '@/components/ui'
import { request } from '@/lib/api'
import { useSession } from '@/lib/session'
import { C, R } from '@/theme'

// Premier lancement : le prénom, puis créer ou rejoindre un cercle.
export default function OnboardingScreen() {
  const insets = useSafeAreaInsets()
  const refreshViewer = useSession(s => s.refreshViewer)
  const [step, setStep] = useState<'profile' | 'circle'>('profile')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [joinOpen, setJoinOpen] = useState(false)
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  async function saveProfile() {
    if (!name.trim()) return
    setSaving(true); setError(null)
    try {
      const res = await request<{ error?: string }>('/api/users/me', { method: 'PUT', json: { display_name: name.trim() } })
      if (res.ok) { setStep('circle'); void refreshViewer() }
      else setError(res.data?.error ?? 'Une erreur est survenue')
    } catch {
      setError('Connexion impossible')
    } finally {
      setSaving(false)
    }
  }

  async function join() {
    setJoining(true); setJoinError(null)
    try {
      const res = await request<{ error?: string }>('/api/circles/join', { method: 'POST', json: { invite_code: code.trim().toUpperCase() } })
      if (res.ok) { await refreshViewer(); router.replace('/') }
      else setJoinError(res.data?.error ?? 'Code invalide')
    } catch {
      setJoinError('Connexion impossible')
    } finally {
      setJoining(false)
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.creme }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 24, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View style={{ backgroundColor: C.foret, borderRadius: R.xl, padding: 20 }}>
          <Txt variant="label" color={C.foret100}>{step === 'profile' ? 'Étape 1 sur 2' : 'Étape 2 sur 2'}</Txt>
          <Txt variant="h1" color={C.creme} style={{ marginTop: 4 }}>{step === 'profile' ? 'Crée ton profil' : `Bienvenue, ${name.trim()} !`}</Txt>
          <Txt variant="small" color={C.foret100} style={{ marginTop: 6 }}>
            {step === 'profile' ? 'Quelques infos pour personnaliser tes menus.' : 'Veux-tu créer ton cercle familial ou rejoindre celui de ta famille ?'}
          </Txt>
        </View>

        {step === 'profile' ? (
          <Card style={{ gap: 14 }}>
            <CardTitle icon={User} title="Ton prénom" />
            <View>
              <FieldLabel>Prénom ou surnom</FieldLabel>
              <Field value={name} onChangeText={setName} placeholder="ex. Malia" autoFocus returnKeyType="next" onSubmitEditing={() => void saveProfile()} accessibilityLabel="Ton prénom ou surnom" />
            </View>
            {!!error && <Txt variant="small" color={C.danger}>{error}</Txt>}
            <Button label="Continuer" iconRight={ChevronRight} tone="orange" size="lg" onPress={() => void saveProfile()} loading={saving} disabled={!name.trim()} full />
          </Card>
        ) : (
          <>
            <Card style={{ gap: 12 }}>
              <CardTitle icon={Crown} title="Je planifie les repas" tileBg={C.jaune50} tileFg={C.jauneText} />
              <Txt variant="small">Je crée le cercle et je partage les menus avec ma famille.</Txt>
              <Button label="Créer mon cercle familial" iconRight={ArrowRight} tone="orange" onPress={() => router.replace('/circle/create')} full />
            </Card>
            <Card style={{ gap: 12 }}>
              <CardTitle icon={Users} title="Je fais partie d’un foyer" />
              <Txt variant="small">J’ai reçu un code d’invitation.</Txt>
              {!joinOpen ? (
                <Button label="Rejoindre un cercle" iconRight={ArrowRight} tone="ghost" onPress={() => setJoinOpen(true)} full />
              ) : (
                <View style={{ gap: 10 }}>
                  <Field value={code} onChangeText={v => { setCode(v.toUpperCase()); setJoinError(null) }} placeholder="PRÉNOM-42" autoCapitalize="characters" autoFocus
                    style={{ textAlign: 'center', letterSpacing: 2 }} invalid={!!joinError} accessibilityLabel="Code d'invitation" />
                  {!!joinError && <Txt variant="small" color={C.danger}>{joinError}</Txt>}
                  <Button label="Rejoindre" icon={KeyRound} tone="foret" onPress={() => void join()} loading={joining} disabled={!code.trim()} full />
                </View>
              )}
            </Card>
            <Button label="Passer pour l’instant" tone="link" onPress={() => router.replace('/')} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
