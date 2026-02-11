import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

interface FeatureHintProps {
  hintKey: string
  title: string
  description: string
  delay?: number
  className?: string
}

export default function FeatureHint({ 
  hintKey, 
  title, 
  description, 
  delay = 2000,
  className = ''
}: FeatureHintProps) {
  const [showHint, setShowHint] = useState(false)

  useEffect(() => {
    const hasSeenHint = localStorage.getItem(`jellyamp-hint-${hintKey}`)
    if (!hasSeenHint) {
      const timer = setTimeout(() => {
        setShowHint(true)
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [hintKey, delay])

  const dismissHint = () => {
    localStorage.setItem(`jellyamp-hint-${hintKey}`, 'true')
    setShowHint(false)
  }

  return (
    <AnimatePresence>
      {showHint && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className={`relative bg-gradient-to-r from-neon-cyan/10 to-neon-cyan/5 border border-neon-cyan/20 rounded-xl p-4 shadow-lg backdrop-blur-sm ${className}`}
        >
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-neon-cyan mt-2 shrink-0 animate-pulse" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-neon-cyan mb-1">{title}</h4>
              <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
            </div>
            <button
              onClick={dismissHint}
              className="text-text-muted hover:text-text-primary transition-colors p-1 -mt-1 -mr-1"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}