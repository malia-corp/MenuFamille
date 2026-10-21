import { forwardRef, useState } from 'react'
import { Image, Pressable, Share, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { Check, Copy, Share2 } from 'lucide-react-native'
import { MEAL_COLOR, type MealType } from '@/shared/meal-type'
import { MEAL_ICON } from '@/shared/meal-type-icon'
import { toast } from '@/lib/toast'
import { C, F, R } from '@/theme'
import { Txt } from './Txt'
import { Button } from './Button'

export function MealTypeIcon({ type, size = 18, color }: { type: MealType; size?: number; color?: string }) {
  const Icon = MEAL_ICON[type]
  return <Icon size={size} color={color ?? MEAL_COLOR[type].text} />
}

// Pastille ronde aux couleurs du type de repas.
export function MealTile({ type, size = 44, muted }: { type: MealType; size?: number; muted?: boolean }) {
  const c = MEAL_COLOR[type]
  return (
    <View style={{ width: size, height: size, borderRadius: R.pill, backgroundColor: muted ? C.creme : c.bg, alignItems: 'center', justifyContent: 'center' }}>
      <MealTypeIcon type={type} size={Math.round(size * 0.45)} color={muted ? C.texte2 : c.text} />
    </View>
  )
}

// Vignette d'un plat : photo, ou aplat aux couleurs du type de repas.
export function MealThumb({ type, photo, style, iconSize = 22 }: { type: MealType; photo?: string | null; style?: StyleProp<ViewStyle>; iconSize?: number }) {
  const c = MEAL_COLOR[type]
  return (
    <View style={[{ overflow: 'hidden', backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', borderRadius: R.md }, style]}>
      {photo
        ? <Image source={{ uri: photo }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} resizeMode="cover" accessibilityIgnoresInvertColors />
        : <MealTypeIcon type={type} size={iconSize} />}
    </View>
  )
}

const PALETTE = [C.orange, C.foret, C.foret500, C.jaune900, C.profond]

// Couleur stable par prénom (même règle que components/votes/name-avatar).
function colorFor(name: string): string {
  let hash = 0
  for (const ch of name.trim().toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

export function NameAvatar({ name, size = 32, bg }: { name: string; size?: number; bg?: string }) {
  return (
    <View style={{ width: size, height: size, borderRadius: R.pill, backgroundColor: bg ?? colorFor(name), alignItems: 'center', justifyContent: 'center' }}>
      <Txt style={{ fontFamily: F.bodyBold, fontSize: Math.round(size * 0.42), color: '#FFFFFF' }}>{name.trim().charAt(0).toUpperCase() || '?'}</Txt>
    </View>
  )
}

// Champ texte de la charte.
export const Field = forwardRef<TextInput, TextInputProps & { invalid?: boolean; big?: boolean }>(function Field({ style, invalid, big, multiline, ...props }, ref) {
  const [focused, setFocused] = useState(false)
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={C.texte2}
      multiline={multiline}
      {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
      style={[{
        minHeight: big ? 50 : 46, paddingHorizontal: 14, paddingVertical: multiline ? 12 : 0,
        borderRadius: R.md, borderWidth: 1.5, borderColor: invalid ? C.danger : focused ? C.foret500 : C.filet,
        backgroundColor: '#FFFFFF', fontFamily: big ? F.bodyBold : F.body, fontSize: big ? 17 : 15, color: C.profond,
        textAlignVertical: multiline ? 'top' : 'center',
      }, style]}
    />
  )
})

export function FieldLabel({ children }: { children: string }) {
  return <Txt variant="bodyBold" style={{ fontSize: 14, marginBottom: 6 }}>{children}</Txt>
}

export interface SharePayload { title: string; text: string; url?: string; copy?: string }

// Partage — un seul modèle (cf. CLAUDE.md) : feuille de partage du système +
// « Copier ». Jamais de bouton dédié à une application.
export function ShareActions({ getPayload, shareLabel = 'Partager', copyLabel = 'Copier', style, onDark }: {
  getPayload: () => Promise<SharePayload | null> | SharePayload | null
  shareLabel?: string; copyLabel?: string; style?: StyleProp<ViewStyle>; onDark?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  async function doShare() {
    setBusy(true)
    try {
      const p = await getPayload()
      if (!p) { toast.error('Rien à partager pour le moment'); return }
      const message = p.url ? `${p.text}\n${p.url}` : p.text
      await Share.share({ title: p.title, message, url: p.url })
    } catch { /* partage annulé */ } finally {
      setBusy(false)
    }
  }

  async function doCopy() {
    const p = await getPayload()
    if (!p) { toast.error('Rien à copier pour le moment'); return }
    await Clipboard.setStringAsync(p.copy ?? p.url ?? p.text)
    setCopied(true)
    toast.success('Copié !')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <View style={[{ flexDirection: 'row', gap: 8 }, style]}>
      <Button label={shareLabel} icon={Share2} tone={onDark ? 'onDark' : 'foret'} onPress={() => void doShare()} loading={busy} flex />
      <Button label={copied ? 'Copié' : copyLabel} icon={copied ? Check : Copy} tone={onDark ? 'onDark' : 'ghost'} onPress={() => void doCopy()} flex />
    </View>
  )
}

export function Pill({ children, onPress, style, accessibilityLabel }: { children: React.ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; accessibilityLabel?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 6, transform: [{ scale: pressed ? 0.97 : 1 }] }, style]}>
      {children}
    </Pressable>
  )
}
