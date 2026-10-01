export type DayOfWeek = 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche'

export const DAY_OPTIONS: { val: DayOfWeek; label: string; full: string }[] = [
  { val: 'lundi',    label: 'Lun', full: 'Lundi'    },
  { val: 'mardi',    label: 'Mar', full: 'Mardi'    },
  { val: 'mercredi', label: 'Mer', full: 'Mercredi' },
  { val: 'jeudi',    label: 'Jeu', full: 'Jeudi'    },
  { val: 'vendredi', label: 'Ven', full: 'Vendredi' },
  { val: 'samedi',   label: 'Sam', full: 'Samedi'   },
  { val: 'dimanche', label: 'Dim', full: 'Dimanche' },
]

export function getMondayISO(d: Date = new Date()): string {
  const day  = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon  = new Date(d)
  mon.setDate(d.getDate() + diff)
  const y  = mon.getFullYear()
  const m  = String(mon.getMonth() + 1).padStart(2, '0')
  const dd = String(mon.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function shiftWeek(iso: string, delta: -1 | 1): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + delta * 7)
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00')
  const end   = new Date(start)
  end.setDate(start.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return `${fmt(start)} – ${fmt(end)}`
}

// Jour ISO (0=dimanche..6=samedi) -> DayOfWeek
export function dayOfWeekFromDate(d: Date): DayOfWeek {
  return DAY_OPTIONS[(d.getDay() + 6) % 7].val
}
