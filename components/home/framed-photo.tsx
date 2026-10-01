'use client'

import { useState } from 'react'

// Affiche une photo de recette sans jamais la rogner, quelle que soit sa
// taille/son ratio (on ne maitrise pas ce que l'utilisatrice importe) :
// l'image complete est montree en entier (object-contain), un calque flou
// sature de la meme image en fond comble les bandes vides avec des couleurs
// issues du plat plutot qu'un gris delave. A placer dans un parent
// `relative` de taille fixee par l'appelant (ex. `aspect-[4/3] relative`).
export function FramedPhoto({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover scale-110 blur-[28px] saturate-[1.4] brightness-[.85]"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={`relative w-full h-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.35)] transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  )
}
