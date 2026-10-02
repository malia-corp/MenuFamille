const PALETTE = ['var(--kkb-coral)', 'var(--kkb-teal)', 'var(--kkb-success)', '#B07A12', '#3A2E28']

// Couleur stable par prénom : un même prénom garde sa couleur partout.
function colorFor(name: string): string {
  let hash = 0
  for (const c of name.trim().toLowerCase()) hash = (hash * 31 + c.charCodeAt(0)) | 0
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

export function NameAvatar({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white font-quicksand font-bold shrink-0"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42), backgroundColor: colorFor(name) }}
      aria-hidden="true"
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}
