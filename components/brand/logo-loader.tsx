// Animation de chargement « Les convives s'installent » : le symbole du logo
// (guide de marque v1.0, chapitre 02) dont les cinq convives prennent place
// un à un autour de l'assiette, le visage sourit, les rayons s'allument.
// Animations dans globals.css (.kkb-loader) ; logo immobile si l'appareil
// demande moins d'animations. Pour les attentes sans mise en page connue
// (ouverture de l'app, passage de page) : dès que la page connaît sa
// structure, son squelette prend le relais.

const G = '#294E3B' // forêt
const M = '#4C7A5E' // forêt 500
const O = '#E66B43' // orange
const Y = '#F7C24A' // jaune
const S = '#8CBF96' // sauge
const C = '#FFF7EE' // crème

const RAYS = ['M8 58 L20 64', 'M5 80 L19 80', 'M8 102 L20 96', 'M192 58 L180 64', 'M195 80 L181 80', 'M192 102 L180 96']

export function LogoLoader({ size = 96, reversed = false, className = '' }: {
  size?: number      // hauteur du symbole, en px
  reversed?: boolean // traits crème, sur fond vert forêt
  className?: string
}) {
  const line = reversed ? C : G
  return (
    <svg
      viewBox="0 0 200 155"
      width={(size * 200) / 155}
      height={size}
      className={`kkb-loader overflow-visible ${className}`}
      aria-hidden="true"
    >
      <g className="kkb-loader-rays" fill="none" stroke={Y} strokeWidth={5} strokeLinecap="round">
        {RAYS.map((d) => <path key={d} d={d} />)}
      </g>
      <g stroke={line} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round">
        <path d="M44 132 L38 150 L62 134 Z" fill={O} />
        <path d="M100 34 L34 26 L34 132 L100 140 L166 132 L166 26 Z" fill={O} />
        <path d="M100 36 Q74 20 42 20 L42 124 Q74 122 100 136 Z" fill={O} />
        <path d="M100 36 Q126 20 158 20 L158 124 Q126 122 100 136 Z" fill={S} />
      </g>
      <circle cx="100" cy="78" r="45" fill={C} />
      <g transform="translate(100 79) scale(0.56) translate(-70 -58)">
        <rect x="3" y="26" width="3.6" height="22" rx="1.8" fill={G} />
        <rect x="8.6" y="26" width="3.6" height="22" rx="1.8" fill={G} />
        <rect x="14.2" y="26" width="3.6" height="22" rx="1.8" fill={G} />
        <rect x="19.8" y="26" width="3.6" height="22" rx="1.8" fill={G} />
        <rect x="3" y="42" width="20.4" height="12" rx="6" fill={G} />
        <rect x="9" y="48" width="8.4" height="54" rx="4.2" fill={G} />
        <path d="M124 20 Q140 34 135 66 L124 66 Z" fill={G} />
        <rect x="123.5" y="60" width="10" height="42" rx="5" fill={G} />
        {/* Les cinq convives, dans l'ordre où ils s'installent */}
        <g className="kkb-loader-guest" style={{ animationDelay: '0s' }}><circle cx="70" cy="13" r="12" fill={O} /></g>
        <g className="kkb-loader-guest" style={{ animationDelay: '.12s' }}><ellipse cx="38" cy="32" rx="13" ry="9.5" transform="rotate(-32 38 32)" fill={M} /></g>
        <g className="kkb-loader-guest" style={{ animationDelay: '.24s' }}><ellipse cx="102" cy="32" rx="12" ry="9" transform="rotate(32 102 32)" fill={Y} /></g>
        <g className="kkb-loader-guest" style={{ animationDelay: '.36s' }}><circle cx="98" cy="95" r="10.5" fill={G} /></g>
        <g className="kkb-loader-guest" style={{ animationDelay: '.48s' }}><circle cx="42" cy="95" r="10.5" fill={M} /></g>
        <g className="kkb-loader-face">
          <circle cx="70" cy="60" r="30" fill={O} />
          <path d="M55 63 Q70 81 85 63" fill="none" stroke={C} strokeWidth={5} strokeLinecap="round" />
        </g>
      </g>
    </svg>
  )
}

// Écran d'attente centré : logo animé + libellé annoncé aux lecteurs d'écran.
export function LogoLoaderScreen({ label = 'Chargement…', className = 'min-h-[60vh]' }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <LogoLoader size={88} />
      <span className="font-quicksand text-sm font-semibold text-[var(--kkb-texte-2)]">{label}</span>
    </div>
  )
}
