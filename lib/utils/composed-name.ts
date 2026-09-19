type Composition = { role: string; sort_order: number; recipes: { name: string } | null }

export function composedName(
  mainName: string | null | undefined,
  compositions: Composition[] | null | undefined
): string {
  const parts = [mainName ?? 'Repas non défini']
  const sorted = [...(compositions ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  for (const comp of sorted) {
    if (comp.recipes?.name) parts.push(comp.recipes.name)
  }
  return parts.join(' + ')
}
