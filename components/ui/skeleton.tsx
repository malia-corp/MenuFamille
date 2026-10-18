// Briques des squelettes de chargement. Chaque page a son squelette, qui
// reprend son conteneur et ses proportions réelles (mobile et desktop) pour
// que rien ne saute à l'arrivée des données — cf. components/skeletons.

// Bloc gris animé (reflet qui balaie). dark : posé sur un fond vert forêt.
export function Bone({ className = '', dark = false }: { className?: string; dark?: boolean }) {
  return <div className={`${dark ? 'kkb-bone-dark' : 'kkb-bone'} ${className}`} />
}

// Carte blanche des pages, au rayon de la charte.
export function BoneCard({ className = '', children }: { className?: string; children?: React.ReactNode }) {
  return <div className={`rounded-[var(--kkb-r-xl)] bg-white ${className}`}>{children}</div>
}

// Enveloppe d'un squelette de page : annoncé « chargement » aux lecteurs
// d'écran, contenu décoratif masqué. Les classes de mise en page (grille,
// space-y…) vont sur le parent direct des blocs, sinon elles ne portent pas.
export function SkeletonPage({ label, className = '', children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div aria-busy="true" aria-label={label}>
      <div aria-hidden="true" className={className}>{children}</div>
    </div>
  )
}
