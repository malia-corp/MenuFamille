import { create } from 'zustand'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id:      number
  variant: ToastVariant
  message: string
}

interface ToastState {
  toasts:  ToastItem[]
  show:    (variant: ToastVariant, message: string) => void
  dismiss: (id: number) => void
}

const MAX_VISIBLE = 3
let nextId = 1

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show: (variant, message) => {
    const id = nextId++
    set(s => ({ toasts: [...s.toasts, { id, variant, message }].slice(-MAX_VISIBLE) }))
    setTimeout(() => get().dismiss(id), variant === 'error' ? 5000 : 3000)
  },
  dismiss: id => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))

// Raccourcis utilisables hors composant React : toast.success('Lien copié !')
export const toast = {
  success: (message: string) => useToastStore.getState().show('success', message),
  error:   (message: string) => useToastStore.getState().show('error', message),
  warning: (message: string) => useToastStore.getState().show('warning', message),
  info:    (message: string) => useToastStore.getState().show('info', message),
}
