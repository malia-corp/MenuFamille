'use client'

import { useState, useEffect } from 'react'
import { Send, UserCircle, MessageSquare, CheckCircle } from 'lucide-react'

type Reaction = 'aime' | 'bof' | 'naime_pas'

type SurveyItem = {
  id:               string
  meal_type:        string
  day_of_week:      string
  applies_all_days: boolean
  recipe_name:      string | null
}

type AnswerState = {
  reaction:  Reaction | null
  comment:   string
  saved:     boolean
}

const REACTION_CONFIG: { value: Reaction; emoji: string; label: string; bg: string; border: string }[] = [
  { value: 'aime',      emoji: '😊', label: 'J\'aime',    bg: '#F0FAF5', border: '#2A7D4F' },
  { value: 'bof',       emoji: '😐', label: 'Bof',        bg: '#FDF8EC', border: '#F5A623' },
  { value: 'naime_pas', emoji: '😕', label: 'J\'aime pas', bg: '#FCEBEB', border: '#C0392B' },
]

const MEAL_LABEL: Record<string, string> = {
  petit_dejeuner: 'Petit-déjeuner',
  dejeuner:       'Déjeuner',
  gouter:         'Goûter',
  diner:          'Dîner',
}

const STORAGE_KEY_NAME    = 'mf_survey_name'
const STORAGE_KEY_RESP_ID = (token: string) => `mf_survey_resp_${token}`
const STORAGE_KEY_DONE    = (token: string) => `mf_survey_done_${token}`

export function SurveySection({ token, items }: { token: string; items: SurveyItem[] }) {
  const [name, setName]               = useState('')
  const [isLoggedIn, setIsLoggedIn]   = useState(false)
  const [answers, setAnswers]         = useState<Record<string, AnswerState>>({})
  const [responseId, setResponseId]   = useState<string | null>(null)
  const [submitted, setSubmitted]     = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState<string | null>(null)

  // Charger prénom depuis le profil si connecté, sinon localStorage
  useEffect(() => {
    const storedRespId = localStorage.getItem(STORAGE_KEY_RESP_ID(token))
    if (storedRespId) setResponseId(storedRespId)

    const done = localStorage.getItem(STORAGE_KEY_DONE(token))
    if (done === '1') setSubmitted(true)

    fetch('/api/users/me')
      .then(r => r.ok ? r.json() : null)
      .then((data: { display_name?: string } | null) => {
        if (data?.display_name) {
          setName(data.display_name)
          setIsLoggedIn(true)
        } else {
          const storedName = localStorage.getItem(STORAGE_KEY_NAME)
          if (storedName) setName(storedName)
        }
      })
      .catch(() => {
        const storedName = localStorage.getItem(STORAGE_KEY_NAME)
        if (storedName) setName(storedName)
      })
  }, [token])

  const ratedCount = Object.values(answers).filter(a => a.reaction !== null).length

  async function saveAnswer(itemId: string, reaction: Reaction, comment: string) {
    if (!name.trim()) return

    localStorage.setItem(STORAGE_KEY_NAME, name.trim())

    const res = await fetch(`/api/surveys/${token}/answers/${itemId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        respondent_name: name.trim(),
        reaction,
        comment:         comment.trim() || undefined,
        response_id:     responseId ?? undefined,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Erreur lors de la sauvegarde')
      return
    }

    const data = await res.json()
    if (!responseId && data.response_id) {
      setResponseId(data.response_id)
      localStorage.setItem(STORAGE_KEY_RESP_ID(token), data.response_id)
    }

    setAnswers(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], saved: true },
    }))
  }

  function selectReaction(itemId: string, reaction: Reaction) {
    setAnswers(prev => ({
      ...prev,
      [itemId]: { reaction, comment: prev[itemId]?.comment ?? '', saved: false },
    }))
    saveAnswer(itemId, reaction, answers[itemId]?.comment ?? '')
  }

  function updateComment(itemId: string, comment: string) {
    setAnswers(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], comment, saved: false },
    }))
  }

  function blurComment(itemId: string) {
    const a = answers[itemId]
    if (a?.reaction) {
      saveAnswer(itemId, a.reaction, a.comment)
    }
  }

  async function handleSubmit() {
    if (!responseId || ratedCount === 0) return
    setSubmitting(true)
    setError(null)

    const res = await fetch(`/api/surveys/${token}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response_id: responseId }),
    })

    setSubmitting(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Erreur lors de l\'envoi')
      return
    }

    localStorage.setItem(STORAGE_KEY_DONE(token), '1')
    setSubmitted(true)
  }

  function handleModify() {
    localStorage.removeItem(STORAGE_KEY_DONE(token))
    setSubmitted(false)
  }

  if (submitted) {
    return (
      <section className="bg-white border border-[#EDE4D6] rounded-2xl p-5 text-center space-y-2">
        <CheckCircle className="h-8 w-8 text-[#2A7D4F] mx-auto" />
        <p className="font-dosis font-semibold text-base text-[#3D2C20]">Avis envoyé !</p>
        <p className="text-xs font-quicksand text-[#9A8F84]">Merci pour votre retour.</p>
        <button
          onClick={handleModify}
          className="text-xs font-quicksand text-[#E87D3E] underline mt-1"
        >
          Modifier mes réponses
        </button>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      {/* Titre section */}
      <div>
        <p className="text-[11px] font-quicksand font-bold uppercase tracking-wider text-[#9A8F84] mb-0.5">
          Votre avis
        </p>
        <h2 className="font-dosis font-bold text-lg text-[#3D2C20]">
          Donnez votre avis sur ce menu
        </h2>
      </div>

      {/* Champ prénom — masqué si l'utilisateur est connecté */}
      {isLoggedIn ? (
        <div className="bg-white border border-[#EDE4D6] rounded-xl px-3 py-2.5 flex items-center gap-2.5">
          <UserCircle className="h-4 w-4 text-[#2A7D4F] flex-shrink-0" />
          <p className="text-sm font-quicksand text-[#3D2C20]">{name}</p>
        </div>
      ) : (
        <div className="bg-white border border-[#EDE4D6] rounded-xl px-3 py-2.5 flex items-center gap-2.5">
          <UserCircle className="h-4 w-4 text-[#9A8F84] flex-shrink-0" />
          <div className="flex-1">
            <p className="text-[10px] font-quicksand font-bold uppercase tracking-wider text-[#9A8F84] mb-0.5">
              Votre prénom
            </p>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={() => name.trim() && localStorage.setItem(STORAGE_KEY_NAME, name.trim())}
              placeholder="Comment vous appelez-vous ?"
              className="w-full text-sm font-quicksand text-[#3D2C20] bg-transparent outline-none placeholder:text-[#C5B8AE]"
            />
          </div>
        </div>
      )}

      {/* Indicateur de progression */}
      {ratedCount > 0 && (
        <p className="text-xs font-quicksand font-medium text-[#9A8F84] text-right">
          {ratedCount} / {items.length} repas notés
        </p>
      )}

      {/* Cards par repas */}
      {items.map(item => {
        const answer    = answers[item.id]
        const selected  = answer?.reaction ?? null
        const hasReaction = selected !== null

        return (
          <div
            key={item.id}
            className="bg-white border border-[#EDE4D6] rounded-xl p-3 space-y-3"
          >
            {/* Nom du repas */}
            <div>
              <p className="text-[10px] font-quicksand font-semibold uppercase tracking-wider text-[#9A8F84]">
                {MEAL_LABEL[item.meal_type] ?? item.meal_type}
                {item.applies_all_days ? ' · Toute la semaine' : ` · ${item.day_of_week.charAt(0).toUpperCase() + item.day_of_week.slice(1)}`}
              </p>
              <p className="font-dosis font-semibold text-sm text-[#3D2C20] mt-0.5">
                {item.recipe_name ?? 'Repas non défini'}
              </p>
            </div>

            {/* Boutons réaction */}
            <div className="flex gap-2">
              {REACTION_CONFIG.map(r => (
                <button
                  key={r.value}
                  onClick={() => name.trim() ? selectReaction(item.id, r.value) : null}
                  disabled={!name.trim()}
                  style={
                    selected === r.value
                      ? { backgroundColor: r.bg, borderColor: r.border }
                      : {}
                  }
                  className={[
                    'flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg border text-xs font-quicksand font-medium transition-all',
                    selected === r.value
                      ? 'border-2'
                      : 'border-[#EDE4D6] text-[#9A8F84] disabled:opacity-40',
                    !name.trim() ? 'cursor-not-allowed' : 'cursor-pointer',
                  ].join(' ')}
                >
                  <span className="text-lg">{r.emoji}</span>
                  <span style={selected === r.value ? { color: r.border } : {}}>
                    {r.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Champ commentaire (apparaît après sélection) */}
            {hasReaction && (
              <div className="flex items-start gap-2 animate-in fade-in duration-200">
                <MessageSquare className="h-3.5 w-3.5 text-[#9A8F84] mt-2 flex-shrink-0" />
                <textarea
                  value={answer.comment}
                  onChange={e => updateComment(item.id, e.target.value)}
                  onBlur={() => blurComment(item.id)}
                  placeholder="Un commentaire ? (facultatif)"
                  rows={2}
                  className="flex-1 text-xs font-quicksand text-[#3D2C20] bg-[#FDF6EE] border border-[#EDE4D6] rounded-lg px-2.5 py-1.5 outline-none placeholder:text-[#C5B8AE] resize-none"
                />
              </div>
            )}
          </div>
        )
      })}

      {/* Erreur */}
      {error && (
        <p className="text-xs font-quicksand text-[#C0392B] text-center">{error}</p>
      )}

      {/* Bouton envoi */}
      <button
        onClick={handleSubmit}
        disabled={ratedCount === 0 || !name.trim() || submitting}
        className={[
          'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-dosis font-bold text-sm transition-all',
          ratedCount > 0 && name.trim()
            ? 'bg-[#E87D3E] text-white'
            : 'bg-[#EDE4D6] text-[#9A8F84] cursor-not-allowed',
        ].join(' ')}
      >
        <Send className="h-4 w-4" />
        {submitting ? 'Envoi en cours…' : 'Envoyer mon avis'}
      </button>
    </section>
  )
}
