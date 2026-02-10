import { motion, AnimatePresence } from 'framer-motion'
import { useToastStore } from '../stores/toast'

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`px-4 py-2.5 rounded-lg backdrop-blur-sm border shadow-lg pointer-events-auto ${
              toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400/30 text-white' :
              toast.type === 'error' ? 'bg-red-500/90 border-red-400/30 text-white' :
              toast.type === 'warning' ? 'bg-yellow-500/90 border-yellow-400/30 text-yellow-900' :
              'bg-deep-black/90 border-neon-cyan/20 text-neon-cyan'
            }`}
            style={{ 
              boxShadow: toast.type === 'success' ? '0 0 20px rgba(16, 185, 129, 0.3)' :
                         toast.type === 'error' ? '0 0 20px rgba(239, 68, 68, 0.3)' :
                         toast.type === 'warning' ? '0 0 20px rgba(245, 158, 11, 0.3)' :
                         '0 0 20px rgba(0, 255, 221, 0.2)'
            }}
            onClick={() => removeToast(toast.id)}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              {toast.type === 'success' && (
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M9 16.17L5.83 13l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              )}
              {toast.type === 'error' && (
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              )}
              {toast.type === 'warning' && (
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                </svg>
              )}
              {toast.type === 'info' && (
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M13 7h-2V5h2v2zm0 2h-2v8h2V9zm-1-7C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                </svg>
              )}
              {toast.message}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}