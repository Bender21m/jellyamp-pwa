import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

interface OnboardingProps {
  isVisible: boolean
  onDismiss: () => void
}

const features = [
  {
    icon: '🎸',
    title: 'Live Music Archive',
    description: 'Stream 250,000+ live recordings from archive.org'
  },
  {
    icon: '∞',
    title: 'Smart Radio',
    description: 'Start any track and let the mix keep going'
  },
  {
    icon: '📱',
    title: 'Install as App',
    description: 'Add to home screen for the full experience'
  },
  {
    icon: '🎛️',
    title: 'EQ & More',
    description: 'Equalizer, sleep timer, offline downloads'
  }
]

export default function Onboarding({ isVisible, onDismiss }: OnboardingProps) {
  const [showFeatures, setShowFeatures] = useState(false)

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setShowFeatures(true), 300)
      return () => clearTimeout(timer)
    }
  }, [isVisible])

  const handleDismiss = () => {
    localStorage.setItem('jellyamp-onboarding-v1', 'true')
    onDismiss()
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={handleDismiss}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="bg-card border border-white/10 rounded-2xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="text-center mb-8">
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-3xl md:text-4xl font-bold tracking-tight mb-3"
              >
                Welcome to JellyAmp 🎵
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-text-secondary text-lg"
              >
                Your music streaming experience just got better
              </motion.p>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={showFeatures ? { opacity: 1, y: 0, scale: 1 } : {}}
                  transition={{ 
                    delay: 0.3 + index * 0.1,
                    duration: 0.4,
                    ease: [0.25, 0.1, 0.25, 1]
                  }}
                  className="group"
                >
                  <div className="bg-surface hover:bg-surface-hover border border-white/5 hover:border-neon-cyan/20 rounded-xl p-5 transition-all duration-300 hover:shadow-[0_0_24px_rgba(0,255,221,0.1)]">
                    <div className="text-3xl mb-3 transform group-hover:scale-110 transition-transform duration-300">
                      {feature.icon}
                    </div>
                    <h3 className="text-lg font-semibold mb-2 group-hover:text-neon-cyan transition-colors duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-text-secondary text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Action Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="text-center"
            >
              <button
                onClick={handleDismiss}
                className="bg-gradient-to-r from-neon-cyan to-neon-cyan/80 hover:from-neon-cyan hover:to-neon-cyan text-deep-black font-semibold px-8 py-3 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-[0_0_32px_rgba(0,255,221,0.3)] active:scale-95"
              >
                Get Started
              </button>
            </motion.div>

            {/* Skip link */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center mt-4"
            >
              <button
                onClick={handleDismiss}
                className="text-text-muted hover:text-text-secondary text-sm transition-colors"
              >
                Skip for now
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Hook to manage onboarding state
export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('jellyamp-onboarding-v1')
    if (!hasCompletedOnboarding) {
      // Show onboarding after a short delay to ensure smooth initial load
      const timer = setTimeout(() => setShowOnboarding(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const dismissOnboarding = () => {
    setShowOnboarding(false)
  }

  return { showOnboarding, dismissOnboarding }
}