'use client'

import { useEffect } from 'react'
import { registerServiceWorker } from '@/lib/utils/service-worker'

export function ServiceWorkerRegister() {
  useEffect(() => {
    registerServiceWorker()?.catch(() => {})
  }, [])
  return null
}
