import { useRef, useCallback } from 'react'

interface SwipeState {
  startX: number
  startY: number
  currentX: number
  isTracking: boolean
  hasMoved: boolean
}

interface SwipeCallbacks {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeStart?: () => void
  onSwipeMove?: (deltaX: number, deltaY: number) => void
  onSwipeEnd?: () => void
}

const SWIPE_THRESHOLD = 80
const VERTICAL_THRESHOLD = 30 // degrees from horizontal to cancel

export function useSwipeAction(callbacks: SwipeCallbacks) {
  const swipeState = useRef<SwipeState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    isTracking: false,
    hasMoved: false
  })

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only activate on touch devices
    if (e.touches.length !== 1) return

    const touch = e.touches[0]
    swipeState.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      isTracking: true,
      hasMoved: false
    }

    callbacks.onSwipeStart?.()
  }, [callbacks])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeState.current.isTracking || e.touches.length !== 1) return

    const touch = e.touches[0]
    const deltaX = touch.clientX - swipeState.current.startX
    const deltaY = touch.clientY - swipeState.current.startY
    
    swipeState.current.currentX = touch.clientX
    swipeState.current.hasMoved = true

    // Check if movement is too vertical (cancel horizontal swipe)
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    if (distance > 10) { // Only check after some movement
      const angle = Math.abs(Math.atan2(deltaY, deltaX) * (180 / Math.PI))
      if (angle > VERTICAL_THRESHOLD && angle < (180 - VERTICAL_THRESHOLD)) {
        // Too vertical, cancel swipe
        swipeState.current.isTracking = false
        callbacks.onSwipeEnd?.()
        return
      }
    }

    // Prevent vertical scrolling when swiping horizontally
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault()
    }

    callbacks.onSwipeMove?.(deltaX, deltaY)
  }, [callbacks])

  const handleTouchEnd = useCallback((_e: React.TouchEvent) => {
    if (!swipeState.current.isTracking) return

    const deltaX = swipeState.current.currentX - swipeState.current.startX
    const absDeltaX = Math.abs(deltaX)

    // Check if swipe threshold was met
    if (absDeltaX >= SWIPE_THRESHOLD && swipeState.current.hasMoved) {
      if (deltaX > 0) {
        callbacks.onSwipeRight?.()
      } else {
        callbacks.onSwipeLeft?.()
      }
    }

    swipeState.current.isTracking = false
    callbacks.onSwipeEnd?.()
  }, [callbacks])

  const handleTouchCancel = useCallback(() => {
    swipeState.current.isTracking = false
    callbacks.onSwipeEnd?.()
  }, [callbacks])

  const getDeltaX = useCallback(() => {
    if (!swipeState.current.isTracking) return 0
    return swipeState.current.currentX - swipeState.current.startX
  }, [])

  const isTracking = useCallback(() => {
    return swipeState.current.isTracking
  }, [])

  return {
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel
    },
    getDeltaX,
    isTracking
  }
}