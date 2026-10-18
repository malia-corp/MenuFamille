// Logo KeskonBouf — guide de marque v1.0, chapitre 02 (L-01 à L-06).
// Symbole : un carnet de recettes ouvert, une assiette au centre où sourit
// un visage entouré de cinq convives, fourchette et couteau, une bulle de
// discussion au pied et des rayons jaunes. Aplats uniquement, aucun dégradé
// ni ombre. Mise à l'échelle homothétique.
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
  line: string; pageL: string; pageR: string; cover: string; plate: string; rays: string
  cutlery: string; top: string; left: string; right: string; bl: string; br: string
  face: string; smile: string; word: string; accent: string; badge: string
}

const book = (line: string, pageL: string, pageR: string, cover: string, plate: string, rays: string) =>
  ({ line, pageL, pageR, cover, plate, rays })

const PALETTES: Record<LogoVariant, Palette> = {
  primary:  { ...book(G, O, S, O, C, Y), cutlery: G, top: O, left: M, right: Y, bl: M, br: G, face: O, smile: C, word: G, accent: O, badge: 'none' },
  reversed: { ...book(C, O, S, O, C, Y), cutlery: G, top: O, left: M, right: Y, bl: M, br: G, face: O, smile: C, word: C, accent: O, badge: 'none' },
  orange:   { ...book(C, O, O, O, C, C), cutlery: O, top: O, left: O, right: O, bl: O, br: O, face: O, smile: C, word: C, accent: C, badge: 'none' },
  mono:     { ...book(D, 'none', 'none', 'none', 'none', D), cutlery: D, top: D, left: D, right: D, bl: D, br: D, face: D, smile: C, word: D, accent: D, badge: 'none' },
  white:    { ...book(C, 'none', 'none', 'none', 'none', C), cutlery: C, top: C, left: C, right: C, bl: C, br: C, face: C, smile: D, word: C, accent: C, badge: 'none' },
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

// Symbole seul, pour un usage en SVG autonome (icônes, en-têtes compacts).
// Les rayons disparaissent sous 32 px et dans la pastille.
export function LogoMark({ variant = 'primary', badge = false, size = 32, className }: {
  variant?: LogoVariant; badge?: boolean; size?: number; className?: string
}) {
  const c: Palette = badge && variant === 'primary' ? { ...PALETTES.primary, badge: G, line: C } : PALETTES[variant]
  const showRays = !badge && size >= 32
  const ratio = badge ? 1.05 : 200 / 155
  return (
    <svg
      viewBox={badge ? '-6 -26 212 212' : '0 0 200 155'}
      width={size * ratio}
      height={badge ? size * 1.05 : size}
      className={className}
      aria-hidden="true"
      style={{ display: 'block', flex: 'none' }}
    >
      {c.badge !== 'none' && <circle cx="100" cy="80" r="104" fill={c.badge} />}
      {showRays && (
        <g fill="none" stroke={c.rays} strokeWidth={5} strokeLinecap="round">
          <path d="M8 58 L20 64" /><path d="M5 80 L19 80" /><path d="M8 102 L20 96" />
          <path d="M192 58 L180 64" /><path d="M195 80 L181 80" /><path d="M192 102 L180 96" />
        </g>
      )}
      <g stroke={c.line} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round">
        <path d="M44 132 L38 150 L62 134 Z" fill={c.pageL} />
        <path d="M100 34 L34 26 L34 132 L100 140 L166 132 L166 26 Z" fill={c.cover} />
        <path d="M100 36 Q74 20 42 20 L42 124 Q74 122 100 136 Z" fill={c.pageL} />
        <path d="M100 36 Q126 20 158 20 L158 124 Q126 122 100 136 Z" fill={c.pageR} />
      </g>
      <circle cx="100" cy="78" r="45" fill={c.plate} />
      <g transform="translate(100 79) scale(0.56) translate(-70 -58)">
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
        <path d="M55 63 Q70 81 85 63" fill="none" stroke={c.smile} strokeWidth={5} strokeLinecap="round" />
      </g>
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
      style={{ gap: stacked ? h * 0.14 : h * 0.18 }}
    >
      {showMark && <LogoMark variant={variant} badge={layout === 'icon'} size={h} />}
      {showWord && (
        <span className={`flex flex-col ${stacked ? 'items-center' : 'items-start'}`} style={{ gap: h * 0.1 }}>
          {/* Mot-symbole : Montserrat Black en capitales (L-01 : à remplacer par le
              tracé vectoriel du kit dès qu'il est fourni). */}
          <span
            className="whitespace-nowrap font-dosis font-black"
            style={{ fontSize: stacked ? h * 0.36 : h * 0.44, color: c.word, letterSpacing: '-0.02em' }}
          >
            KESKONBOUF
          </span>
          {showTag && (
            <span
              className="flex flex-col whitespace-nowrap font-main font-semibold"
              style={{ fontSize: h * 0.22, lineHeight: 1.1, color: c.word, gap: 2 }}
            >
              <span>On mange quoi ?</span>
              <span>On décide ensemble.</span>
              <span className="block rounded-full" style={{ height: Math.max(2, h * 0.04), width: '40%', background: c.accent, marginTop: 4 }} />
            </span>
          )}
        </span>
      )}
    </span>
  )
}
