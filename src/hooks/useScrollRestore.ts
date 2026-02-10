import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Global scroll position store - persists across component unmounts
const scrollPositions = new Map<string, number>()
const MAX_ENTRIES = 50 // Prevent memory leaks

export function useScrollRestore(containerRef: React.RefObject<HTMLElement | null>) {
  const location = useLocation()

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Restore scroll position for current route
    const savedPosition = scrollPositions.get(location.pathname ?? '/')
    if (savedPosition !== undefined) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = savedPosition
        }
      })
    }

    // Save current scroll position when leaving this route
    const saveScrollPosition = () => {
      if (containerRef.current) {
        scrollPositions.set(location.pathname ?? '/', containerRef.current.scrollTop)
        
        // Clean up old entries to prevent memory leak
        if (scrollPositions.size > MAX_ENTRIES) {
          const firstKey = scrollPositions.keys().next().value
          if (firstKey) scrollPositions.delete(firstKey)
        }
      }
    }

    // Return cleanup function to save scroll position when location changes
    return saveScrollPosition
  }, [location.pathname ?? '/', containerRef])
}