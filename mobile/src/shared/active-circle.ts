// Cercle actif parmi la réponse de GET /api/circles (même règle que le web).
export function pickActiveCircle<T extends { id: string }>(
  res: { data?: T[]; active_circle_id?: string | null } | null | undefined,
): T | null {
  const list = res?.data ?? []
  return list.find((c) => c.id === res?.active_circle_id) ?? list[0] ?? null
}
