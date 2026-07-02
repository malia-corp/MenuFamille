'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// /plan redirige vers la configuration pour Sprint 1 — l'écran de planning hebdomadaire est Sprint 2
export default function PlanPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/plan/configure') }, [router])
  return null
}
