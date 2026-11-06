import { useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import QRCode from 'react-native-qrcode-svg'
import { ArrowRight, MessageCircleHeart, Minus, PartyPopper, Plus, Share2, Tag, UserRound, Users } from 'lucide-react-native'
import { Button, Field, FieldLabel, ShareActions, Txt } from '@/components/ui'
import { EntryShell, EntrySteps, type EntryStep } from '@/components/circle/EntryShell'
import { request } from '@/lib/api'
import { useSession } from '@/lib/session'
import { circleInvitePayload, circleJoinUrl } from '@/shared/share'
import { C, F, R } from '@/theme'

const MIN_SIZE = 1
const MAX_SIZE = 20
const STEPS: EntryStep[] = [
  { icon: Tag, title: 'Nomme ton cercle', text: 'Le nom que verra toute ta famille.' },
  { icon: Share2, title: 'Partage le code', text: 'Par message, ou en QR code à table.' },
  { icon: MessageCircleHeart, title: 'Chacun donne son avis', text: 'Sur le menu de la semaine, en un geste.' },
]

// Création d'un cercle familial (cf. app/(app)/circle/create/page.tsx).
export default function CreateCircleScreen() {
  const refreshViewer = useSession(s => s.refreshViewer)
  const [name, setName] = useState('')
  const [size, setSizeState] = useState(1)
  const [saving, setSaving] = useState(false)
  const [circle, setCircle] = useState<{ id: string; name: string; invite_code: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const setSize = (n: number) => setSizeState(Math.min(MAX_SIZE, Math.max(MIN_SIZE, n)))

  async function submit() {
    setSaving(true); setError(null)
    try {
      const [res] = await Promise.all([
        request<{ circle?: { id: string; name: string; invite_code: string }; error?: string }>('/api/circles', { method: 'POST', json: { name: name.trim() } }),
        // Non bloquant : la taille du foyer est une info de profil annexe.
        request('/api/users/me', { method: 'PUT', json: { family_size: size } }).catch(() => null),
      ])
      if (res.ok && res.data?.circle) { setCircle(res.data.circle); void refreshViewer() }
      else setError(res.data?.error ?? 'Une erreur est survenue')
    } catch {
      setError('Connexion impossible. Réessaie dans un instant.')
    } finally {
      setSaving(false)
    }
  }

  if (circle) {
    return (
      <EntryShell aside={(
        <>
          <View style={{ width: 56, height: 56, borderRadius: R.pill, backgroundColor: C.white10, alignItems: 'center', justifyContent: 'center' }}>
            <PartyPopper size={28} color={C.jaune} />
          </View>
          <Txt style={{ marginTop: 20, fontFamily: F.bodySemi, fontSize: 14, color: C.foret100 }}>Cercle créé, bravo !</Txt>
          <Txt variant="h1" color={C.creme} style={{ marginTop: 2 }}>{circle.name}</Txt>
          <Txt variant="signature" color={C.sauge} style={{ marginTop: 12 }}>Il ne manque plus que ta famille.</Txt>
          <EntrySteps steps={STEPS} current={1} />
        </>
      )}>
        <Txt variant="h2">Invite ta tablée</Txt>
        <Txt variant="small" style={{ marginTop: 4, fontSize: 14 }}>Envoie le code ou fais scanner le QR code : chacun rejoint le cercle en quelques secondes.</Txt>
        <View style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: R.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.foret300, backgroundColor: C.foret50, padding: 16 }}>
          <View style={{ borderRadius: R.sm, backgroundColor: '#FFFFFF', padding: 6 }}>
            <QRCode value={circleJoinUrl(circle.invite_code)} size={92} color={C.foret} backgroundColor="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Txt style={{ fontFamily: F.bodySemi, fontSize: 12, color: C.texte2 }}>Code du foyer</Txt>
            <Txt selectable adjustsFontSizeToFit numberOfLines={2} style={{ fontFamily: F.title, fontSize: 26, letterSpacing: 3, color: C.foret }}>{circle.invite_code}</Txt>
          </View>
        </View>
        <ShareActions getPayload={() => circleInvitePayload(circle.name, circle.invite_code)} copyLabel="Copier le code" style={{ marginTop: 12 }} />
        <View style={{ marginTop: 32, gap: 8 }}>
          <Button label="Commencer à planifier" iconRight={ArrowRight} tone="orange" size="lg" full onPress={() => router.replace('/')} />
          <Button label="Voir mon cercle" tone="link" full onPress={() => router.replace('/circle')} />
        </View>
      </EntryShell>
    )
  }

  const shown = name.trim()
  return (
    <EntryShell onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} aside={(
      <>
        <Txt style={{ fontFamily: F.bodySemi, fontSize: 14, color: C.foret100 }}>Cercle familial</Txt>
        <Txt variant="h1" color={C.creme} style={{ marginTop: 2 }}>Réunis ta tablée</Txt>
        <Txt variant="small" color={C.foret100} style={{ marginTop: 8, fontSize: 14 }}>Tu planifies, ta famille donne son avis : le menu de la semaine se décide à plusieurs.</Txt>
        <EntrySteps steps={STEPS} current={0} />
      </>
    )}>
      <View style={{ gap: 24 }}>
        {/* Aperçu du ticket du cercle, mis à jour en direct */}
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: R.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.foret300, backgroundColor: C.foret50, padding: 16 }}>
          <View style={{ width: 48, height: 48, borderRadius: R.pill, backgroundColor: C.foret, alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} color={C.creme} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="h3" numberOfLines={1} color={shown ? C.profond : C.foret300}>{shown || 'Ton cercle'}</Txt>
            <Txt variant="meta">{size} personne{size > 1 ? 's' : ''} à table · code créé à l’étape suivante</Txt>
          </View>
        </View>

        <View>
          <FieldLabel>Nom du cercle</FieldLabel>
          <Field value={name} onChangeText={setName} placeholder="ex. Famille Tiando" editable={!saving} invalid={!!error} accessibilityLabel="Nom du cercle"
            returnKeyType="done" onSubmitEditing={() => { if (shown) void submit() }} />
        </View>

        <View style={{ gap: 8 }}>
          <FieldLabel>Personnes dans le foyer</FieldLabel>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: R.pill, borderWidth: 1.5, borderColor: C.filet, backgroundColor: '#FFFFFF', padding: 4 }}>
              <Pressable onPress={() => setSize(size - 1)} disabled={saving || size <= MIN_SIZE} accessibilityLabel="Une personne de moins"
                style={{ width: 40, height: 40, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center', opacity: size <= MIN_SIZE ? 0.4 : 1 }}>
                <Minus size={16} color={C.foret} />
              </Pressable>
              <TextInput value={String(size)} onChangeText={v => setSize(Number(v.replace(/\D/g, '')) || MIN_SIZE)} keyboardType="number-pad" editable={!saving}
                accessibilityLabel="Personnes dans le foyer" style={{ width: 40, textAlign: 'center', fontFamily: F.title, fontSize: 20, color: C.profond, padding: 0 }} />
              <Pressable onPress={() => setSize(size + 1)} disabled={saving || size >= MAX_SIZE} accessibilityLabel="Une personne de plus"
                style={{ width: 40, height: 40, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center', opacity: size >= MAX_SIZE ? 0.4 : 1 }}>
                <Plus size={16} color={C.foret} />
              </Pressable>
            </View>
            <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 }} accessibilityElementsHidden>
              {Array.from({ length: Math.min(size, 8) }, (_, i) => (
                <View key={i} style={{ width: 28, height: 28, borderRadius: R.pill, backgroundColor: C.foret50, alignItems: 'center', justifyContent: 'center' }}>
                  <UserRound size={16} color={C.foret500} />
                </View>
              ))}
              {size > 8 && <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.foret }}>+{size - 8}</Txt>}
            </View>
          </View>
          <Txt variant="meta">Toi compris.</Txt>
        </View>

        {!!error && (
          <View accessibilityRole="alert" style={{ borderRadius: R.md, backgroundColor: C.dangerLight, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Txt variant="small" color={C.danger} style={{ fontSize: 14 }}>{error}</Txt>
          </View>
        )}

        <View style={{ gap: 12 }}>
          <Button label={saving ? 'Création…' : 'Créer mon cercle'} icon={Plus} tone="orange" size="lg" full loading={saving} disabled={!shown} onPress={() => void submit()} />
          <Txt variant="small" style={{ textAlign: 'center', fontSize: 14 }}>
            Tu as reçu un code ? <Txt variant="smallBold" color={C.foret} style={{ fontSize: 14 }} onPress={() => router.replace('/circle/join')}>Rejoindre un cercle</Txt>
          </Txt>
        </View>
      </View>
    </EntryShell>
  )
}
