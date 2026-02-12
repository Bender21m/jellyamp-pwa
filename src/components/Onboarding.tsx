import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

interface OnboardingProps {
  isVisible: boolean
  onDismiss: () => void
}

export default function Onboarding({ isVisible, onDismiss }: OnboardingProps) {
  const handleDismiss = () => {
    localStorage.setItem('jellyamp-onboarding-v1', 'true')
    onDismiss()
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="fixed bottom-24 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50"
        >
          <div className="bg-card/95 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-sm font-semibold text-text-primary">Welcome to JellyAmp 🎵</h3>
              <button
                onClick={handleDismiss}
                aria-label="Close welcome message"
                className="text-text-muted hover:text-text-secondary transition-colors shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-neon-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed mb-3">
              Try the <span className="text-neon-cyan">Live Archive</span> for 200K+ free concert recordings, or check out the equalizer and sleep timer in settings.
            </p>
            <button
              onClick={handleDismiss}
              aria-label="Got it, dismiss welcome message"
              className="text-xs text-text-muted hover:text-neon-cyan transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-neon-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              Got it
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Hook to manage onboarding state - closely related to the component
// eslint-disable-next-line react-refresh/only-export-components
export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    const hasCompleted = localStorage.getItem('jellyamp-onboarding-v1')
    if (!hasCompleted) {
      const timer = setTimeout(() => setShowOnboarding(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const dismissOnboarding = () => setShowOnboarding(false)

  return { showOnboarding, dismissOnboarding }
}
