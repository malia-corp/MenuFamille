'use client'

// Affiche une photo de recette sans jamais la rogner, quelle que soit sa
// taille/son ratio (on ne maitrise pas ce que l'utilisatrice importe) :
// l'image complete est montree en entier (object-contain), un calque flou
// de la meme image en fond comble les bandes vides plutot que de laisser
// une couleur plate. A placer dans un parent `relative` de taille fixee par
// l'appelant (ex. `h-36 w-full relative`).
export function FramedPhoto({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-50"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" className="relative w-full h-full object-contain" />
    </div>
  )
}
