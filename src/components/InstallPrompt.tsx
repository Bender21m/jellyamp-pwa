import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

const DISMISSED_KEY = 'pwa-install-dismissed'
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // Check if user previously dismissed the prompt
    const dismissed = localStorage.getItem(DISMISSED_KEY)
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10)
      const now = Date.now()
      if (now - dismissedTime < DISMISS_DURATION) {
        return // Still within dismiss period
      } else {
        // Clear expired dismiss flag
        localStorage.removeItem(DISMISSED_KEY)
      }
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      const event = e as BeforeInstallPromptEvent
      // Prevent the mini-infobar from appearing on mobile
      event.preventDefault()
      // Save the event so it can be triggered later
      setDeferredPrompt(event)
      setShowPrompt(true)
    }

    // Listen for app installed event to hide prompt
    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setShowPrompt(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Check if app is already installed (running in standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isIOSStandalone = 'standalone' in window.navigator && (window.navigator as Record<string, unknown>).standalone
    
    // This is legitimate - setting initial state based on environment check
    if (isStandalone || isIOSStandalone) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowPrompt(false)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    // Show the install prompt
    deferredPrompt.prompt()

    // Wait for user response then clear prompt
    await deferredPrompt.userChoice

    // Clear the prompt
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    // Remember that user dismissed the prompt
    localStorage.setItem(DISMISSED_KEY, Date.now().toString())
    setShowPrompt(false)
  }

  if (!showPrompt || !deferredPrompt) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-sm mx-4"
      >
        <div className="bg-card border border-surface-hover rounded-xl p-4 shadow-xl backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <svg 
                className="w-5 h-5 text-deep-black" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-text-primary text-sm mb-1">
                Install JellyAmp
              </h3>
              <p className="text-text-secondary text-xs leading-relaxed">
                Add to your home screen for a native app experience with offline access.
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-text-muted hover:text-text-secondary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-neon-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              aria-label="Dismiss install prompt"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleInstallClick}
              aria-label="Install JellyAmp as an app"
              className="flex-1 bg-gradient-primary text-deep-black text-xs font-medium py-2 px-4 rounded-lg hover:opacity-90 transition-opacity min-h-[44px] focus-visible:ring-2 focus-visible:ring-neon-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              aria-label="Dismiss install prompt"
              className="px-4 py-2 text-text-secondary text-xs hover:text-text-primary transition-colors min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-neon-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              Not now
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}