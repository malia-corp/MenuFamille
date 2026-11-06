import { Text, type TextProps, type TextStyle } from 'react-native'
import { C, F } from '@/theme'

// Échelle typographique du guide de marque (chapitre 04), comme les classes
// text-h1, text-h2… du web.
export type TxtVariant =
  | 'display' | 'h1' | 'h2' | 'h3' | 'signature'
  | 'body' | 'bodySemi' | 'bodyBold' | 'small' | 'smallBold' | 'meta' | 'label' | 'number'

const VARIANTS: Record<TxtVariant, TextStyle> = {
  display:   { fontFamily: F.titleBlack, fontSize: 40, lineHeight: 44, color: C.foret },
  h1:        { fontFamily: F.title,      fontSize: 28, lineHeight: 32, color: C.foret },
  h2:        { fontFamily: F.title,      fontSize: 20, lineHeight: 24, color: C.foret },
  h3:        { fontFamily: F.titleBold,  fontSize: 17, lineHeight: 22, color: C.profond },
  signature: { fontFamily: F.signature,  fontSize: 22, lineHeight: 27, color: C.foret },
  body:      { fontFamily: F.body,       fontSize: 15, lineHeight: 21, color: C.profond },
  bodySemi:  { fontFamily: F.bodySemi,   fontSize: 15, lineHeight: 21, color: C.profond },
  bodyBold:  { fontFamily: F.bodyBold,   fontSize: 15, lineHeight: 21, color: C.profond },
  small:     { fontFamily: F.body,       fontSize: 13, lineHeight: 18, color: C.texte2 },
  smallBold: { fontFamily: F.bodyBold,   fontSize: 13, lineHeight: 18, color: C.profond },
  meta:      { fontFamily: F.body,       fontSize: 12, lineHeight: 16, color: C.texte2 },
  label:     { fontFamily: F.bodySemi,   fontSize: 12, lineHeight: 16, color: C.texte2 },
  number:    { fontFamily: F.title,      fontSize: 20, lineHeight: 24, color: C.profond, fontVariant: ['tabular-nums'] },
}

export function Txt({ variant = 'body', color, style, ...props }: TextProps & { variant?: TxtVariant; color?: string }) {
  return <Text {...props} style={[VARIANTS[variant], color ? { color } : null, style]} />
}
