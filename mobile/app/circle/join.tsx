import { useEffect, useRef, useState } from 'react'
import { Animated, Pressable, TextInput, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
import { ArrowRight, ClipboardPaste, KeyRound, MessageCircleHeart, PartyPopper, Users } from 'lucide-react-native'
import { Button, Txt } from '@/components/ui'
import { EntryShell, EntrySteps, type EntryStep } from '@/components/circle/EntryShell'
import { request } from '@/lib/api'
import { useSession } from '@/lib/session'
import { C, F, R } from '@/theme'

const STEPS: EntryStep[] = [
  { icon: KeyRound, title: 'Récupère le code', text: 'La planificatrice te l’envoie, ou le montre en QR code.' },
  { icon: Users, title: 'Rejoins la tablée', text: 'Saisis-le ici : tu entres dans le cercle.' },
  { icon: MessageCircleHeart, title: 'Donne ton avis', text: 'Sur le menu de la semaine, en un geste.' },
]

// Code du foyer : prénom en majuscules, tiret, deux chiffres (PRÉNOM-42).
const clean = (v: string) => v.toUpperCase().replace(/\s+/g, '')

// Rejoindre un cercle (cf. app/(app)/circle/join/page.tsx). ?code= pré-remplit le champ
// (lien d'accès keskonbouf://circle/join?code=…).
export default function JoinCircleScreen() {
  const params = useLocalSearchParams<{ code?: string }>()
  const refreshViewer = useSession(s => s.refreshViewer)
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [circleName, setCircleName] = useState<string | null>(null)
  const [error, setError] = useState<{ message: string; alreadyMember: boolean } | null>(null)
  const shake = useRef(new Animated.Value(0)).current

  useEffect(() => { if (params.code) setCode(clean(params.code)) }, [params.code])

  async function paste() {
    const text = await Clipboard.getStringAsync().catch(() => '')
    if (text.trim()) { setCode(clean(text.trim())); setError(null) }
  }

  async function submit() {
    setJoining(true); setError(null)
    try {
      const res = await request<{ circle?: { name: string }; error?: string }>('/api/circles/join', { method: 'POST', json: { invite_code: code } })
      if (res.ok && res.data?.circle) { setCircleName(res.data.circle.name); void refreshViewer(); setJoining(false); return }
      setError({ message: res.data?.error ?? 'Une erreur est survenue', alreadyMember: res.status === 409 })
    } catch {
      setError({ message: 'Connexion impossible. Réessaie dans un instant.', alreadyMember: false })
    }
    setJoining(false)
    Animated.sequence([-8, 8, -6, 6, 0].map(v => Animated.timing(shake, { toValue: v, duration: 70, useNativeDriver: true }))).start()
  }

  if (circleName) {
    return (
      <EntryShell aside={(
        <>
          <View style={{ width: 56, height: 56, borderRadius: R.pill, backgroundColor: C.white10, alignItems: 'center', justifyContent: 'center' }}>
            <PartyPopper size={28} color={C.jaune} />
          </View>
          <Txt style={{ marginTop: 20, fontFamily: F.bodySemi, fontSize: 14, color: C.foret100 }}>Bienvenue à table</Txt>
          <Txt variant="h1" color={C.creme} style={{ marginTop: 2 }}>{circleName}</Txt>
          <Txt variant="signature" color={C.sauge} style={{ marginTop: 12 }}>Ta place est mise.</Txt>
          <EntrySteps steps={STEPS} current={2} />
        </>
      )}>
        <View style={{ width: 48, height: 48, borderRadius: R.pill, backgroundColor: C.sauge50, alignItems: 'center', justifyContent: 'center' }}>
          <Users size={24} color={C.foret500} />
        </View>
        <Txt variant="h2" style={{ marginTop: 16 }}>Tu fais partie du cercle</Txt>
        <Txt variant="small" style={{ marginTop: 4, fontSize: 14 }}>
          Dès que le menu de la semaine est prêt, tu pourras donner ton avis sur chaque repas. Pense aussi à indiquer tes allergies et tes envies : elles guident la génération du menu.
        </Txt>
        <View style={{ marginTop: 32, gap: 8 }}>
          <Button label="C’est parti" iconRight={ArrowRight} tone="orange" size="lg" full onPress={() => router.replace('/')} />
          <Button label="Voir le cercle et mes préférences" tone="link" full onPress={() => router.replace('/circle')} />
        </View>
      </EntryShell>
    )
  }

  return (
    <EntryShell onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} aside={(
      <>
        <Txt style={{ fontFamily: F.bodySemi, fontSize: 14, color: C.foret100 }}>Cercle familial</Txt>
        <Txt variant="h1" color={C.creme} style={{ marginTop: 2 }}>Rejoins ta tablée</Txt>
        <Txt variant="small" color={C.foret100} style={{ marginTop: 8, fontSize: 14 }}>
          Ta famille planifie ses repas sur KeskonBouf. Avec son code, tu donnes ton avis sur le menu de la semaine.
        </Txt>
        <EntrySteps steps={STEPS} current={1} />
      </>
    )}>
      <View style={{ gap: 24 }}>
        <View>
          <Txt variant="h2">Ton code d’invitation</Txt>
          <Txt variant="small" style={{ marginTop: 4, fontSize: 14 }}>
            Il ressemble à <Txt variant="smallBold" style={{ fontSize: 14 }}>PRÉNOM-42</Txt>. Tu le trouves dans le message reçu, ou dans le cercle de la personne qui t’invite.
          </Txt>
        </View>

        <Animated.View style={{ transform: [{ translateX: shake }], borderRadius: R.lg, borderWidth: 1.5, borderStyle: 'dashed', padding: 16,
          borderColor: error ? C.danger : C.foret300, backgroundColor: error ? C.dangerLight : C.foret50 }}>
          <Txt style={{ textAlign: 'center', fontFamily: F.bodySemi, fontSize: 12, color: C.texte2 }}>Code du foyer</Txt>
          <TextInput value={code} onChangeText={v => { setCode(clean(v)); setError(null) }} placeholder="PRÉNOM-42" placeholderTextColor={C.foret300}
            autoFocus={!params.code} autoCapitalize="characters" autoCorrect={false} editable={!joining} accessibilityLabel="Code du foyer"
            returnKeyType="go" onSubmitEditing={() => { if (code) void submit() }}
            style={{ marginTop: 4, textAlign: 'center', fontFamily: F.title, fontSize: 28, letterSpacing: 3, color: C.foret, paddingVertical: 4 }} />
          <View style={{ marginTop: 8, alignItems: 'center' }}>
            <Pressable onPress={() => void paste()} disabled={joining} accessibilityRole="button"
              style={{ height: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: R.pill, backgroundColor: '#FFFFFF' }}>
              <ClipboardPaste size={14} color={C.foret} />
              <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.foret }}>Coller le code</Txt>
            </Pressable>
          </View>
        </Animated.View>

        {error && (
          <Txt accessibilityRole="alert" variant="small" color={C.danger} style={{ fontSize: 14 }}>
            {error.message}
            {error.alreadyMember && <Txt variant="smallBold" color={C.foret} style={{ fontSize: 14, textDecorationLine: 'underline' }} onPress={() => router.replace('/circle')}> Voir mon cercle</Txt>}
          </Txt>
        )}

        <View style={{ gap: 12 }}>
          <Button label={joining ? 'Vérification…' : 'Rejoindre le cercle'} icon={Users} tone="orange" size="lg" full loading={joining} disabled={!code} onPress={() => void submit()} />
          <Txt variant="small" style={{ textAlign: 'center', fontSize: 14 }}>
            Pas de code ? <Txt variant="smallBold" color={C.foret} style={{ fontSize: 14 }} onPress={() => router.replace('/circle/create')}>Crée ton propre cercle</Txt>
          </Txt>
        </View>
      </View>
    </EntryShell>
  )
}
