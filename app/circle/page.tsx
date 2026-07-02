'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Copy, CheckCircle, Share2, Trash2, Plus, Key } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Member {
  id: string
  role: 'planificatrice' | 'membre'
  joined_at: string
  users: { id: string; display_name: string; email: string }
}

interface Circle {
  id: string
  name: string
  invite_code: string
  created_by: string
  my_role: 'planificatrice' | 'membre'
  family_circle_members: Member[]
}

export default function CirclePage() {
  const router = useRouter()
  const [circle, setCircle] = useState<Circle | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [myId, setMyId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [meRes, circlesRes] = await Promise.all([
        fetch('/api/users/me'),
        fetch('/api/circles'),
      ])
      const me = await meRes.json()
      const circles: Circle[] = await circlesRes.json()
      setMyId(me.id)
      setCircle(circles[0] ?? null)
      setLoading(false)
    }
    load()
  }, [])

  async function copyCode() {
    if (!circle) return
    await navigator.clipboard.writeText(circle.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function shareWhatsApp() {
    if (!circle) return
    const text = encodeURIComponent(
      `Rejoins mon cercle familial MenuFamille avec le code : ${circle.invite_code}`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  async function removeMember(userId: string) {
    if (!circle) return
    setRemoving(userId)
    const res = await fetch(`/api/circles/${circle.id}/members/${userId}`, { method: 'DELETE' })
    if (res.ok) {
      setCircle((prev) =>
        prev
          ? {
              ...prev,
              family_circle_members: prev.family_circle_members.filter(
                (m) => m.users.id !== userId
              ),
            }
          : prev
      )
    }
    setRemoving(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Chargement…</p>
      </div>
    )
  }

  if (!circle) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-sm mx-auto px-4 py-8 space-y-6">
          <h1 className="text-xl font-bold text-gray-900">Cercle familial</h1>
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center space-y-4">
            <Users className="h-10 w-10 text-gray-300 mx-auto" />
            <p className="text-sm text-gray-500">Tu n&apos;appartiens à aucun cercle pour l&apos;instant.</p>
            <div className="space-y-2">
              <Button
                className="w-full bg-terracotta hover:bg-terracotta/90 text-white"
                onClick={() => router.push('/circle/create')}
              >
                <Plus className="mr-2 h-4 w-4" />
                Créer un cercle
              </Button>
              <Button
                variant="outline"
                className="w-full border-terracotta text-terracotta hover:bg-terracotta/5"
                onClick={() => router.push('/circle/join')}
              >
                <Key className="mr-2 h-4 w-4" />
                Rejoindre un cercle
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isPlanificatrice = circle.my_role === 'planificatrice'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-sm mx-auto px-4 py-8 space-y-6">
        <h1 className="text-xl font-bold text-gray-900">{circle.name}</h1>

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Code d&apos;invitation</p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-bold text-terracotta tracking-widest">
              {circle.invite_code}
            </span>
            <div className="ml-auto flex gap-2">
              <button
                onClick={copyCode}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-terracotta transition-colors"
              >
                {copied ? (
                  <><CheckCircle className="h-4 w-4 text-market-green" /> Copié</>
                ) : (
                  <><Copy className="h-4 w-4" /> Copier</>
                )}
              </button>
              <button
                onClick={shareWhatsApp}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-market-green transition-colors"
              >
                <Share2 className="h-4 w-4" /> WhatsApp
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          <div className="px-5 py-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <p className="text-sm font-medium text-gray-700">
              {circle.family_circle_members.length} membre{circle.family_circle_members.length > 1 ? 's' : ''}
            </p>
          </div>
          {circle.family_circle_members.map((member) => (
            <div key={member.id} className="px-5 py-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-terracotta/10 flex items-center justify-center text-terracotta font-semibold text-sm">
                {member.users.display_name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{member.users.display_name}</p>
                <p className="text-xs text-gray-400 truncate">{member.users.email}</p>
              </div>
              <Badge
                variant={member.role === 'planificatrice' ? 'default' : 'secondary'}
                className={member.role === 'planificatrice' ? 'bg-terracotta text-white text-xs' : 'text-xs'}
              >
                {member.role === 'planificatrice' ? 'Planificatrice' : 'Membre'}
              </Badge>
              {isPlanificatrice && member.users.id !== myId && (
                <button
                  onClick={() => removeMember(member.users.id)}
                  disabled={removing === member.users.id}
                  className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
