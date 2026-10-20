// Dates en français sans dépendre d'Intl (support partiel selon le moteur JS).
const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

// « lundi 12 octobre »
export function dayLong(d: Date): string {
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

// « 12 oct. »
export function dayShortMonth(d: Date): string {
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

// « 12 octobre 2026 »
export function dateLong(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

// « 12/10 à 19h30 »
export function dateTimeShort(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} à ${d.getHours()}h${p(d.getMinutes())}`
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function relativeDay(iso: string): string {
  const d = new Date(iso); d.setHours(0, 0, 0, 0)
  const t = new Date();    t.setHours(0, 0, 0, 0)
  const diff = Math.round((t.getTime() - d.getTime()) / 86_400_000)
  if (diff <= 0) return 'Aujourd’hui'
  if (diff === 1) return 'Hier'
  return `Il y a ${diff} j`
}
