'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Key, LogOut, MoreVertical, Plus, Share2, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const AVATAR_COLORS = ['#B0461C', '#1B6035', '#B07A12', '#3A2E28', '#5A4A43']

interface Member {
  id: string
  role: string
  joined_at: string
  users: { id: string; display_name: string; email: string }
}

interface Circle {
  id: string
  name: string
  invite_code: string
  created_by: string
  family_circle_members: Member[]
  my_role: string
}

export default function CirclePage() {
  const router = useRouter()
  const [circles, setCircles] = useState<Circle[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/circles')
      .then((r) => r.json())
      .then((res) => {
        setCircles(res?.data ?? [])
        setCurrentUserId(res?.viewer_id ?? null)
        setLoading(false)
      })
  }, [])

  // Fermer le menu contextuel au clic extérieur
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function whatsappUrl(code: string, name: string) {
    const text = encodeURIComponent(
      `Rejoins notre cercle familial "${name}" sur MenuFamille ! Code : ${code}`
    )
    return `https://wa.me/?text=${text}`
  }

  async function removeMember(circleId: string, userId: string) {
    setOpenMenu(null)
    const res = await fetch(`/api/circles/${circleId}/members/${userId}`, { method: 'DELETE' })
    if (res.ok) {
      setCircles((prev) =>
        prev.map((c) =>
          c.id === circleId
            ? { ...c, family_circle_members: c.family_circle_members.filter((m) => m.users.id !== userId) }
            : c
        )
      )
    }
  }

  async function leaveCircle(circleId: string) {
    if (!currentUserId) return
    const res = await fetch(`/api/circles/${circleId}/members/${currentUserId}`, { method: 'DELETE' })
    if (res.ok) {
      setCircles((prev) => prev.filter((c) => c.id !== circleId))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-[#8c7169]">Chargement…</p>
      </div>
    )
  }

  if (circles.length === 0) {
    return (
      <div className="max-w-sm mx-auto px-4 py-8 space-y-6 text-center">
        <Users className="h-12 w-12 text-[#E8C99A] mx-auto" />
        <div className="space-y-1">
          <h1 className="font-dosis font-bold text-xl text-[#2C1810]">Pas encore de cercle</h1>
          <p className="text-sm text-[#5A4A43]">Crée ou rejoins un cercle familial pour planifier ensemble.</p>
        </div>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => router.push('/circle/create')}
            className="w-full flex items-center justify-center gap-2 bg-terracotta text-white rounded-xl py-3 font-quicksand font-medium hover:bg-[#C74E21] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Créer un cercle
          </button>
          <button
            type="button"
            onClick={() => router.push('/circle/join')}
            className="w-full flex items-center justify-center gap-2 border border-[#E8C99A] text-[#5A4A43] rounded-xl py-3 font-quicksand font-medium hover:bg-[#FDF6EE] transition-colors"
          >
            <Key className="h-4 w-4" />
            Rejoindre avec un code
          </button>
        </div>
      </div>
    )
  }

  // Afficher le premier cercle (MVP : un seul cercle à la fois)
  const circle = circles[0]
  const members = circle.family_circle_members ?? []
  const isPlanificatrice = circle.my_role === 'planificatrice'

  return (
    <div className="max-w-sm mx-auto px-4 py-6 space-y-6">
      <h1 className="font-dosis font-bold text-xl text-[#2C1810]">{circle.name}</h1>

      {/* Section CODE D'INVITATION */}
      <section className="bg-[#FCEEE6] border border-[#E8C99A] rounded-xl p-4 space-y-3">
        <p className="text-xs text-[#8c7169] uppercase tracking-widest font-medium">Code d&apos;invitation</p>
        <div className="flex items-center justify-between">
          <span className="font-dosis font-bold text-3xl text-terracotta tracking-widest">
            {circle.invite_code}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => copyCode(circle.invite_code)}
              className="flex items-center gap-1.5 text-sm text-[#5A4A43] hover:text-terracotta transition-colors px-2 py-1 rounded-lg hover:bg-white"
              title="Copier le code"
            >
              <Copy className="h-4 w-4" />
              {copied ? 'Copié !' : 'Copier'}
            </button>
            <a
              href={whatsappUrl(circle.invite_code, circle.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-[#5A4A43] hover:text-market-green transition-colors px-2 py-1 rounded-lg hover:bg-white"
              title="Partager sur WhatsApp"
            >
              <Share2 className="h-4 w-4" />
              WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Section MEMBRES DU CERCLE */}
      <section className="space-y-2">
        <p className="text-xs text-[#8c7169] uppercase tracking-widest font-medium">Membres du cercle</p>
        <div className="space-y-2" ref={menuRef}>
          {members.map((member, index) => {
            const u = member.users
            const initial = (u.display_name || u.email)[0].toUpperCase()
            const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length]
            const isCurrentUser = u.id === currentUserId
            const canRemove = isPlanificatrice && !isCurrentUser

            return (
              <div
                key={member.id}
                className="bg-white border border-[#E8C99A] rounded-xl px-4 py-3 flex items-center gap-3"
              >
                {/* Avatar */}
                <div
                  className="h-9 w-9 rounded-full flex items-center justify-center text-white font-dosis font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: avatarColor }}
                >
                  {initial}
                </div>

                {/* Nom + rôle */}
                <div className="flex-1 min-w-0">
                  <p className="font-quicksand font-semibold text-[#2C1810] text-sm truncate">
                    {u.display_name || u.email}
                    {isCurrentUser && <span className="text-[#8c7169] font-normal"> (moi)</span>}
                  </p>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] mt-0.5 ${
                      member.role === 'planificatrice'
                        ? 'bg-[#FEF3E0] text-[#B07A12]'
                        : 'bg-[#EAF5EE] text-[#1B6035]'
                    }`}
                  >
                    {member.role}
                  </Badge>
                </div>

                {/* Menu contextuel */}
                {canRemove && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenMenu(openMenu === member.id ? null : member.id)}
                      className="p-1 rounded-lg text-[#8c7169] hover:text-[#5A4A43] hover:bg-[#FDF6EE]"
                      aria-label="Options du membre"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {openMenu === member.id && (
                      <div className="absolute right-0 top-8 z-10 bg-white border border-[#E8C99A] rounded-xl shadow-lg py-1 min-w-[140px]">
                        <button
                          type="button"
                          onClick={() => removeMember(circle.id, u.id)}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-quicksand"
                        >
                          Retirer du cercle
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Actions */}
      <div className="space-y-2 pt-2">
        <button
          type="button"
          onClick={() => router.push('/circle/create')}
          className="w-full flex items-center justify-center gap-2 border border-[#E8C99A] text-[#5A4A43] rounded-xl py-3 font-quicksand text-sm hover:bg-[#FDF6EE] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Créer un autre cercle
        </button>

        {!isPlanificatrice && (
          <button
            type="button"
            onClick={() => leaveCircle(circle.id)}
            className="w-full flex items-center justify-center gap-2 text-red-600 border border-red-200 rounded-xl py-3 font-quicksand text-sm hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Quitter le cercle
          </button>
        )}
      </div>
    </div>
  )
}
