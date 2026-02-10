import { create } from 'zustand'

interface Toast {
  id: string
  message: string
  type?: 'success' | 'info' | 'warning' | 'error'
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  addToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error', duration?: number) => void
  removeToast: (id: string) => void
  clearToasts: () => void
}

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  
  addToast: (message, type = 'info', duration = 2000) => {
    const id = Date.now().toString()
    const toast: Toast = { id, message, type, duration }
    
    set((state) => ({
      toasts: [...state.toasts, toast]
    }))
    
    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id)
      }, duration)
    }
  },
  
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  })),
  
  clearToasts: () => set({ toasts: [] })
}))