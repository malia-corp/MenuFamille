// Logo KeskonBouf — guide de marque v1.0, chapitre 02 (L-01 à L-06).
// Symbole : une table vue d'en haut — le visage orange qui sourit, cinq
// convives en couronne, fourchette et couteau qui ferment le cercle.
// Aplats uniquement, aucun dégradé ni ombre. Mise à l'échelle homothétique.
//
// Déclinaisons (L-04 à L-06) :
//   primary  : sur crème ou blanc (par défaut)
//   reversed : sur vert forêt
//   orange   : version crème monochrome, seule autorisée sur orange
//   mono     : une encre (vert profond)
//   white    : sur photo ou couleur non chartée
// Jamais sur jaune ni sauge : on change le fond, pas le logo.

const G = '#294E3B' // forêt
const M = '#4C7A5E' // forêt 500
const O = '#E66B43' // orange
const Y = '#F7C24A' // jaune
const S = '#8CBF96' // sauge
const C = '#FFF7EE' // crème
const D = '#1F3A2E' // profond

type Palette = {
  cutlery: string; top: string; left: string; right: string; bl: string; br: string
  face: string; smile: string; word: string; accent: string; badge: string
}

const PALETTES: Record<string, Palette> = {
  primary:  { cutlery: G, top: O, left: M, right: Y, bl: M, br: G, face: O, smile: C, word: G, accent: O, badge: 'none' },
  reversed: { cutlery: C, top: O, left: S, right: Y, bl: S, br: C, face: O, smile: C, word: C, accent: O, badge: 'none' },
  orange:   { cutlery: C, top: C, left: C, right: C, bl: C, br: C, face: C, smile: O, word: C, accent: C, badge: 'none' },
  mono:     { cutlery: D, top: D, left: D, right: D, bl: D, br: D, face: D, smile: C, word: D, accent: D, badge: 'none' },
  white:    { cutlery: C, top: C, left: C, right: C, bl: C, br: C, face: C, smile: D, word: C, accent: C, badge: 'none' },
  badge:    { cutlery: C, top: O, left: S, right: Y, bl: S, br: C, face: O, smile: C, word: C, accent: O, badge: G },
}

export type LogoVariant = 'primary' | 'reversed' | 'orange' | 'mono' | 'white'
// principal : symbole + mot + signature · horizontal : en-têtes d'app ·
// stacked : écran de lancement · icon : symbole en pastille · mark : symbole seul ·
// wordmark : mot seul.
export type LogoLayout = 'principal' | 'horizontal' | 'stacked' | 'icon' | 'mark' | 'wordmark'

interface LogoProps {
  variant?: LogoVariant
  layout?:  LogoLayout
  size?:    number   // hauteur du symbole, en px
  tagline?: boolean  // signature sous le mot (empilé uniquement)
  className?: string
  title?:   string
}

// Symbole seul, pour un usage en SVG autonome (icônes, favicon).
export function LogoMark({ variant = 'primary', badge = false, size = 32, className }: {
  variant?: LogoVariant; badge?: boolean; size?: number; className?: string
}) {
  const c = badge && variant === 'primary' ? PALETTES.badge : PALETTES[variant]
  return (
    <svg
      viewBox={badge ? '-4 -18 148 148' : '0 0 140 108'}
      width={badge ? size * 1.1 : size * 1.3}
      height={badge ? size * 1.1 : size}
      className={className}
      aria-hidden="true"
      style={{ display: 'block', flex: 'none' }}
    >
      {c.badge !== 'none' && <circle cx="70" cy="56" r="74" fill={c.badge} />}
      <rect x="3" y="26" width="3.6" height="22" rx="1.8" fill={c.cutlery} />
      <rect x="8.6" y="26" width="3.6" height="22" rx="1.8" fill={c.cutlery} />
      <rect x="14.2" y="26" width="3.6" height="22" rx="1.8" fill={c.cutlery} />
      <rect x="19.8" y="26" width="3.6" height="22" rx="1.8" fill={c.cutlery} />
      <rect x="3" y="42" width="20.4" height="12" rx="6" fill={c.cutlery} />
      <rect x="9" y="48" width="8.4" height="54" rx="4.2" fill={c.cutlery} />
      <path d="M124 20 Q140 34 135 66 L124 66 Z" fill={c.cutlery} />
      <rect x="123.5" y="60" width="10" height="42" rx="5" fill={c.cutlery} />
      <circle cx="70" cy="13" r="12" fill={c.top} />
      <ellipse cx="38" cy="32" rx="13" ry="9.5" transform="rotate(-32 38 32)" fill={c.left} />
      <ellipse cx="102" cy="32" rx="12" ry="9" transform="rotate(32 102 32)" fill={c.right} />
      <circle cx="42" cy="95" r="10.5" fill={c.bl} />
      <circle cx="98" cy="95" r="10.5" fill={c.br} />
      <circle cx="70" cy="60" r="30" fill={c.face} />
      <path d="M55 63 Q70 81 85 63" fill="none" stroke={c.smile} strokeWidth={4.5} strokeLinecap="round" />
    </svg>
  )
}

export function Logo({ variant = 'primary', layout = 'horizontal', size = 32, tagline = false, className = '', title = 'KeskonBouf' }: LogoProps) {
  const c = PALETTES[variant]
  const stacked  = layout === 'stacked'
  const showMark = layout !== 'wordmark'
  const showWord = layout !== 'icon' && layout !== 'mark'
  const showTag  = layout === 'principal' || (stacked && tagline)
  const h = size

  return (
    <span
      role="img"
      aria-label={title}
      className={`inline-flex items-center leading-none ${stacked ? 'flex-col' : 'flex-row'} ${className}`}
      style={{ gap: stacked ? h * 0.18 : h * 0.22 }}
    >
      {showMark && <LogoMark variant={variant} badge={layout === 'icon'} size={h} />}
      {showWord && (
        <span className={`flex flex-col ${stacked ? 'items-center' : 'items-start'}`} style={{ gap: h * 0.16 }}>
          {/* Mot-symbole : Montserrat Black en capitales (L-01 : à remplacer par le
              tracé vectoriel du kit dès qu'il est fourni). */}
          <span
            className="whitespace-nowrap font-dosis font-black"
            style={{ fontSize: stacked ? h * 0.42 : h * 0.52, color: c.word, letterSpacing: '-0.02em' }}
          >
            KESKONBOUF
          </span>
          {showTag && (
            <span
              className="flex flex-col whitespace-nowrap font-main"
              style={{
                fontSize: h * 0.27, lineHeight: 1.05, color: c.word, gap: 2,
                transform: 'rotate(-3deg)', transformOrigin: 'left center', paddingLeft: h * 0.12,
              }}
            >
              <span>On mange quoi ?</span>
              <span>On décide ensemble.</span>
              <span className="block rounded-full" style={{ height: Math.max(2, h * 0.05), width: '62%', background: c.accent, marginLeft: '30%' }} />
            </span>
          )}
        </span>
      )}
    </span>
  )
}
