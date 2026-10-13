import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastState {
  toasts: Toast[]
  push: (type: ToastType, message: string, durationMs?: number) => void
  dismiss: (id: number) => void
}

let nextId = 1
const MAX_TOASTS = 4

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (type, message, durationMs = 4500) => {
    const id = nextId++
    set(s => ({ toasts: [...s.toasts, { id, type, message }].slice(-MAX_TOASTS) }))
    setTimeout(() => get().dismiss(id), durationMs)
  },
  dismiss: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))
