import { useEffect } from 'react'
import { useToastStore } from '../stores/toast'

export default function UpdateNotification() {
  const { addToast } = useToastStore()

  useEffect(() => {
    // Listen for service worker updates
    const handleSWUpdate = () => {
      addToast(
        'App update available! Refresh to get the latest version.',
        'info',
        0 // Don't auto-dismiss
      )
    }

    // Register the update handler
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // This fires when the new service worker has taken control
        window.location.reload()
      })

      // Listen for waiting service worker
      const checkForWaitingSW = () => {
        navigator.serviceWorker.getRegistration().then(registration => {
          if (registration?.waiting) {
            handleSWUpdate()
          }
        })
      }

      // Check immediately
      checkForWaitingSW()

      // Also check when the page becomes visible (user switched back to tab)
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          checkForWaitingSW()
        }
      })
    }

    // Vite PWA plugin specific event handling
    window.addEventListener('sw:update', handleSWUpdate)

    return () => {
      window.removeEventListener('sw:update', handleSWUpdate)
    }
  }, [addToast])

  // This component doesn't render anything - it just handles the update logic
  return null
}