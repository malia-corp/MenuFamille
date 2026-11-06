import { WEB_URL } from '@/lib/env'
import type { SharePayload } from '@/components/ui/Misc'

// Contenus de partage (mêmes textes que components/ui/share-actions.tsx du web).
export function surveyLinkPayload(token: string): SharePayload {
  return {
    title: 'Menu de la semaine — KeskonBouf',
    text:  'Donne ton avis sur notre menu de la semaine !',
    url:   `${WEB_URL}/s/${token}`,
  }
}

export function circleInvitePayload(circleName: string, code: string): SharePayload {
  return {
    title: 'Rejoins notre cercle familial — KeskonBouf',
    text:  `Rejoins notre cercle familial "${circleName}" sur KeskonBouf ! Code : ${code}`,
    copy:  code,
  }
}

export function circleJoinUrl(code: string): string {
  return `${WEB_URL}/circle/join?code=${encodeURIComponent(code)}`
}

export function circleJoinLinkPayload(circleName: string, code: string): SharePayload {
  return {
    title: 'Rejoins notre cercle familial — KeskonBouf',
    text:  `Rejoins notre cercle familial "${circleName}" sur KeskonBouf !`,
    url:   circleJoinUrl(code),
  }
}

export function appSharePayload(): SharePayload {
  return {
    title: 'KeskonBouf',
    text:  'Je planifie les repas de la famille avec KeskonBouf. Essaie-le !',
    url:   WEB_URL,
  }
}
