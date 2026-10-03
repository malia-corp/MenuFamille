'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, Loader2, Share2 } from 'lucide-react'
import { toast } from '@/lib/stores/toast-store'

export interface SharePayload {
  title: string
  text:  string
  url?:  string
  copy?: string // ce que copie "Copier" (sinon url, sinon text)
}

// Contenu commun du partage du lien de sondage (planification, résultats...).
export function surveyLinkPayload(token: string): SharePayload {
  return {
    title: 'Menu de la semaine — KeskonBouf',
    text:  'Donne ton avis sur notre menu de la semaine !',
    url:   `${window.location.origin}/s/${token}`,
  }
}

// Invitation au cercle familial : "Copier" copie le code seul.
export function circleInvitePayload(circleName: string, code: string): SharePayload {
  return {
    title: 'Rejoins notre cercle familial — KeskonBouf',
    text:  `Rejoins notre cercle familial "${circleName}" sur KeskonBouf ! Code : ${code}`,
    copy:  code,
  }
}

// Recommander l'application (Paramètres > Partager KeskonBouf).
export function appSharePayload(): SharePayload {
  return {
    title: 'KeskonBouf',
    text:  'Je planifie les repas de la famille avec KeskonBouf. Essaie-le !',
    url:   window.location.origin,
  }
}

interface ShareActionsProps {
  // Appelé au clic (peut générer un lien à la volée) ; null = rien à partager.
  getPayload:       () => Promise<SharePayload | null> | SharePayload | null
  shareLabel?:      string
  copyLabel?:       string
  className?:            string
  buttonClassName?:      string
  shareButtonClassName?: string // style propre au bouton "Partager" (sinon buttonClassName)
}

// Modèle unique de partage de l'app : feuille de partage native (WhatsApp,
// SMS, mail...) si l'appareil la propose, + copie dans le presse-papiers.
export function ShareActions({
  getPayload,
  shareLabel = 'Partager',
  copyLabel = 'Copier le lien',
  className = 'flex items-center gap-2',
  buttonClassName = 'flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-3 font-dosis font-bold text-sm border border-[var(--kkb-border)] text-[var(--kkb-text-secondary)] hover:border-[var(--kkb-coral)] hover:text-[var(--kkb-coral)] transition-colors disabled:opacity-60',
  shareButtonClassName,
}: ShareActionsProps) {
  const [canNativeShare, setCanNativeShare] = useState(false)
  const [busy,   setBusy]   = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  }, [])

  async function resolvePayload(): Promise<SharePayload | null> {
    setBusy(true)
    try {
      return await getPayload()
    } finally {
      setBusy(false)
    }
  }

  async function shareNative() {
    const payload = await resolvePayload()
    if (!payload) return
    try {
      await navigator.share({ title: payload.title, text: payload.text, url: payload.url })
    } catch {
      /* feuille de partage annulée */
    }
  }

  async function copy() {
    const payload = await resolvePayload()
    if (!payload) return
    try {
      await navigator.clipboard.writeText(payload.copy ?? payload.url ?? payload.text)
      toast.info(payload.copy ? 'Copié !' : payload.url ? 'Lien copié !' : 'Texte copié !')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Impossible de copier')
    }
  }

  return (
    <div className={className}>
      {canNativeShare && (
        <button type="button" onClick={() => { void shareNative() }} disabled={busy} className={shareButtonClassName ?? buttonClassName}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
          {shareLabel}
        </button>
      )}
      <button type="button" onClick={() => { void copy() }} disabled={busy} className={buttonClassName}>
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? 'Copié !' : copyLabel}
      </button>
    </div>
  )
}
