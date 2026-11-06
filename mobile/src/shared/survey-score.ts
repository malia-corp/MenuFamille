export interface ReactionCounts {
  aime:      number
  bof:       number
  naime_pas: number
}

export function totalReactions(c: ReactionCounts): number {
  return c.aime + c.bof + c.naime_pas
}

// "D'accord" = tout vote qui n'est pas une opposition (J'adore + Ça passe).
// Source unique : adhésion d'un repas, consensus global et harmonie de l'accueil.
export function agreementPct(c: ReactionCounts): number | null {
  const total = totalReactions(c)
  if (total === 0) return null
  return Math.round(((c.aime + c.bof) / total) * 100)
}

// Plat rejeté : "Pas trop" majoritaire.
export function isRejected(c: ReactionCounts): boolean {
  const total = totalReactions(c)
  return total > 0 && c.naime_pas / total > 0.5
}

export function sumCounts(list: ReactionCounts[]): ReactionCounts {
  return list.reduce(
    (acc, c) => ({ aime: acc.aime + c.aime, bof: acc.bof + c.bof, naime_pas: acc.naime_pas + c.naime_pas }),
    { aime: 0, bof: 0, naime_pas: 0 },
  )
}
